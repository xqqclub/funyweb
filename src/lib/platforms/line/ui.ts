import type { ActorStatus, AtHomeMode } from "@/types/actor";
import type { WeatherMode } from "@/types/weather";
import { characterCatalog as sharedCharacterCatalog } from "@/lib/characters/catalog";

export type LineAction =
  | "apply_join"
  | "check_application"
  | "enter_game"
  | "open_character_gender"
  | "open_speech"
  | "clear_speech"
  | "open_weather"
  | "open_admin_panel"
  | "unknown";

export type LineActionPayload = {
  action: LineAction;
  status?: ActorStatus;
  homeMode?: AtHomeMode;
  weatherMode?: WeatherMode;
  characterGender?: "male" | "female";
  characterId?: string;
};

export const lineCharacterCatalog = sharedCharacterCatalog;

export const lineQuickActions = {
  player: ["申請加入遊戲", "查看申請狀態", "進入遊戲"],
  speech: ["說話", "刪除對話", "預設台詞", "表情符號", "短暫公告"],
  weather: ["目前天氣模式", "自動天氣", "手動雨天"],
  admin: ["待審核玩家", "玩家列表", "角色狀態", "天氣控制"]
} as const;

export function parseLineTextAction(text: string): LineActionPayload {
  switch (text.trim()) {
    case "申請加入遊戲":
      return { action: "apply_join" };
    case "查看申請狀態":
      return { action: "check_application" };
    case "進入遊戲":
      return { action: "enter_game" };
    case "說話":
      return { action: "open_speech" };
    case "刪除對話":
      return { action: "clear_speech" };
    case "目前天氣模式":
      return { action: "open_weather" };
    default:
      return { action: "unknown" };
  }
}
