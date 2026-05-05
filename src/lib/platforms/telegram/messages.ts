import { formatCharacterSummary } from "@/lib/players/format";
import { characterCatalog } from "@/lib/characters/catalog";
import { formatActorStateSummary, getAtHomeModeLabel, getStatusLabel } from "@/lib/status/format";
import type { PlayerApplication } from "@/types/application";
import type { ActorState } from "@/types/actor";
import type { GameEvent, GameMatch, RpsMove } from "@/types/game";

const rpsMoveLabels: Record<RpsMove, string> = {
  rock: "石頭",
  scissors: "剪刀",
  paper: "布"
};

export function getAdminOnlyMessage() {
  return "你目前不在允許的管理者名單中。";
}

export function getManagerPreviewOnlyMessage() {
  return "這個指令只提供管理者預覽玩家端畫面。";
}

export function getManagerSwitchOnlyMessage() {
  return "這個指令只提供管理者切回控制面板。";
}

export function getBlockedApplicationMessage() {
  return "你的帳號目前無法申請加入。";
}

export function getApplicationStatusMessage(reason: "approved" | "pending" | "submitted") {
  return reason === "approved"
    ? "你已經通過審核，可以直接進入遊戲。"
    : reason === "pending"
      ? "你的申請目前正在審核中，請稍候。"
      : "已收到你的申請，正在等待管理者審核。";
}

export function getPendingApplicationAdminMessage(params: {
  displayName: string;
  username?: string;
  userId: string;
  createdAtLabel: string;
}) {
  return [
    "新玩家申請加入",
    "",
    `名稱：${params.displayName}`,
    `帳號：${params.username ? `@${params.username}` : "未設定"}`,
    `Telegram ID：${params.userId}`,
    `申請時間：${params.createdAtLabel}`,
    "目前狀態：pending"
  ].join("\n");
}

export function getMissingUserIdMessage() {
  return "Missing telegram user id.";
}

export function getApplicationStateText(statusLabel: string) {
  return `目前申請狀態：${statusLabel}`;
}

export function getNoApplicationText() {
  return "你目前還沒有送出申請。";
}

export function getEnterGameMessage(entryUrl: string, approved: boolean) {
  return approved ? `已通過審核，你可以直接開啟你的玩家頁： ${entryUrl}` : "你尚未通過審核，請先申請加入遊戲。";
}

export function getNotApprovedCharacterMessage() {
  return "你尚未通過審核，暫時不能選角。";
}

export function getCharacterSelectionPrompt(gender: "male" | "female") {
  return `請選擇${gender === "male" ? "男性" : "女性"}角色款式：`;
}

export function getCharacterNotFoundMessage() {
  return "找不到這個角色款式，請重新選擇。";
}

export function getCharacterSetMessage(label: string) {
  return `已設定角色為 ${label}。之後首頁會使用你的專屬角色素材。`;
}

export function getSpeechControlsMessage() {
  return "請使用下方按鈕設定角色對話、表情或公告。";
}

export function getSpeechNotApprovedMessage() {
  return "你尚未通過審核，暫時不能設定對話。";
}

export function getSpeechPromptMessage() {
  return "請輸入一句簡短文字，我會把它顯示在角色旁邊。建議 30 字內。";
}

export function getSpeechClearedMessage() {
  return "已清除角色目前的對話泡泡。";
}

export function getSpeechPresetPrompt() {
  return "請選擇一組預設台詞。";
}

export function getSpeechEmojiPrompt() {
  return "請選擇一個表情。";
}

export function getSpeechAnnouncementPrompt() {
  return "請選擇一則公告。";
}

export function getSpeechSavedMessage(type: "preset" | "emoji" | "announcement" | "custom", text: string) {
  const prefix =
    type === "preset" ? "已更新角色台詞：" : type === "emoji" ? "已更新角色表情：" : type === "announcement" ? "已更新角色公告：" : "已更新角色對話：";
  return `${prefix}${text}`;
}

export function getManagerStatusMessage(actorSummary: string, weatherModeLabel: string) {
  return [actorSummary, `天氣模式：${weatherModeLabel}`].join("\n");
}

export function getKeyboardSectionMessage() {
  return "請直接點選下方對應區塊的按鈕。";
}

export function getPendingEmptyMessage() {
  return "目前沒有待審核玩家。";
}

export function getPendingListIntro(count: number) {
  return `待審核玩家 ${count} 位，已逐一送出審核卡片。`;
}

export function getPendingApplicationCardMessage(item: PlayerApplication) {
  return [
    "玩家申請資料",
    "",
    `名稱：${item.displayName}`,
    `帳號：${item.telegramUsername ? `@${item.telegramUsername}` : "未設定"}`,
    `Telegram ID：${item.telegramUserId}`,
    `申請時間：${item.createdAt}`
  ].join("\n");
}

export function getPlayersEmptyMessage() {
  return "目前還沒有已建立的玩家資料。";
}

export function getPlayersListMessage(players: ActorState[]) {
  const activePlayers = players.filter((player) => player.lobbyStatus !== "waitlist");
  const waitlistPlayers = players.filter((player) => player.lobbyStatus === "waitlist");

  return [
    `目前玩家 ${players.length} 位`,
    "",
    "正式舞台：",
    ...(activePlayers.length === 0
      ? ["目前沒有正式玩家"]
      : activePlayers.map(
          (player, index) =>
            `${index + 1}. ${player.name}\n狀態：${player.status}\n角色：${formatCharacterSummary(player)}\n席位：正式玩家\n更新：${player.updatedAt}`
        )),
    "",
    "候補名單：",
    ...(waitlistPlayers.length === 0
      ? ["目前沒有候補玩家"]
      : waitlistPlayers.map(
          (player, index) =>
            `${index + 1}. ${player.name}\n狀態：${player.status}\n角色：${formatCharacterSummary(player)}\n席位：候補玩家\n更新：${player.updatedAt}`
        ))
  ].join("\n\n");
}

export function getCharacterCatalogMessage() {
  return [
    "目前可選角色樣式",
    "",
    "男性角色：",
    ...characterCatalog.male.map((character, index) => `${index + 1}. ${character.label} (${character.id})`),
    "",
    "女性角色：",
    ...characterCatalog.female.map((character, index) => `${index + 1}. ${character.label} (${character.id})`)
  ].join("\n");
}

export function getReviewFailedMessage() {
  return "找不到這筆申請資料，或 Firebase 尚未就緒。";
}

export function getReviewResultMessage(targetUserId: string, actionText: string, lobbyStatus?: "active" | "waitlist") {
  return `已將 ${targetUserId} 設為：${actionText}${actionText === "通過" ? `\n席位：${lobbyStatus === "waitlist" ? "候補玩家" : "正式玩家"}` : ""}`;
}

export function getPlayerReviewNotification(actionText: string, targetUserId: string, lobbyStatus?: "active" | "waitlist") {
  return actionText === "通過"
    ? `你已通過審核，現在可以進入遊戲。\n你的玩家頁：https://funyweb.netlify.app/player/${targetUserId}\n目前席位：${lobbyStatus === "waitlist" ? "候補玩家" : "正式玩家"}\n\n接下來請先選擇角色：先按「選男性角色」或「選女性角色」，再挑選角色款式。`
    : actionText === "拒絕"
      ? "你的申請目前未通過審核。"
      : "你的帳號已被封鎖，無法加入遊戲。";
}

export function getWeatherStatusMessage(modeLabel: string) {
  return `目前天氣模式：${modeLabel}`;
}

export function getKnowledgeSavedMessage(savedItems: Array<{ title?: string; url?: string } | null>) {
  return [`已收錄 ${savedItems.length} 筆知識連結。`, ...savedItems.map((item, index) => `${index + 1}. ${item?.title ?? item?.url}`)].join("\n");
}

export function getWeatherChangedMessage(modeLabel: string) {
  return `已切換天氣模式為：${modeLabel}`;
}

export function getUnknownCommandMessage(helpText: string) {
  return `未識別指令。\n\n${helpText}`;
}

export function getPlayerUnknownCommandMessage() {
  return "目前可使用：申請加入遊戲、查看申請狀態、進入遊戲，以及對話相關按鈕。";
}

export function getPlayerNotApprovedStateMessage() {
  return "你尚未通過審核，暫時不能更新自己的狀態。";
}

export function getPlayerNotApprovedCharacterMessage() {
  return "你尚未通過審核，暫時不能選角。";
}

export function getPlayerStateUpdateFailedMessage() {
  return "目前暫時無法更新你的玩家狀態。";
}

export function getPlayerStateUpdatedMessage(state: ActorState) {
  return [
    `已切換為：${getStatusLabel(state.status)}${state.status === "at_home" ? ` (${getAtHomeModeLabel(state.homeMode)})` : ""}`,
    "",
    formatActorStateSummary(state)
  ].join("\n");
}

export function getRpsStartMessage() {
  return "已進入猜拳。你可以先選擇石頭、剪刀或布；對手加入並出拳後就會立刻判定勝負。";
}

export function getRpsAlreadyWaitingMessage() {
  return "你已經在猜拳等待中。若還沒出拳，可以先選擇石頭、剪刀或布。";
}

export function getRpsJoinedMessage(opponentName: string) {
  return `已加入和 ${opponentName} 的猜拳。請選擇：石頭、剪刀或布。`;
}

export function getRpsOpponentJoinedMessage(opponentName: string) {
  return `${opponentName} 加入了你的猜拳。請選擇：石頭、剪刀或布。`;
}

export function getRpsMoveSavedMessage(move: RpsMove) {
  return `你出了${rpsMoveLabels[move]}。已先記錄，等待對手加入或出拳。`;
}

export function getRpsWaitingOpponentMessage() {
  return "目前還在等待對手加入猜拳。你可以先出拳，系統會幫你保留。";
}

export function getRpsAlreadyMovedMessage() {
  return "你已經出拳了，請等待對方。";
}

export function getRpsNoActiveMatchMessage() {
  return "目前沒有進行中的猜拳；你也可以直接按石頭、剪刀或布先出拳排隊。";
}

export function getRpsResultMessage(event: GameEvent, viewerId: string) {
  const opponent = event.players.find((player) => player.playerId !== viewerId);
  const viewerMove = event.moves[viewerId];
  const opponentMove = opponent ? event.moves[opponent.playerId] : undefined;
  const resultText = event.result === "draw" ? "平手" : event.winnerId === viewerId ? "你贏了" : "你輸了";

  return [
    `猜拳結果：${resultText}`,
    opponent ? `對手：${opponent.name}` : "",
    viewerMove ? `你出的是：${rpsMoveLabels[viewerMove]}` : "",
    opponentMove ? `對方出的是：${rpsMoveLabels[opponentMove]}` : "",
    "",
    event.message
  ]
    .filter(Boolean)
    .join("\n");
}

export function getRpsMatchSummary(match: GameMatch) {
  if (!match.playerB) {
    return `${match.playerA.name} 正在等待猜拳對手。`;
  }

  return `${match.playerA.name} vs ${match.playerB.name}`;
}

export function getManagerStateUpdatedMessage(result: {
  state: ActorState;
  source: string;
  error?: string;
}) {
  return [
    `已切換為：${getStatusLabel(result.state.status)}${result.state.status === "at_home" ? ` (${getAtHomeModeLabel(result.state.homeMode)})` : ""}`,
    result.source === "firebase" ? "已同步到 Firebase。" : `未寫入 Firebase：${result.error ?? "unknown error"}`,
    "",
    formatActorStateSummary(result.state)
  ].join("\n");
}
