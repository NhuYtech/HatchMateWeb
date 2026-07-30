import { NextResponse } from "next/server";
import { admin, adminDb, adminRtdb, adminStorage, adminMessaging, isFirebaseAdminConfigured } from "@/src/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const deviceId = formData.get("deviceId") as string || "default_device";

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
    const aiSuccess = Boolean(
      aiResult.success &&
      aiResult.processedImageBase64 &&
      typeof aiResult.detectedCount === "number" &&
      aiResult.detectedCount >= 0
    );

    if (isFirebaseAdminConfigured) {
      // 3. Upload Raw Image to Firebase Storage
      try {
        const bucket = adminStorage.bucket();
        const rawFileName = `incubators/${deviceId}/camera_frames/raw_${timestamp}.jpg`;
        const rawFile = bucket.file(rawFileName);
        await rawFile.save(imageBuffer, {
          metadata: { contentType: "image/jpeg" }
        });
        rawImageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(rawFileName)}?alt=media`;
      } catch (storageErr: any) {
        console.warn("Firebase Storage raw image upload failed:", storageErr.message || storageErr);
      }

      // 4. Upload Processed AI Image to Firebase Storage
      aiImageUrl = rawImageUrl; // Fallback to raw image if AI failed or upload fails
      if (aiResult.processedImageBase64) {
        try {
          const bucket = adminStorage.bucket();
          const aiImageBuffer = Buffer.from(aiResult.processedImageBase64, "base64");
          const aiFileName = `incubators/${deviceId}/camera_frames/ai_${timestamp}.jpg`;
          const aiFile = bucket.file(aiFileName);
          await aiFile.save(aiImageBuffer, {
            metadata: { contentType: "image/jpeg" }
          });
          aiImageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(aiFileName)}?alt=media`;
        } catch (storageErr: any) {
          console.warn("Firebase Storage AI image upload failed:", storageErr.message || storageErr);
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

      // 6. Update Firestore camera collection (matching current Flutter App structure)
      try {
        await adminDb.collection("camera").doc("current").set({
          latestImageUrl: rawImageUrl,
          aiImageUrl: aiImageUrl,
          detectedLabel: labelText,
          confidence: aiSuccess ? aiResult.confidence : 0,
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });

        // Also update device specific record in Firestore
        await adminDb.collection("incubators").doc(deviceId).collection("camera_frames").add({
          latestImageUrl: rawImageUrl,
          aiImageUrl: aiImageUrl,
          detectedLabel: labelText,
          confidence: aiSuccess ? aiResult.confidence : 0,
          updatedAt: FieldValue.serverTimestamp()
        });
      } catch (firestoreErr: any) {
        console.warn("Firestore update failed:", firestoreErr.message || firestoreErr);
      }

      // 7. Update Realtime Database incubator telemetry & status
      try {
        // Only update eggCount in telemetry if AI detection succeeded
        const telemetryUpdate: Record<string, any> = {
          lastSeen: new Date().toLocaleTimeString("vi-VN"),
          isEggLost: isEggLost,
          lostEggCount: isEggLost ? (initialEggCount - currentEggCount) : 0
        };
        if (aiSuccess) {
          telemetryUpdate.eggCount = currentEggCount;
        }

        await adminRtdb.ref(`incubators/${deviceId}/telemetry`).update(telemetryUpdate);

        // Mark camera as online and save previewImage + confidence
        await adminRtdb.ref(`incubators/${deviceId}/camera`).update({
          status: "online",
          lastCaptureAt: new Date().toLocaleTimeString("vi-VN"),
          previewImage: aiImageUrl,
          confidence: aiSuccess ? aiResult.confidence : 0
        });
      } catch (rtdbErr: any) {
        console.warn("Firebase RTDB update failed:", rtdbErr.message || rtdbErr);
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
      aiAnalysisFailed: !aiSuccess
    });

  } catch (error) {
    console.error("Error processing camera detection request:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
