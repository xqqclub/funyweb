import { getFirebaseAdminDb } from "@/lib/firebase/admin";
import type { GameEvent, GameMatch } from "@/types/game";

const MATCHES_COLLECTION = "game_matches";
const EVENTS_COLLECTION = "game_events";

function normalizeGameEvent(id: string, raw: Partial<GameEvent> | undefined): GameEvent {
  return {
    id,
    type: raw?.type ?? "rps_result",
    title: raw?.title ?? "猜拳結果",
    message: raw?.message ?? "",
    playerIds: raw?.playerIds ?? [],
    players: raw?.players ?? [],
    result: raw?.result === "draw" ? "draw" : "win",
    winnerId: raw?.winnerId ?? null,
    moves: raw?.moves ?? {},
    createdAt: raw?.createdAt ?? new Date(0).toISOString()
  };
}

export async function createGameMatch(match: GameMatch) {
  const db = getFirebaseAdminDb();
  if (!db) {
    return { ok: false as const, reason: "Firebase unavailable" };
  }

  await db.collection(MATCHES_COLLECTION).doc(match.id).set(match);
  return { ok: true as const, match };
}

export async function getGameMatch(matchId: string): Promise<GameMatch | null> {
  const db = getFirebaseAdminDb();
  if (!db) {
    return null;
  }

  const snapshot = await db.collection(MATCHES_COLLECTION).doc(matchId).get();
  return snapshot.exists ? ({ id: snapshot.id, ...snapshot.data() } as GameMatch) : null;
}

export async function listOpenRpsMatches(): Promise<GameMatch[]> {
  const db = getFirebaseAdminDb();
  if (!db) {
    return [];
  }

  const snapshot = await db.collection(MATCHES_COLLECTION).where("type", "==", "rock_paper_scissors").where("status", "in", ["waiting", "active"]).get();
  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }) as GameMatch)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export async function saveGameMatch(match: GameMatch) {
  const db = getFirebaseAdminDb();
  if (!db) {
    return { ok: false as const, reason: "Firebase unavailable" };
  }

  await db.collection(MATCHES_COLLECTION).doc(match.id).set(match, { merge: true });
  return { ok: true as const, match };
}

export async function createGameEvent(event: Omit<GameEvent, "id">) {
  const db = getFirebaseAdminDb();
  if (!db) {
    return { ok: false as const, reason: "Firebase unavailable" };
  }

  const ref = await db.collection(EVENTS_COLLECTION).add(event);
  return { ok: true as const, event: { id: ref.id, ...event } };
}

export async function listGameEvents(limit = 5): Promise<GameEvent[]> {
  const db = getFirebaseAdminDb();
  if (!db) {
    return [];
  }

  try {
    const snapshot = await db.collection(EVENTS_COLLECTION).orderBy("createdAt", "desc").limit(limit).get();
    return snapshot.docs.map((doc) => normalizeGameEvent(doc.id, doc.data() as Partial<GameEvent> | undefined));
  } catch {
    const snapshot = await db.collection(EVENTS_COLLECTION).get();
    return snapshot.docs
      .map((doc) => normalizeGameEvent(doc.id, doc.data() as Partial<GameEvent> | undefined))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, limit);
  }
}
