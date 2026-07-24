import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getDatabase } from "firebase-admin/database";
import { getStorage } from "firebase-admin/storage";
import { getMessaging } from "firebase-admin/messaging";
import path from "path";
import fs from "fs";

let app: any;
let isFirebaseAdminConfigured = false;

if (!getApps().length) {
  const serviceAccountPath = path.join(process.cwd(), "service-account.json");
  
  if (fs.existsSync(serviceAccountPath)) {
    try {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
      app = initializeApp({
        credential: cert(serviceAccount),
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://hatchmate-iot-default-rtdb.asia-southeast1.firebasedatabase.app",
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "hatchmate-iot.firebasestorage.app"
      });
      isFirebaseAdminConfigured = true;
      console.log("Firebase Admin SDK initialized using service-account.json");
    } catch (err) {
      console.error("Failed to parse or initialize Firebase Admin with service-account.json:", err);
      app = initializeFallback();
    }
  } else {
    app = initializeFallback();
  }
} else {
  app = getApps()[0];
  // If it was already initialized, we assume configured if the file exists
  isFirebaseAdminConfigured = fs.existsSync(path.join(process.cwd(), "service-account.json"));
}

function initializeFallback() {
  try {
    const fallbackApp = initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "hatchmate-iot",
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://hatchmate-iot-default-rtdb.asia-southeast1.firebasedatabase.app",
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "hatchmate-iot.firebasestorage.app"
    });
    console.log("Firebase Admin SDK initialized using environment variables fallback.");
    return fallbackApp;
  } catch (err) {
    console.error("Failed to initialize fallback Firebase Admin SDK:", err);
    throw err;
  }
}

const adminDb = getFirestore(app);
const adminRtdb = getDatabase(app);
const adminStorage = getStorage(app);
const adminMessaging = getMessaging(app);

// Export a mock admin namespace object for backward compatibility if needed, 
// along with the specific modular databases.
const admin = {
  firestore: {
    FieldValue: {
      serverTimestamp: () => {
        throw new Error("Use FieldValue from firebase-admin/firestore instead.");
      }
    }
  }
};

export { admin, app as adminApp, adminDb, adminRtdb, adminStorage, adminMessaging, isFirebaseAdminConfigured };
