import { getFirebaseAdminDb } from "@/lib/firebase/admin";

const COLLECTION_NAME = "telegram_sessions";

export type PendingTelegramAction = "speech_custom";

export type TelegramSession = {
  telegramUserId: string;
  pendingAction?: PendingTelegramAction | "";
  updatedAt: string;
};

export async function getTelegramSession(telegramUserId: string): Promise<TelegramSession | null> {
  const db = getFirebaseAdminDb();
  if (!db) {
    return null;
  }

  try {
    const snapshot = await db.collection(COLLECTION_NAME).doc(telegramUserId).get();
    return snapshot.exists ? (snapshot.data() as TelegramSession) : null;
  } catch {
    return null;
  }
}

export async function setTelegramPendingAction(telegramUserId: string, pendingAction: PendingTelegramAction) {
  const db = getFirebaseAdminDb();
  if (!db) {
    return { ok: false as const, reason: "Firebase unavailable" };
  }

  const session: TelegramSession = {
    telegramUserId,
    pendingAction,
    updatedAt: new Date().toISOString()
  };

  await db.collection(COLLECTION_NAME).doc(telegramUserId).set(session, { merge: true });
  return { ok: true as const, session };
}

export async function clearTelegramPendingAction(telegramUserId: string) {
  const db = getFirebaseAdminDb();
  if (!db) {
    return { ok: false as const, reason: "Firebase unavailable" };
  }

  await db.collection(COLLECTION_NAME).doc(telegramUserId).set(
    {
      telegramUserId,
      pendingAction: "",
      updatedAt: new Date().toISOString()
    },
    { merge: true }
  );

  return { ok: true as const };
}
