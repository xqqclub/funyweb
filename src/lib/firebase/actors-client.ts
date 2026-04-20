import { doc, onSnapshot, setDoc } from "firebase/firestore";

import { getFirebaseClientDb } from "@/lib/firebase/client";
import { DEFAULT_ACTOR_ID, defaultActorState } from "@/lib/status/mapping";
import type { ActorState, AtHomeMode } from "@/types/actor";

const COLLECTION_NAME = "actors";

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

function normalizeActorState(raw: Partial<ActorState> | undefined): ActorState {
  return {
    ...defaultActorState,
    ...raw,
    id: DEFAULT_ACTOR_ID,
    name: !raw?.name || raw.name === "Mina" ? defaultActorState.name : raw.name,
    homeMode: isAtHomeMode(raw?.homeMode) ? raw.homeMode : defaultActorState.homeMode
  };
}

export function subscribeToActorState(onChange: (state: ActorState) => void) {
  const db = getFirebaseClientDb();

  if (!db) {
    onChange(defaultActorState);
    return () => undefined;
  }

  const actorRef = doc(db, COLLECTION_NAME, DEFAULT_ACTOR_ID);

  return onSnapshot(actorRef, async (snapshot) => {
    if (!snapshot.exists()) {
      await setDoc(actorRef, defaultActorState);
      onChange(defaultActorState);
      return;
    }

    onChange(normalizeActorState(snapshot.data() as Partial<ActorState>));
  });
}
