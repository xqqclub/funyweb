import { collection, onSnapshot } from "firebase/firestore";

import { getFirebaseClientDb } from "@/lib/firebase/client";
import { defaultActorState } from "@/lib/status/mapping";
import type { ActorState, ActorStatus, AtHomeMode, CharacterGender, PlayerLobbyStatus, PlayerPlatform } from "@/types/actor";

const COLLECTION_NAME = "players";

function isActorStatus(value: unknown): value is ActorStatus {
  return value === "working" || value === "going_home" || value === "cleaning" || value === "sleeping" || value === "biking" || value === "at_home";
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

export function subscribeToPlayers(onChange: (players: ActorState[]) => void) {
  const db = getFirebaseClientDb();

  if (!db) {
    onChange([]);
    return () => undefined;
  }

  const playersRef = collection(db, COLLECTION_NAME);

  return onSnapshot(playersRef, (snapshot) => {
    const players = snapshot.docs
      .map((doc) => normalizePlayerState(doc.id, doc.data() as Partial<ActorState> | undefined))
      .filter((player) => player.lobbyStatus !== "waitlist")
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

    onChange(players);
  });
}
