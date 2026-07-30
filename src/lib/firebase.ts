import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore, setLogLevel } from "firebase/firestore";
import { getDatabase } from "firebase/database";

// Suppress internal Firebase WebChannel transport stream retry logs in development console
setLogLevel("error");

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCmPM_aGO80FW3mtVhL5Bj0LQmtXWnLDWM",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "hatchmate-iot.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "hatchmate-iot",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "hatchmate-iot.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "789738738835",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:789738738835:web:1feb193d92a02213c1a966",
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://hatchmate-iot-default-rtdb.asia-southeast1.firebasedatabase.app",
};

const isFirebaseConfigured =
  !!firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== "your_firebase_api_key_here" &&
  !firebaseConfig.apiKey.includes("placeholder");

// Initialize Firebase (checking if already initialized for SSR safety)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

// Use initializeFirestore with experimentalAutoDetectLongPolling to fix WebChannel RPC transport stream error
const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
});

const rtdb = getDatabase(app);
const googleProvider = new GoogleAuthProvider();

// Force select_account prompt on Google sign in to allow account switching
googleProvider.setCustomParameters({
  prompt: "select_account",
});

export { auth, db, rtdb, googleProvider, isFirebaseConfigured };
