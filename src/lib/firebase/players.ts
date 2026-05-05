import { getFirebaseAdminDb } from "@/lib/firebase/admin";
import { appendWorkLog } from "@/lib/firebase/work-log";
import { defaultActorState, statusMeta } from "@/lib/status/mapping";
import type { ActorState, ActorStatus, AtHomeMode, CharacterGender, PlayerLobbyStatus, PlayerPlatform, SpeechType } from "@/types/actor";

const COLLECTION_NAME = "players";
const MAX_PLAYERS = 4;
const FIRESTORE_TIMEOUT_MS = 2500;

function withTimeout<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => {
      setTimeout(() => resolve(fallback), FIRESTORE_TIMEOUT_MS);
    })
  ]);
}

function isActorStatus(value: unknown): value is ActorStatus {
  return (
    value === "working" ||
    value === "company_eating" ||
    value === "field_work" ||
    value === "going_home" ||
    value === "shopping" ||
    value === "cleaning" ||
    value === "sleeping" ||
    value === "biking" ||
    value === "thinking" ||
    value === "at_home"
  );
}

function isAtHomeMode(value: unknown): value is AtHomeMode {
  return (
    value === "idle" ||
    value === "gaming" ||
    value === "streaming" ||
    value === "reading" ||
    value === "thinking" ||
    value === "eating" ||
    value === "cooking" ||
    value === "gardening"
  );
}

function isCharacterGender(value: unknown): value is CharacterGender {
  return value === "male" || value === "female";
}

function isLobbyStatus(value: unknown): value is PlayerLobbyStatus {
  return value === "active" || value === "waitlist";
}

function isPlayerPlatform(value: unknown): value is PlayerPlatform {
  return value === "telegram" || value === "line" || value === "web";
}

function normalizePlayerState(id: string, raw: Partial<ActorState> | undefined): ActorState {
  return {
    ...defaultActorState,
    ...raw,
    id,
    name: raw?.name?.trim() ? raw.name : `Player-${id.slice(0, 4)}`,
    status: isActorStatus(raw?.status) ? raw.status : defaultActorState.status,
    homeMode: isAtHomeMode(raw?.homeMode) ? raw.homeMode : defaultActorState.homeMode,
    poseKey: raw?.poseKey?.trim() ? raw.poseKey : undefined,
    characterGender: isCharacterGender(raw?.characterGender) ? raw.characterGender : undefined,
    characterId: raw?.characterId?.trim() ? raw.characterId : undefined,
    speechText: raw?.speechText?.trim() ? raw.speechText : "",
    speechType: raw?.speechType ?? "custom",
    lobbyStatus: isLobbyStatus(raw?.lobbyStatus) ? raw.lobbyStatus : "active",
    joinedAt: raw?.joinedAt ?? raw?.updatedAt ?? defaultActorState.updatedAt,
    platform: isPlayerPlatform(raw?.platform) ? raw.platform : "telegram",
    platformUserId: raw?.platformUserId?.trim() ? raw.platformUserId : raw?.telegramUserId ?? id,
    platformUsername: raw?.platformUsername?.trim() ? raw.platformUsername : raw?.telegramUsername ?? "",
    telegramUserId: raw?.telegramUserId ?? raw?.platformUserId ?? id,
    telegramUsername: raw?.telegramUsername ?? raw?.platformUsername ?? "",
    isApproved: raw?.isApproved ?? true,
    isManager: raw?.isManager ?? false,
    location: raw?.location ?? defaultActorState.location,
    updatedAt: raw?.updatedAt ?? defaultActorState.updatedAt,
    updatedBy: raw?.updatedBy ?? "system"
  };
}

async function promoteWaitlistPlayers(db: NonNullable<ReturnType<typeof getFirebaseAdminDb>>) {
  const snapshot = await withTimeout(db.collection(COLLECTION_NAME).get(), null);
  if (!snapshot) {
    return;
  }

  const players = snapshot.docs.map((doc) => normalizePlayerState(doc.id, doc.data() as Partial<ActorState> | undefined));
  const activePlayers = players.filter((player) => player.lobbyStatus !== "waitlist");
  const slots = Math.max(0, MAX_PLAYERS - activePlayers.length);

  if (slots <= 0) {
    return;
  }

  const waitlistPlayers = players
    .filter((player) => player.lobbyStatus === "waitlist")
    .sort((left, right) => (left.joinedAt ?? left.updatedAt).localeCompare(right.joinedAt ?? right.updatedAt))
    .slice(0, slots);

  if (waitlistPlayers.length === 0) {
    return;
  }

  await Promise.all(
    waitlistPlayers.map((player) =>
      db.collection(COLLECTION_NAME).doc(player.id).set(
        {
          lobbyStatus: "active",
          updatedAt: new Date().toISOString(),
          updatedBy: "system:waitlist-promote"
        },
        { merge: true }
      )
    )
  );
}

export async function listPlayers(limit = MAX_PLAYERS): Promise<ActorState[]> {
  const db = getFirebaseAdminDb();

  if (!db) {
    return [];
  }

  try {
    await promoteWaitlistPlayers(db);
    const snapshot = await withTimeout(db.collection(COLLECTION_NAME).get(), null);
    if (!snapshot) {
      return [];
    }
    return snapshot.docs
      .map((doc) => normalizePlayerState(doc.id, doc.data() as Partial<ActorState> | undefined))
      .filter((player) => player.lobbyStatus !== "waitlist")
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, limit);
  } catch {
    return [];
  }
}

export async function getPlayerById(playerId: string): Promise<ActorState | null> {
  const db = getFirebaseAdminDb();

  if (!db) {
    return null;
  }

  try {
    await promoteWaitlistPlayers(db);
    const snapshot = await withTimeout(db.collection(COLLECTION_NAME).doc(playerId).get(), null);
    if (!snapshot || !snapshot.exists) {
      return null;
    }

    return normalizePlayerState(snapshot.id, snapshot.data() as Partial<ActorState> | undefined);
  } catch {
    return null;
  }
}

export async function listAllPlayers(): Promise<ActorState[]> {
  const db = getFirebaseAdminDb();

  if (!db) {
    return [];
  }

  try {
    await promoteWaitlistPlayers(db);
    const snapshot = await withTimeout(db.collection(COLLECTION_NAME).get(), null);
    if (!snapshot) {
      return [];
    }

    return snapshot.docs
      .map((doc) => normalizePlayerState(doc.id, doc.data() as Partial<ActorState> | undefined))
      .sort((left, right) => {
        if ((left.lobbyStatus ?? "active") !== (right.lobbyStatus ?? "active")) {
          return left.lobbyStatus === "active" ? -1 : 1;
        }

        return right.updatedAt.localeCompare(left.updatedAt);
      });
  } catch {
    return [];
  }
}

export async function countActivePlayers(): Promise<number> {
  const activePlayers = await listPlayers(MAX_PLAYERS);
  return activePlayers.length;
}

export async function savePlayerState(playerId: string, status: ActorStatus, updatedBy: string, homeMode?: AtHomeMode, poseKey?: string) {
  const db = getFirebaseAdminDb();
  if (!db) {
    return { ok: false as const, reason: "Firebase unavailable" };
  }

  const current = await getPlayerById(playerId);
  const now = new Date().toISOString();
  const nextState = {
    status,
    homeMode: status === "at_home" ? homeMode ?? current?.homeMode ?? defaultActorState.homeMode : defaultActorState.homeMode,
    poseKey: poseKey ?? "",
    location: statusMeta[status].location,
    updatedAt: now,
    updatedBy
  };

  await db.collection(COLLECTION_NAME).doc(playerId).set(nextState, { merge: true });

  const mergedState = current ? { ...current, ...nextState } : normalizePlayerState(playerId, nextState);
  await appendWorkLog({
    targetId: mergedState.id,
    targetName: mergedState.name,
    isManager: mergedState.isManager ?? false,
    status: mergedState.status === "at_home" ? `${mergedState.status}:${mergedState.homeMode}` : mergedState.status,
    speechText: mergedState.speechText,
    kind: "status",
    updatedBy
  });

  return {
    ok: true as const,
    state: mergedState
  };
}

export async function savePlayerSpeech(playerId: string, speechText: string, speechType: SpeechType, updatedBy: string) {
  const db = getFirebaseAdminDb();
  if (!db) {
    return { ok: false as const, reason: "Firebase unavailable" };
  }

  const now = new Date().toISOString();
  await db.collection(COLLECTION_NAME).doc(playerId).set(
    {
      speechText,
      speechType,
      updatedAt: now,
      updatedBy
    },
    { merge: true }
  );

  const current = await getPlayerById(playerId);
  const mergedState = current
    ? {
        ...current,
        speechText,
        speechType,
        updatedAt: now,
        updatedBy
      }
    : normalizePlayerState(playerId, {
        speechText,
        speechType,
        updatedAt: now,
        updatedBy
      });

  await appendWorkLog({
    targetId: mergedState.id,
    targetName: mergedState.name,
    isManager: mergedState.isManager ?? false,
    status: mergedState.status === "at_home" ? `${mergedState.status}:${mergedState.homeMode}` : mergedState.status,
    speechText,
    kind: "speech",
    updatedBy
  });

  return {
    ok: true as const,
    speechText,
    speechType,
    updatedAt: now
  };
}

export async function clearPlayerSpeech(playerId: string, updatedBy: string) {
  return savePlayerSpeech(playerId, "", "custom", updatedBy);
}
