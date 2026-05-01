import type { ActorStatus, AtHomeMode, CharacterGender } from "@/types/actor";
import type { RpsMove } from "@/types/game";
import type { WeatherMode } from "@/types/weather";
import {
  characterCatalog,
  getAllCharacterCommandLabels,
  getCharacterCommandTarget,
  getCharacterKeyboardRows,
  type CharacterCommandTarget
} from "@/lib/characters/catalog";

export type TelegramReplyMarkup = {
  keyboard: Array<Array<{ text: string }>>;
  resize_keyboard: boolean;
  persistent?: boolean;
};

export type CommandTarget = {
  status: ActorStatus;
  homeMode?: AtHomeMode;
  poseKey?: string;
};

export type WeatherCommandTarget = {
  mode: WeatherMode;
};

export const commandMap: Record<string, CommandTarget> = {
  "/work": { status: "working" },
  "/working": { status: "working" },
  "/office": { status: "working" },
  "工作中": { status: "working" },
  "/home": { status: "going_home" },
  "/walk": { status: "going_home" },
  "/commute": { status: "going_home" },
  "/goinghome": { status: "going_home" },
  "回家中": { status: "going_home" },
  "/bike": { status: "biking" },
  "/ride": { status: "biking" },
  "/biking": { status: "biking" },
  "騎車中": { status: "biking" },
  "/clean": { status: "cleaning" },
  "/cleaning": { status: "cleaning" },
  "/sweep": { status: "cleaning" },
  "打掃中": { status: "cleaning" },
  "/sleep": { status: "sleeping" },
  "/sleeping": { status: "sleeping" },
  "睡覺中": { status: "sleeping" },
  "/athome": { status: "at_home", homeMode: "idle" },
  "/homeidle": { status: "at_home", homeMode: "idle" },
  "/standby": { status: "at_home", homeMode: "idle" },
  "在家": { status: "at_home", homeMode: "idle" },
  "/game": { status: "at_home", homeMode: "gaming" },
  "在家打電動": { status: "at_home", homeMode: "gaming" },
  "/stream": { status: "at_home", homeMode: "streaming" },
  "在家追劇": { status: "at_home", homeMode: "streaming" },
  "/read": { status: "at_home", homeMode: "reading" },
  "在家讀書": { status: "at_home", homeMode: "reading" },
  "/run": { status: "going_home" },
  "奔跑中": { status: "going_home" },
  "/think": { status: "at_home", homeMode: "thinking" },
  "沉思中": { status: "at_home", homeMode: "thinking" },
  "/eat": { status: "at_home", homeMode: "eating" },
  "吃飯中": { status: "at_home", homeMode: "eating" },
  "/cook": { status: "at_home", homeMode: "cooking" },
  "烹飪中": { status: "at_home", homeMode: "cooking" },
  "/garden": { status: "at_home", homeMode: "gardening" },
  "種花中": { status: "at_home", homeMode: "gardening" }
};

export const weatherCommandMap: Record<string, WeatherCommandTarget> = {
  "/weatherauto": { mode: "auto" },
  "自動天氣": { mode: "auto" },
  "/weatherrain": { mode: "rain" },
  "手動雨天": { mode: "rain" }
};

export const presetSpeechOptions = ["我回來了", "今天努力工作", "先休息一下", "正在整理房間"] as const;
export const emojiSpeechOptions = ["😀", "😴", "📚", "🎮", "🚲", "🧹"] as const;
export const announcementSpeechOptions = ["任務完成", "剛下班", "開始追劇", "今天下雨"] as const;
export const rpsMoveMap: Record<string, RpsMove> = {
  "石頭": "rock",
  "剪刀": "scissors",
  "布": "paper"
};

export function getTelegramControlKeyboard(): TelegramReplyMarkup {
  return {
    keyboard: [
      [{ text: "/status" }, { text: "/help" }],
      [{ text: "待審核玩家" }, { text: "玩家列表" }, { text: "角色樣式列表" }],
      [{ text: "目前天氣模式" }],
      [{ text: "角色狀態" }],
      [{ text: "工作中" }, { text: "回家中" }, { text: "騎車中" }],
      [{ text: "打掃中" }, { text: "睡覺中" }, { text: "在家" }],
      [{ text: "在家打電動" }, { text: "在家追劇" }, { text: "在家讀書" }],
      [{ text: "對話控制" }],
      [{ text: "說話" }, { text: "刪除對話" }],
      [{ text: "預設台詞" }, { text: "表情符號" }, { text: "短暫公告" }],
      [{ text: "遊戲控制" }],
      [{ text: "猜拳" }],
      [{ text: "石頭" }, { text: "剪刀" }, { text: "布" }],
      [{ text: "天氣控制" }],
      [{ text: "自動天氣" }, { text: "手動雨天" }]
    ],
    resize_keyboard: true,
    persistent: true
  };
}

export function getTelegramPlayerKeyboard(approved = false): TelegramReplyMarkup {
  const keyboard: Array<Array<{ text: string }>> = [[{ text: "申請加入遊戲" }, { text: "查看申請狀態" }], [{ text: "進入遊戲" }]];

  if (approved) {
    keyboard.push([{ text: "猜拳" }]);
    keyboard.push([{ text: "石頭" }, { text: "剪刀" }, { text: "布" }]);
    keyboard.push([{ text: "說話" }, { text: "刪除對話" }]);
    keyboard.push([{ text: "預設台詞" }, { text: "表情符號" }, { text: "短暫公告" }]);
  }

  return {
    keyboard,
    resize_keyboard: true,
    persistent: true
  };
}

export function getTelegramAdminPreviewKeyboard(): TelegramReplyMarkup {
  return {
    keyboard: [
      [{ text: "申請加入遊戲" }, { text: "查看申請狀態" }],
      [{ text: "進入遊戲" }],
      [{ text: "猜拳" }],
      [{ text: "石頭" }, { text: "剪刀" }, { text: "布" }],
      [{ text: "切回管理者畫面" }]
    ],
    resize_keyboard: true,
    persistent: true
  };
}

export function buildTelegramPlayerKeyboard(rows: string[][]): TelegramReplyMarkup {
  return {
    keyboard: [
      [{ text: "申請加入遊戲" }, { text: "查看申請狀態" }],
      [{ text: "進入遊戲" }],
      ...rows.map((row) => row.map((text) => ({ text }))),
      [{ text: "猜拳" }],
      [{ text: "石頭" }, { text: "剪刀" }, { text: "布" }],
      [{ text: "說話" }, { text: "刪除對話" }],
      [{ text: "預設台詞" }, { text: "表情符號" }, { text: "短暫公告" }]
    ],
    resize_keyboard: true,
    persistent: true
  };
}

export function getLyraPlayerKeyboard(): TelegramReplyMarkup {
  return buildTelegramPlayerKeyboard([
    ["工作中", "奔跑中", "打掃中"],
    ["睡覺中", "在家", "沉思中"],
    ["吃飯中", "烹飪中", "種花中"]
  ]);
}

export function getPlayerKeyboardForProfile(
  approved: boolean,
  playerProfile?: { characterGender?: CharacterGender; characterId?: string } | null
): TelegramReplyMarkup {
  if (approved) {
    const rows = getCharacterKeyboardRows(playerProfile);
    if (rows) {
      return buildTelegramPlayerKeyboard(rows);
    }
  }

  return getTelegramPlayerKeyboard(approved);
}

export function getCharacterCommandTargetForProfile(
  text: string,
  playerProfile?: { characterGender?: CharacterGender; characterId?: string } | null
): CharacterCommandTarget | null {
  return getCharacterCommandTarget(text, playerProfile);
}

export function getGenderSelectionKeyboard(): TelegramReplyMarkup {
  return {
    keyboard: [[{ text: "選男性角色" }, { text: "選女性角色" }], [{ text: "查看申請狀態" }, { text: "進入遊戲" }]],
    resize_keyboard: true,
    persistent: true
  };
}

export function getCharacterSelectionKeyboard(gender: "male" | "female"): TelegramReplyMarkup {
  return {
    keyboard: [
      characterCatalog[gender].map((item) => ({ text: `角色 ${item.label}` })),
      [{ text: "選男性角色" }, { text: "選女性角色" }],
      [{ text: "進入遊戲" }]
    ],
    resize_keyboard: true,
    persistent: true
  };
}

export function getSpeechOptionKeyboard(options: readonly string[], includeDelete = true): TelegramReplyMarkup {
  const rows: Array<Array<{ text: string }>> = [];

  for (let index = 0; index < options.length; index += 2) {
    rows.push(options.slice(index, index + 2).map((text) => ({ text })));
  }

  rows.push([{ text: "說話" }, { text: "刪除對話" }]);
  if (includeDelete) {
    rows.push([{ text: "進入遊戲" }]);
  }

  return {
    keyboard: rows,
    resize_keyboard: true,
    persistent: true
  };
}

export function getPendingReviewKeyboard(platformUserId: string): TelegramReplyMarkup {
  return {
    keyboard: [[{ text: `通過 ${platformUserId}` }, { text: `拒絕 ${platformUserId}` }], [{ text: `封鎖 ${platformUserId}` }]],
    resize_keyboard: true
  };
}

export function isReservedTelegramText(text: string) {
  return (
    text in commandMap ||
    text in weatherCommandMap ||
    getAllCharacterCommandLabels().includes(text) ||
    [
      "/start",
      "/help",
      "/playerview",
      "/adminview",
      "切回管理者畫面",
      "申請加入遊戲",
      "查看申請狀態",
      "進入遊戲",
      "選男性角色",
      "選女性角色",
      "/status",
      "查看狀態",
      "角色狀態",
      "天氣控制",
      "對話控制",
      "待審核玩家",
      "/pendingplayers",
      "玩家列表",
      "/players",
      "/characters",
      "角色樣式列表",
      "猜拳",
      "石頭",
      "剪刀",
      "布",
      "/weatherstatus",
      "目前天氣模式",
      "說話",
      "刪除對話",
      "預設台詞",
      "表情符號",
      "短暫公告",
      "奔跑中",
      "沉思中",
      "吃飯中",
      "烹飪中",
      "種花中",
      ...presetSpeechOptions,
      ...emojiSpeechOptions,
      ...announcementSpeechOptions
    ].includes(text) ||
    /^角色\s+(.+)$/.test(text) ||
    /^(通過|拒絕|封鎖)\s+(\d+)$/.test(text)
  );
}
