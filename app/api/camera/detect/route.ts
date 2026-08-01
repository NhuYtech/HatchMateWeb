import { NextResponse } from "next/server";
import { admin, adminDb, adminRtdb, adminStorage, adminMessaging, isFirebaseAdminConfigured } from "@/src/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const deviceId = (formData.get("deviceId") as string) || "default_device";

    if (!file) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 });
    }

    console.log(`Received image from device: ${deviceId}, file size: ${file.size} bytes`);

    // 1. Convert file to buffer to forward to FastAPI AI Server
    const arrayBuffer = await file.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    // 2. Forward image to FastAPI AI Server running YOLOv8l
    const aiServerUrl = process.env.AI_SERVER_URL || "http://127.0.0.1:8000/predict";
    let aiResult = {
      success: false,
      detectedCount: 0,
      confidence: 0.0,
      processedImageBase64: ""
    };

    try {
      const apiFormData = new FormData();
      apiFormData.append("file", new Blob([imageBuffer]), file.name);

      const aiResponse = await fetch(aiServerUrl, {
        method: "POST",
        body: apiFormData
      });

      if (aiResponse.ok) {
        aiResult = await aiResponse.json();
        console.log(`AI Server Response: Count=${aiResult.detectedCount}, Conf=${aiResult.confidence}`);
      } else {
        console.error(`AI Server returned error status: ${aiResponse.status}`);
      }
    } catch (err) {
      console.error("Failed to connect or process image with FastAPI AI Server:", err);
    }

    const timestamp = Date.now();
    const appBaseUrl = process.env.APP_URL || "";
    let rawImageUrl = appBaseUrl ? `${appBaseUrl}/incubator_eggs.png` : "/incubator_eggs.png";
    let aiImageUrl = appBaseUrl ? `${appBaseUrl}/incubator_eggs.png` : "/incubator_eggs.png";
    let storageUploadStatus: "success" | "bypassed_missing_credentials" | "failed" = "bypassed_missing_credentials";

    const aiSuccess = Boolean(
      aiResult.success &&
      aiResult.processedImageBase64 &&
      typeof aiResult.detectedCount === "number" &&
      aiResult.detectedCount >= 0
    );

    if (isFirebaseAdminConfigured) {
      const bucket = adminStorage.bucket();

      // Helper to upload buffer and return Firebase Storage media download URL with token
      const uploadToStorage = async (filePath: string, buffer: Buffer): Promise<string> => {
        const fileRef = bucket.file(filePath);
        const downloadToken = crypto.randomUUID();
        await fileRef.save(buffer, {
          metadata: {
            contentType: "image/jpeg",
            metadata: {
              firebaseStorageDownloadTokens: downloadToken
            }
          }
        });
        return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filePath)}?alt=media&token=${downloadToken}`;
      };

      // 3. Upload Raw Image to Firebase Storage
      try {
        const rawFileName = `incubators/${deviceId}/camera_frames/raw_${timestamp}.jpg`;
        rawImageUrl = await uploadToStorage(rawFileName, imageBuffer);
        storageUploadStatus = "success";
        console.log(`Raw image uploaded successfully to Firebase Storage: ${rawFileName}`);
      } catch (storageErr: any) {
        storageUploadStatus = "failed";
        console.error("Firebase Storage raw image upload failed:", storageErr.message || storageErr);
      }

      // 4. Upload Processed AI Image to Firebase Storage
      aiImageUrl = rawImageUrl; // Fallback to raw image if AI failed or upload fails
      if (aiResult.processedImageBase64) {
        try {
          const aiImageBuffer = Buffer.from(aiResult.processedImageBase64, "base64");
          const aiFileName = `incubators/${deviceId}/camera_frames/ai_${timestamp}.jpg`;
          aiImageUrl = await uploadToStorage(aiFileName, aiImageBuffer);
          console.log(`AI image uploaded successfully to Firebase Storage: ${aiFileName}`);
        } catch (storageErr: any) {
          console.error("Firebase Storage AI image upload failed:", storageErr.message || storageErr);
        }
      }

      // 5. Read initial & previous egg count from RTDB to determine egg loss & FCM alerts
      let previousEggCount = 24;
      let initialEggCount = 24;
      try {
        const eggCountRef = adminRtdb.ref(`incubators/${deviceId}/telemetry/eggCount`);
        const eggCountSnapshot = await eggCountRef.once("value");
        if (eggCountSnapshot.exists()) {
          previousEggCount = Number(eggCountSnapshot.val());
        }

        const initialEggCountRef = adminRtdb.ref(`incubators/${deviceId}/cycle/initialEggCount`);
        const initialSnapshot = await initialEggCountRef.once("value");
        if (initialSnapshot.exists()) {
          initialEggCount = Number(initialSnapshot.val());
        } else {
          initialEggCount = previousEggCount;
        }
      } catch (rtdbErr: any) {
        console.warn("Firebase RTDB fetch failed:", rtdbErr.message || rtdbErr);
      }

      // Preserve previous egg count if AI failed, avoiding false zero-count telemetry & FCM alerts
      const currentEggCount = aiSuccess ? aiResult.detectedCount : previousEggCount;
      const countChanged = aiSuccess && (currentEggCount !== previousEggCount);
      const isEggLost = aiSuccess && (currentEggCount < initialEggCount);
      const labelText = aiSuccess ? `${currentEggCount}` : "Chờ AI phân tích";

      // 6. Update Firestore camera collection & device specific frames
      try {
        await adminDb.collection("camera").doc("current").set({
          latestImageUrl: rawImageUrl,
          aiImageUrl: aiImageUrl,
          detectedLabel: labelText,
          confidence: aiSuccess ? aiResult.confidence : 0,
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });

        await adminDb.collection("incubators").doc(deviceId).collection("camera_frames").add({
          latestImageUrl: rawImageUrl,
          aiImageUrl: aiImageUrl,
          detectedLabel: labelText,
          confidence: aiSuccess ? aiResult.confidence : 0,
          updatedAt: FieldValue.serverTimestamp()
        });

        // Retention Cleanup for Firestore: keep last 50 frames (trigger cleanup if > 55)
        const framesSnap = await adminDb.collection("incubators").doc(deviceId).collection("camera_frames")
          .orderBy("updatedAt", "asc")
          .get();

        if (framesSnap.size > 55) {
          const docsToDelete = framesSnap.docs.slice(0, framesSnap.size - 50);
          for (const doc of docsToDelete) {
            await doc.ref.delete();
          }
          console.log(`Cleaned up ${docsToDelete.length} oldest Firestore camera frame records for ${deviceId}`);
        }
      } catch (firestoreErr: any) {
        console.warn("Firestore update/cleanup failed:", firestoreErr.message || firestoreErr);
      }

      // 7. Update Realtime Database incubator telemetry, status, and ai_events history
      try {
        const telemetryUpdate: Record<string, any> = {
          lastSeen: new Date().toLocaleTimeString("vi-VN"),
          isEggLost: isEggLost,
          lostEggCount: isEggLost ? (initialEggCount - currentEggCount) : 0
        };
        if (aiSuccess) {
          telemetryUpdate.eggCount = currentEggCount;
        }

        await adminRtdb.ref(`incubators/${deviceId}/telemetry`).update(telemetryUpdate);

        await adminRtdb.ref(`incubators/${deviceId}/camera`).update({
          status: "online",
          lastCaptureAt: new Date().toLocaleTimeString("vi-VN"),
          previewImage: aiImageUrl,
          confidence: aiSuccess ? aiResult.confidence : 0
        });

        // Save AI event into RTDB ai_events
        const nowIso = new Date().toISOString();
        await adminRtdb.ref(`incubators/${deviceId}/ai_events`).push({
          title: aiSuccess ? `Ảnh AI phát hiện ${aiResult.detectedCount} quả` : "Ảnh tự động (Định kỳ)",
          imageUrl: aiImageUrl,
          eggCount: currentEggCount,
          confidence: aiSuccess ? aiResult.confidence : 0,
          type: "auto",
          time: nowIso,
          timestamp: nowIso
        });

        // Retention Cleanup for RTDB ai_events: keep last 50 items (trigger cleanup if > 55 buffer)
        const eventsSnap = await adminRtdb.ref(`incubators/${deviceId}/ai_events`).once("value");
        if (eventsSnap.exists()) {
          const eventsObj = eventsSnap.val();
          const keys = Object.keys(eventsObj);

          if (keys.length > 55) {
            // Sort keys by time ascending
            keys.sort((a, b) => {
              const tA = eventsObj[a].time || eventsObj[a].timestamp || "";
              const tB = eventsObj[b].time || eventsObj[b].timestamp || "";
              return tA.localeCompare(tB);
            });

            const keysToRemove = keys.slice(0, keys.length - 50);
            for (const key of keysToRemove) {
              const item = eventsObj[key];
              const itemImageUrl = item?.imageUrl || item?.image || "";

              // Atomic Step 1: Delete RTDB record first
              await adminRtdb.ref(`incubators/${deviceId}/ai_events/${key}`).remove();

              // Atomic Step 2: Delete associated Storage blob if it is a Firebase Storage URL
              if (itemImageUrl.includes("firebasestorage.googleapis.com")) {
                try {
                  const urlObj = new URL(itemImageUrl);
                  const pathParts = urlObj.pathname.split("/o/");
                  if (pathParts.length > 1) {
                    const encodedPath = pathParts[1];
                    const decodedPath = decodeURIComponent(encodedPath);
                    await bucket.file(decodedPath).delete();
                    console.log(`Cleaned up Firebase Storage blob: ${decodedPath}`);
                  }
                } catch (blobErr: any) {
                  console.warn("Storage blob cleanup warning:", blobErr.message || blobErr);
                }
              }
            }
            console.log(`Cleaned up ${keysToRemove.length} oldest RTDB ai_events for ${deviceId}`);
          }
        }
      } catch (rtdbErr: any) {
        console.warn("Firebase RTDB update/cleanup failed:", rtdbErr.message || rtdbErr);
      }

      // 8. Send Push Notification FCM if egg count changed or egg is lost
      if (isEggLost) {
        const lostCount = initialEggCount - currentEggCount;
        console.log(`CẢNH BÁO MẤT TRỨNG! Ban đầu: ${initialEggCount}, Hiện tại: ${currentEggCount} (Mất ${lostCount} quả).`);
        try {
          const message = {
            topic: `incubator_${deviceId}`,
            notification: {
              title: "CẢNH BÁO MẤT TRỨNG!",
              body: `Phát hiện mất trứng trong buồng ấp! Ban đầu: ${initialEggCount} quả, Hiện tại: ${currentEggCount} quả (Mất ${lostCount} quả trứng). Vui lòng kiểm tra khay ấp ngay!`
            },
            data: {
              deviceId: deviceId,
              initialEggCount: `${initialEggCount}`,
              currentEggCount: `${currentEggCount}`,
              lostCount: `${lostCount}`
            }
          };
          await adminMessaging.send(message);
          console.log("FCM CẢNH BÁO MẤT TRỨNG notification sent successfully.");
        } catch (fcmErr: any) {
          console.error("Failed to send FCM notification:", fcmErr.message || fcmErr);
        }
      } else if (countChanged) {
        console.log(`Egg count changed from ${previousEggCount} to ${currentEggCount}. Sending FCM Notification.`);
        try {
          const message = {
            topic: `incubator_${deviceId}`,
            notification: {
              title: "Cập nhật số lượng trứng",
              body: `Số lượng trứng thay đổi! Hiện tại: ${currentEggCount} quả (Trước đó: ${previousEggCount} quả).`
            },
            data: {
              deviceId: deviceId,
              eggCount: `${currentEggCount}`,
              previousEggCount: `${previousEggCount}`
            }
          };
          await adminMessaging.send(message);
          console.log("FCM Notification sent successfully to topic.");
        } catch (fcmErr: any) {
          console.error("Failed to send FCM notification:", fcmErr.message || fcmErr);
        }
      }
    } else {
      console.warn("[Firebase Admin] service-account.json is missing. Bypassing Firebase writes.");
    }

    return NextResponse.json({
      success: true,
      deviceId,
      eggCount: aiResult.detectedCount,
      confidence: aiResult.confidence,
      rawImageUrl,
      aiImageUrl: aiImageUrl || rawImageUrl,
      aiAnalysisFailed: !aiSuccess,
      storageUploadStatus
    });

  } catch (error) {
    console.error("Error processing camera detection request:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

