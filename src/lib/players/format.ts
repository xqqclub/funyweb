import type { ActorState } from "@/types/actor";

export function formatCharacterSummary(player: ActorState) {
  if (!player.characterGender || !player.characterId) {
    return "尚未選角";
  }

  return `${player.characterGender} / ${player.characterId}`;
}

const ONLINE_THRESHOLD_MS = 10 * 60 * 1000;

export function isPlayerOnline(updatedAt: string) {
  const time = Date.parse(updatedAt);
  if (Number.isNaN(time)) {
    return false;
  }

  return Date.now() - time <= ONLINE_THRESHOLD_MS;
}

export function formatLastActive(updatedAt: string) {
  const time = Date.parse(updatedAt);
  if (Number.isNaN(time)) {
    return "時間未知";
  }

  const diffMs = Math.max(0, Date.now() - time);
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) {
    return "剛剛活動";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} 分鐘前`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} 小時前`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} 天前`;
}
