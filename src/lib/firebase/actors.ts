import { getFirebaseAdminDb } from "@/lib/firebase/admin";
import { DEFAULT_ACTOR_ID, buildActorState, defaultActorState } from "@/lib/status/mapping";
import type { ActorState, ActorStatus, AtHomeMode } from "@/types/actor";

const COLLECTION_NAME = "actors";

export type ActorStateResult = {
  state: ActorState;
  source: "firebase" | "fallback";
  error?: string;
};

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function isAtHomeMode(value: unknown): value is AtHomeMode {
  return value === "idle" || value === "gaming" || value === "streaming" || value === "reading";
}

function normalizeActorState(raw: Partial<ActorState> | undefined): {
  state: ActorState;
  changed: boolean;
} {
  const merged: ActorState = {
    ...defaultActorState,
    ...raw
  };

  let changed = false;

  if (!raw?.name || raw.name === "Mina") {
    merged.name = defaultActorState.name;
    changed = true;
  }

  if (!raw?.id || raw.id !== DEFAULT_ACTOR_ID) {
    merged.id = DEFAULT_ACTOR_ID;
    changed = true;
  }

  if (!raw?.status || !raw?.location || !raw?.updatedAt || !raw?.updatedBy) {
    changed = true;
  }

  if (!isAtHomeMode(raw?.homeMode)) {
    merged.homeMode = defaultActorState.homeMode;
    changed = true;
  }

  return {
    state: merged,
    changed
  };
}

export async function saveActorState(status: ActorStatus, updatedBy: string, homeMode?: AtHomeMode): Promise<ActorStateResult> {
  const db = getFirebaseAdminDb();
  const actorState = buildActorState(status, updatedBy, homeMode);

  if (!db) {
    return {
      state: actorState,
      source: "fallback",
      error: "Firebase admin database unavailable."
    };
  }

  try {
    await db.collection(COLLECTION_NAME).doc(DEFAULT_ACTOR_ID).set(actorState, { merge: true });
  } catch (error) {
    return {
      state: actorState,
      source: "fallback",
      error: toErrorMessage(error)
    };
  }

  return {
    state: actorState,
    source: "firebase"
  };
}

export async function getActorState(): Promise<ActorState> {
  return (await getActorStateResult()).state;
}

export async function getActorStateResult(): Promise<ActorStateResult> {
  const db = getFirebaseAdminDb();

  if (!db) {
    return {
      state: defaultActorState,
      source: "fallback",
      error: "Firebase admin database unavailable."
    };
  }

  try {
    const snapshot = await db.collection(COLLECTION_NAME).doc(DEFAULT_ACTOR_ID).get();
    if (!snapshot.exists) {
      await db.collection(COLLECTION_NAME).doc(DEFAULT_ACTOR_ID).set(defaultActorState);
      return {
        state: defaultActorState,
        source: "firebase"
      };
    }

    const normalized = normalizeActorState(snapshot.data() as Partial<ActorState> | undefined);

    if (normalized.changed) {
      await db.collection(COLLECTION_NAME).doc(DEFAULT_ACTOR_ID).set(normalized.state, { merge: true });
    }

    return {
      state: normalized.state,
      source: "firebase"
    };
  } catch (error) {
    return {
      state: defaultActorState,
      source: "fallback",
      error: toErrorMessage(error)
    };
  }
}
