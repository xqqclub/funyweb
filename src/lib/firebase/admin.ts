import { App, cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { Auth, getAuth } from "firebase-admin/auth";
import { Firestore, getFirestore } from "firebase-admin/firestore";

let adminApp: App | null = null;
let adminDb: Firestore | null = null;
let adminAuth: Auth | null = null;

function readPrivateKey() {
  const raw = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  return raw ? raw.replace(/\\n/g, "\n") : undefined;
}

export function getFirebaseAdminApp(): App | null {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = readPrivateKey();

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  if (adminApp) {
    return adminApp;
  }

  adminApp =
    getApps().length > 0
      ? getApp()
      : initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey
          })
        });

  return adminApp;
}

export function getFirebaseAdminDb(): Firestore | null {
  const app = getFirebaseAdminApp();

  if (!app) {
    return null;
  }

  if (adminDb) {
    return adminDb;
  }

  adminDb = getFirestore(app);
  return adminDb;
}

export function getFirebaseAdminAuth(): Auth | null {
  const app = getFirebaseAdminApp();

  if (!app) {
    return null;
  }

  if (adminAuth) {
    return adminAuth;
  }

  adminAuth = getAuth(app);
  return adminAuth;
}
