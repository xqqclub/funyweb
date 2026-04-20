export function getLineNotReadyMessage() {
  return "LINE 控制入口骨架已建立，但目前尚未完成正式串接。";
}

export function getLineWebhookReadyMessage() {
  return "LINE webhook 路由已存在，下一步可接 LINE Messaging API。";
}

export function getLinePlayerStubMessage() {
  return "未來這裡會提供玩家申請、狀態更新、對話泡泡與進入遊戲入口。";
}

export function getLineAdminStubMessage() {
  return "未來這裡會提供管理者審核、玩家列表、天氣控制與全域狀態控制。";
}
