import { getFirebaseAdminDb } from "@/lib/firebase/admin";
import { countActivePlayers } from "@/lib/firebase/players";
import type { PlayerApplication, ApplicationStatus } from "@/types/application";
import type { ActorState, PlayerPlatform } from "@/types/actor";

const APPLICATIONS_COLLECTION = "applications";
const PLAYERS_COLLECTION = "players";

type TelegramUserProfile = {
  platform?: PlayerPlatform;
  platformUserId?: string;
  platformUsername?: string;
  telegramUserId: string;
  telegramUsername?: string;
  displayName?: string;
};

function buildDefaultPlayer(profile: TelegramUserProfile): ActorState & {
  telegramUserId: string;
  telegramUsername: string;
  isApproved: boolean;
  isManager: boolean;
  joinedAt: string;
} {
  const now = new Date().toISOString();
  return {
    id: profile.telegramUserId,
    platform: profile.platform ?? "telegram",
    platformUserId: profile.platformUserId ?? profile.telegramUserId,
    platformUsername: profile.platformUsername ?? profile.telegramUsername ?? "",
    telegramUserId: profile.telegramUserId,
    telegramUsername: profile.telegramUsername ?? "",
    name: profile.displayName?.trim() || profile.telegramUsername || `Player-${profile.telegramUserId.slice(-4)}`,
    isApproved: true,
    isManager: false,
    status: "at_home",
    homeMode: "idle",
    poseKey: "",
    location: "home",
    lobbyStatus: "active",
    characterGender: "male",
    characterId: "drovik",
    updatedAt: now,
    updatedBy: "system",
    joinedAt: now
  };
}

export function buildApplication(profile: TelegramUserProfile, status: ApplicationStatus = "pending"): PlayerApplication {
  return {
    platform: profile.platform ?? "telegram",
    platformUserId: profile.platformUserId ?? profile.telegramUserId,
    platformUsername: profile.platformUsername ?? profile.telegramUsername ?? "",
    telegramUserId: profile.telegramUserId,
    telegramUsername: profile.telegramUsername ?? "",
    displayName: profile.displayName?.trim() || profile.telegramUsername || `Player-${profile.telegramUserId.slice(-4)}`,
    status,
    createdAt: new Date().toISOString(),
    reviewedAt: null,
    reviewedBy: null,
    note: ""
  };
}

export async function getApplication(telegramUserId: string): Promise<PlayerApplication | null> {
  const db = getFirebaseAdminDb();
  if (!db) return null;

  try {
    const snapshot = await db.collection(APPLICATIONS_COLLECTION).doc(telegramUserId).get();
    return snapshot.exists ? (snapshot.data() as PlayerApplication) : null;
  } catch {
    return null;
  }
}

export async function submitApplication(profile: TelegramUserProfile) {
  const db = getFirebaseAdminDb();
  const existing = await getApplication(profile.telegramUserId);

  if (!db) {
    return { ok: false as const, reason: "Firebase unavailable", application: existing };
  }

  if (existing?.status === "blocked") {
    return { ok: false as const, reason: "blocked", application: existing };
  }

  if (existing?.status === "approved") {
    return { ok: true as const, reason: "approved", application: existing };
  }

  if (existing?.status === "pending") {
    return { ok: true as const, reason: "pending", application: existing };
  }

  const application = buildApplication(profile, "pending");
  await db.collection(APPLICATIONS_COLLECTION).doc(profile.telegramUserId).set(application, { merge: true });

  return { ok: true as const, reason: "submitted", application };
}

export async function listPendingApplications(): Promise<PlayerApplication[]> {
  const db = getFirebaseAdminDb();
  if (!db) return [];

  try {
    const snapshot = await db.collection(APPLICATIONS_COLLECTION).where("status", "==", "pending").get();
    return snapshot.docs.map((doc) => doc.data() as PlayerApplication).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  } catch {
    return [];
  }
}

export async function reviewApplication(
  telegramUserId: string,
  status: Extract<ApplicationStatus, "approved" | "rejected" | "blocked">,
  reviewedBy: string
) {
  const db = getFirebaseAdminDb();
  if (!db) {
    return { ok: false as const, reason: "Firebase unavailable" };
  }

  const existing = await getApplication(telegramUserId);
  if (!existing) {
    return { ok: false as const, reason: "application_not_found" };
  }

  const reviewedAt = new Date().toISOString();
  const nextApplication: PlayerApplication = {
    ...existing,
    status,
    reviewedAt,
    reviewedBy
  };

  await db.collection(APPLICATIONS_COLLECTION).doc(telegramUserId).set(nextApplication, { merge: true });

  if (status === "approved") {
    const activePlayerCount = await countActivePlayers();
    const defaultPlayer = buildDefaultPlayer({
      platform: existing.platform,
      platformUserId: existing.platformUserId,
      platformUsername: existing.platformUsername,
      telegramUserId,
      telegramUsername: existing.telegramUsername,
      displayName: existing.displayName
    });
    defaultPlayer.lobbyStatus = activePlayerCount >= 4 ? "waitlist" : "active";
    await db.collection(PLAYERS_COLLECTION).doc(telegramUserId).set(defaultPlayer, { merge: true });

    return {
      ok: true as const,
      application: nextApplication,
      playerLobbyStatus: defaultPlayer.lobbyStatus
    };
  }

  return { ok: true as const, application: nextApplication };
}

export async function updatePlayerCharacter(
  telegramUserId: string,
  characterGender: "male" | "female",
  characterId: string,
  updatedBy: string
) {
  const db = getFirebaseAdminDb();
  if (!db) {
    return { ok: false as const, reason: "Firebase unavailable" };
  }

  const now = new Date().toISOString();

  await db.collection(PLAYERS_COLLECTION).doc(telegramUserId).set(
    {
      characterGender,
      characterId,
      updatedAt: now,
      updatedBy
    },
    { merge: true }
  );

  return {
    ok: true as const,
    characterGender,
    characterId,
    updatedAt: now
  };
}
