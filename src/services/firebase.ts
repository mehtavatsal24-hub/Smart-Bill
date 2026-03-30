import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";

// Import the Firebase configuration
import firebaseConfig from "../../firebase-applet-config.json";

// Check if we have the minimum required config
const isConfigValid = !!(firebaseConfig.apiKey && firebaseConfig.projectId);

let app;
let db: Firestore | null = null;
let auth: Auth | null = null;

if (isConfigValid) {
  try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    auth = getAuth(app);
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
} else {
  const missing = [];
  if (!firebaseConfig.apiKey) missing.push("API Key");
  if (!firebaseConfig.projectId) missing.push("Project ID");
  console.warn(`Firebase configuration is incomplete. Missing: ${missing.join(", ")}. Cloud Sync will be disabled.`);
}

export { db, auth, isConfigValid };
