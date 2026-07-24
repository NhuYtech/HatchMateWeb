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
      detectedCount: 0,
      confidence: 0.98,
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
    let rawImageUrl = "http://localhost:3000/fallback_raw.jpg";
    let aiImageUrl = "http://localhost:3000/fallback_ai.jpg";

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

      // 5. Read previous egg count from RTDB to determine changes for notifications
      let previousEggCount = 24; // default fallback
      try {
        const eggCountRef = adminRtdb.ref(`incubators/${deviceId}/telemetry/eggCount`);
        const eggCountSnapshot = await eggCountRef.once("value");
        if (eggCountSnapshot.exists()) {
          previousEggCount = Number(eggCountSnapshot.val());
        }
      } catch (rtdbErr: any) {
        console.warn("Firebase RTDB fetch failed:", rtdbErr.message || rtdbErr);
      }

      const currentEggCount = aiResult.detectedCount;
      const countChanged = currentEggCount !== previousEggCount;

      // 6. Update Firestore camera collection (matching current Flutter App structure)
      try {
        await adminDb.collection("camera").doc("current").set({
          latestImageUrl: rawImageUrl,
          aiImageUrl: aiImageUrl,
          detectedLabel: `${currentEggCount}`,
          confidence: aiResult.confidence,
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });

        // Also update device specific record in Firestore
        await adminDb.collection("incubators").doc(deviceId).collection("camera_frames").add({
          latestImageUrl: rawImageUrl,
          aiImageUrl: aiImageUrl,
          detectedLabel: `${currentEggCount}`,
          confidence: aiResult.confidence,
          updatedAt: FieldValue.serverTimestamp()
        });
      } catch (firestoreErr: any) {
        console.warn("Firestore update failed:", firestoreErr.message || firestoreErr);
      }

      // 7. Update Realtime Database incubator telemetry & status
      try {
        await adminRtdb.ref(`incubators/${deviceId}/telemetry`).update({
          eggCount: currentEggCount,
          lastSeen: new Date().toLocaleTimeString("vi-VN")
        });

        // Mark camera as online and save previewImage + confidence
        await adminRtdb.ref(`incubators/${deviceId}/camera`).update({
          status: "online",
          lastCaptureAt: new Date().toLocaleTimeString("vi-VN"),
          previewImage: aiImageUrl,
          confidence: aiResult.confidence
        });
      } catch (rtdbErr: any) {
        console.warn("Firebase RTDB update failed:", rtdbErr.message || rtdbErr);
      }

      // 8. Send Push Notification FCM if egg count changed
      if (countChanged) {
        console.log(`Egg count changed from ${previousEggCount} to ${currentEggCount}. Sending FCM Notification.`);
        try {
          const message = {
            topic: `incubator_${deviceId}`,
            notification: {
              title: "Cảnh báo HatchMate AI",
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
      aiImageUrl
    });

  } catch (error) {
    console.error("Error processing camera detection request:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
