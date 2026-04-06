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
    "/status - 查看目前主角狀態",
    "/work, /working, /office - 切換為工作中",
    "/home, /walk, /commute, /goinghome - 切換為回家中",
    "/bike, /ride, /biking - 切換為騎車中",
    "/clean, /cleaning, /sweep - 切換為打掃中",
    "/sleep, /sleeping - 切換為睡覺中",
    "/athome, /homeidle, /standby - 切換為在家",
    "/game - 切換為在家打電動",
    "/stream - 切換為在家追劇",
    "/read - 切換為在家讀書",
    "/weatherstatus - 查看目前天氣模式",
    "/weatherauto - 切換為自動依台中天氣",
    "/weatherrain - 切換為手動雨天"
  ].join("\n");
}
