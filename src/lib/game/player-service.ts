import { getApplication, reviewApplication, submitApplication } from "@/lib/firebase/applications";
import { clearActorSpeech, saveActorSpeech } from "@/lib/firebase/actors";
import { clearPlayerSpeech, getPlayerById, savePlayerSpeech, savePlayerState } from "@/lib/firebase/players";
import type { ApplicationStatus, PlayerApplication } from "@/types/application";
import type { ActorStatus, AtHomeMode, PlayerPlatform, SpeechType } from "@/types/actor";

export type PlatformProfile = {
  platform?: PlayerPlatform;
  platformUserId: string;
  platformUsername?: string;
  displayName?: string;
};

export function getApplicationStatusLabel(status: PlayerApplication["status"]) {
  return status === "pending" ? "審核中" : status === "approved" ? "已通過" : status === "rejected" ? "已拒絕" : "已封鎖";
}

export async function submitPlayerApplication(profile: PlatformProfile) {
  return submitApplication({
    platform: profile.platform ?? "telegram",
    platformUserId: profile.platformUserId,
    platformUsername: profile.platformUsername,
    telegramUserId: profile.platformUserId,
    telegramUsername: profile.platformUsername,
    displayName: profile.displayName
  });
}

export async function getPlayerApplication(platformUserId: string) {
  return getApplication(platformUserId);
}

export async function reviewPlayerApplication(platformUserId: string, status: Extract<ApplicationStatus, "approved" | "rejected" | "blocked">, reviewedBy: string) {
  return reviewApplication(platformUserId, status, reviewedBy);
}

export async function getApprovedPlayerProfile(platformUserId: string) {
  return getPlayerById(platformUserId);
}

export async function updateApprovedPlayerStatus(
  playerId: string,
  status: ActorStatus,
  updatedBy: string,
  homeMode?: AtHomeMode,
  poseKey?: string
) {
  return savePlayerState(playerId, status, updatedBy, homeMode, poseKey);
}

export async function saveSpeechForTarget(playerId: string, isManager: boolean, speechText: string, speechType: SpeechType, updatedBy: string) {
  if (isManager) {
    return saveActorSpeech(speechText, speechType, updatedBy);
  }

  return savePlayerSpeech(playerId, speechText, speechType, updatedBy);
}

export async function clearSpeechForTarget(playerId: string, isManager: boolean, updatedBy: string) {
  if (isManager) {
    return clearActorSpeech(updatedBy);
  }

  return clearPlayerSpeech(playerId, updatedBy);
}
