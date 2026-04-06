import { GoogleAuthProvider, User, onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";

import { getFirebaseClientAuth } from "@/lib/firebase/client";

const provider = new GoogleAuthProvider();

export function subscribeToAuthState(onChange: (user: User | null) => void) {
  const auth = getFirebaseClientAuth();

  if (!auth) {
    onChange(null);
    return () => undefined;
  }

  return onAuthStateChanged(auth, onChange);
}

export async function signInAsAdmin() {
  const auth = getFirebaseClientAuth();

  if (!auth) {
    throw new Error("Firebase Auth is not configured.");
  }

  return signInWithPopup(auth, provider);
}

export async function signOutAdmin() {
  const auth = getFirebaseClientAuth();

  if (!auth) {
    return;
  }

  await signOut(auth);
}
