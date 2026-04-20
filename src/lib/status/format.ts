import { atHomeModeMeta, statusMeta } from "@/lib/status/mapping";
import type { ActorState, ActorStatus, AtHomeMode } from "@/types/actor";

export function getStatusLabel(status: ActorStatus) {
  return statusMeta[status].label;
}

export function getAtHomeModeLabel(mode: AtHomeMode) {
  return atHomeModeMeta[mode].label;
}

export function formatActorStateSummary(state: ActorState) {
  return [
    `主角：${state.name}`,
    `狀態：${getStatusLabel(state.status)}`,
    ...(state.status === "at_home" ? [`居家模式：${getAtHomeModeLabel(state.homeMode)}`] : []),
    ...(state.speechText?.trim() ? [`對話：${state.speechText}`] : []),
    `區域：${state.location}`,
    `更新者：${state.updatedBy}`,
    `更新時間：${state.updatedAt}`
  ].join("\n");
}

export function formatTelegramHelp() {
  return [
    "可直接用下方按鈕控制狀態。",
    "",
    "可用指令：",
    "/start 或 /help - 顯示控制說明",
    "/playerview - 以管理者身份預覽玩家端畫面",
    "/adminview - 切回管理者控制面板",
    "/status - 查看目前主角狀態",
    "/pendingplayers - 查看待審核玩家",
    "/characters - 查看目前可選角色樣式",
    "/work, /working, /office - 切換為工作中",
    "/home, /walk, /commute, /goinghome - 切換為回家中",
    "/bike, /ride, /biking - 切換為騎車中",
    "/clean, /cleaning, /sweep - 切換為打掃中",
    "/sleep, /sleeping - 切換為睡覺中",
    "/athome, /homeidle, /standby - 切換為在家",
    "/game - 切換為在家打電動",
    "/stream - 切換為在家追劇",
    "/read - 切換為在家讀書",
    "說話 - 輸入一句顯示在角色旁邊的文字",
    "預設台詞 / 表情符號 / 短暫公告 - 快速更新角色泡泡",
    "刪除對話 - 清除目前對話泡泡",
    "/weatherstatus - 查看目前天氣模式",
    "/weatherauto - 切換為自動依台中天氣",
    "/weatherrain - 切換為手動雨天"
  ].join("\n");
}

export function formatTelegramPlayerHelp() {
  return [
    "歡迎來到 Pixel Town。",
    "",
    "你可以先申請加入遊戲，通過後就能出現在首頁玩家舞台中。",
    "通過審核後，可再選擇男性或女性角色款式。",
    "之後也能用 Telegram 直接讓角色說話或顯示表情。",
    "",
    "可用按鈕：",
    "申請加入遊戲",
    "查看申請狀態",
    "進入遊戲"
  ].join("\n");
}
