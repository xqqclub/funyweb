import { FirebaseApp, FirebaseOptions, getApp, getApps, initializeApp } from "firebase/app";
import { Auth, getAuth } from "firebase/auth";
import { Firestore, getFirestore } from "firebase/firestore";

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

function getFirebaseConfig(): FirebaseOptions | null {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
  const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  if (!apiKey || !authDomain || !projectId || !appId || !messagingSenderId) {
    return null;
  }

  return {
    apiKey,
    authDomain,
    projectId,
    appId,
    messagingSenderId,
    storageBucket
  };
}

export function getFirebaseClientApp(): FirebaseApp | null {
  const config = getFirebaseConfig();

  if (!config) {
    return null;
  }

  if (app) {
    return app;
  }

  app = getApps().length > 0 ? getApp() : initializeApp(config);
  return app;
}

export function getFirebaseClientDb(): Firestore | null {
  const firebaseApp = getFirebaseClientApp();

  if (!firebaseApp) {
    return null;
  }

  if (db) {
    return db;
  }

  db = getFirestore(firebaseApp);
  return db;
}

export function getFirebaseClientAuth(): Auth | null {
  const firebaseApp = getFirebaseClientApp();

  if (!firebaseApp) {
    return null;
  }

  if (auth) {
    return auth;
  }

  auth = getAuth(firebaseApp);
  return auth;
}
