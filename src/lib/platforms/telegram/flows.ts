import { NextResponse } from "next/server";

import { characterCatalog } from "@/lib/characters/catalog";
import { listPendingApplications, updatePlayerCharacter } from "@/lib/firebase/applications";
import { getActorState, saveActorState } from "@/lib/firebase/actors";
import { listAllPlayers } from "@/lib/firebase/players";
import { clearTelegramPendingAction, setTelegramPendingAction } from "@/lib/firebase/telegram-session";
import {
  clearSpeechForTarget,
  getApplicationStatusLabel,
  getApprovedPlayerProfile,
  reviewPlayerApplication,
  saveSpeechForTarget,
  submitPlayerApplication,
  updateApprovedPlayerStatus
} from "@/lib/game/player-service";
import { buildTelegramManagerRpsParticipant, startOrJoinRpsMatch, submitRpsMove } from "@/lib/game/rps-service";
import {
  announcementSpeechOptions,
  commandMap,
  getCharacterCommandTargetForProfile,
  emojiSpeechOptions,
  getCharacterSelectionKeyboard,
  getGenderSelectionKeyboard,
  getPendingReviewKeyboard,
  getPlayerKeyboardForProfile,
  getSpeechOptionKeyboard,
  getTelegramControlKeyboard,
  getTelegramPlayerKeyboard,
  isReservedTelegramText,
  presetSpeechOptions,
  rpsMoveMap,
  weatherCommandMap,
  type TelegramReplyMarkup
} from "@/lib/platforms/telegram/ui";
import {
  getAdminOnlyMessage,
  getApplicationStateText,
  getApplicationStatusMessage,
  getBlockedApplicationMessage,
  getCharacterNotFoundMessage,
  getCharacterCatalogMessage,
  getCharacterSelectionPrompt,
  getCharacterSetMessage,
  getEnterGameMessage,
  getKeyboardSectionMessage,
  getKnowledgeSavedMessage,
  getManagerStateUpdatedMessage,
  getPendingApplicationAdminMessage,
  getPendingApplicationCardMessage,
  getPendingEmptyMessage,
  getPendingListIntro,
  getPlayerNotApprovedCharacterMessage,
  getPlayerNotApprovedStateMessage,
  getPlayerReviewNotification,
  getPlayerStateUpdatedMessage,
  getPlayerStateUpdateFailedMessage,
  getPlayerUnknownCommandMessage,
  getPlayersEmptyMessage,
  getPlayersListMessage,
  getReviewFailedMessage,
  getReviewResultMessage,
  getRpsAlreadyMovedMessage,
  getRpsAlreadyWaitingMessage,
  getRpsJoinedMessage,
  getRpsMoveSavedMessage,
  getRpsNoActiveMatchMessage,
  getRpsOpponentJoinedMessage,
  getRpsResultMessage,
  getRpsStartMessage,
  getRpsWaitingOpponentMessage,
  getSpeechAnnouncementPrompt,
  getSpeechClearedMessage,
  getSpeechControlsMessage,
  getSpeechEmojiPrompt,
  getSpeechNotApprovedMessage,
  getSpeechPresetPrompt,
  getSpeechPromptMessage,
  getSpeechSavedMessage,
  getUnknownCommandMessage,
  getWeatherChangedMessage,
  getWeatherStatusMessage,
  getManagerStatusMessage
} from "@/lib/platforms/telegram/messages";
import { formatActorStateSummary, formatTelegramHelp } from "@/lib/status/format";
import { getWeatherModeLabel, getWorldWeatherSettings, saveKnowledgeUrls, updateWorldWeatherMode } from "@/lib/game/world-service";
import type { PlayerApplication } from "@/types/application";
import type { ActorState } from "@/types/actor";
import type { TelegramSession } from "@/lib/firebase/telegram-session";

export type TelegramFlowDeps = {
  sendTelegramMessage: (chatId: number, text: string, replyMarkup?: TelegramReplyMarkup) => Promise<void>;
  getPlayerEntryUrl: (playerId: string) => string;
};

export type TelegramFlowContext = {
  text: string;
  userId: string;
  username?: string;
  displayName: string;
  chatId: number;
  isApprovedPlayer: boolean;
  application: PlayerApplication | null;
  playerProfile: ActorState | null;
  playerKeyboard: TelegramReplyMarkup;
  session: TelegramSession | null;
  deps: TelegramFlowDeps;
};

export async function handleTelegramPlayerFlow(ctx: TelegramFlowContext) {
  const { text, userId, username, displayName, chatId, application, isApprovedPlayer, playerProfile, playerKeyboard, session, deps } = ctx;

  if (text === "申請加入遊戲") {
    const result = await submitPlayerApplication({
      platform: "telegram",
      platformUserId: userId,
      platformUsername: username,
      displayName
    });

    if (!result.ok && result.reason === "blocked") {
      await deps.sendTelegramMessage(chatId, getBlockedApplicationMessage(), playerKeyboard);
      return { handled: true, response: NextResponse.json({ ok: false, error: "blocked" }, { status: 403 }) };
    }

    const statusMessage = getApplicationStatusMessage(result.reason as "approved" | "pending" | "submitted");
    await deps.sendTelegramMessage(chatId, statusMessage, getTelegramPlayerKeyboard(result.reason === "approved"));

    if (result.reason === "submitted") {
      const adminIds = (process.env.TELEGRAM_ADMIN_IDS ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value));

      await Promise.all(
        adminIds.map((adminId) =>
          deps.sendTelegramMessage(
            adminId,
            getPendingApplicationAdminMessage({
              displayName: displayName || username || `Player-${userId.slice(-4)}`,
              username,
              userId,
              createdAtLabel: new Date().toLocaleString("zh-Hant-TW", { timeZone: "Asia/Taipei" })
            }),
            getPendingReviewKeyboard(userId)
          )
        )
      );
    }

    return { handled: true, response: NextResponse.json({ ok: true, action: "apply", result }) };
  }

  if (text === "查看申請狀態") {
    const statusText = application ? getApplicationStateText(getApplicationStatusLabel(application.status)) : "你目前還沒有送出申請。";
    await deps.sendTelegramMessage(chatId, statusText, playerKeyboard);
    return { handled: true, response: NextResponse.json({ ok: true, action: "application_status" }) };
  }

  if (text === "進入遊戲") {
    const message = getEnterGameMessage(deps.getPlayerEntryUrl(userId), application?.status === "approved");
    await deps.sendTelegramMessage(chatId, message, playerKeyboard);
    return { handled: true, response: NextResponse.json({ ok: true, action: "enter_game" }) };
  }

  if (text === "選男性角色" || text === "選女性角色") {
    if (application?.status !== "approved") {
      await deps.sendTelegramMessage(chatId, getPlayerNotApprovedCharacterMessage(), playerKeyboard);
      return { handled: true, response: NextResponse.json({ ok: false, error: "not_approved" }, { status: 403 }) };
    }

    const gender = text === "選男性角色" ? "male" : "female";
    await deps.sendTelegramMessage(chatId, getCharacterSelectionPrompt(gender), getCharacterSelectionKeyboard(gender));
    return { handled: true, response: NextResponse.json({ ok: true, action: "choose_gender", gender }) };
  }

  const characterPick = text.match(/^角色\s+(.+)$/);
  if (characterPick) {
    if (application?.status !== "approved") {
      await deps.sendTelegramMessage(chatId, getPlayerNotApprovedCharacterMessage(), playerKeyboard);
      return { handled: true, response: NextResponse.json({ ok: false, error: "not_approved" }, { status: 403 }) };
    }

    const pickedLabel = characterPick[1].trim();
    const pickedGender = (["male", "female"] as const).find((gender) => characterCatalog[gender].some((item) => item.label === pickedLabel));

    if (!pickedGender) {
      await deps.sendTelegramMessage(chatId, getCharacterNotFoundMessage(), getGenderSelectionKeyboard());
      return { handled: true, response: NextResponse.json({ ok: false, error: "character_not_found" }, { status: 404 }) };
    }

    const pickedCharacter = characterCatalog[pickedGender].find((item: { id: string; label: string }) => item.label === pickedLabel);
    if (!pickedCharacter) {
      await deps.sendTelegramMessage(chatId, getCharacterNotFoundMessage(), getGenderSelectionKeyboard());
      return { handled: true, response: NextResponse.json({ ok: false, error: "character_not_found" }, { status: 404 }) };
    }

    await updatePlayerCharacter(userId, pickedGender, pickedCharacter.id, `telegram:${userId}`);
    await deps.sendTelegramMessage(
      chatId,
      getCharacterSetMessage(pickedCharacter.label),
      getPlayerKeyboardForProfile(true, { characterGender: pickedGender, characterId: pickedCharacter.id })
    );
    return {
      handled: true,
      response: NextResponse.json({ ok: true, action: "pick_character", gender: pickedGender, characterId: pickedCharacter.id })
    };
  }

  if (text === "對話控制") {
    await deps.sendTelegramMessage(chatId, getSpeechControlsMessage(), playerKeyboard);
    return { handled: true, response: NextResponse.json({ ok: true, action: "speech_controls" }) };
  }

  if (text === "說話") {
    if (!isApprovedPlayer) {
      await deps.sendTelegramMessage(chatId, getSpeechNotApprovedMessage(), playerKeyboard);
      return { handled: true, response: NextResponse.json({ ok: false, error: "not_approved" }, { status: 403 }) };
    }

    await setTelegramPendingAction(userId, "speech_custom");
    await deps.sendTelegramMessage(chatId, getSpeechPromptMessage(), playerKeyboard);
    return { handled: true, response: NextResponse.json({ ok: true, action: "speech_prompt" }) };
  }

  if (text === "刪除對話") {
    if (!isApprovedPlayer) {
      await deps.sendTelegramMessage(chatId, getSpeechNotApprovedMessage(), playerKeyboard);
      return { handled: true, response: NextResponse.json({ ok: false, error: "not_approved" }, { status: 403 }) };
    }

    await clearTelegramPendingAction(userId);
    await clearSpeechForTarget(userId, false, `telegram:${userId}`);
    await deps.sendTelegramMessage(chatId, getSpeechClearedMessage(), playerKeyboard);
    return { handled: true, response: NextResponse.json({ ok: true, action: "speech_clear" }) };
  }

  if (text === "預設台詞") {
    if (!isApprovedPlayer) {
      await deps.sendTelegramMessage(chatId, getSpeechNotApprovedMessage(), playerKeyboard);
      return { handled: true, response: NextResponse.json({ ok: false, error: "not_approved" }, { status: 403 }) };
    }
    await deps.sendTelegramMessage(chatId, getSpeechPresetPrompt(), getSpeechOptionKeyboard(presetSpeechOptions));
    return { handled: true, response: NextResponse.json({ ok: true, action: "speech_preset_menu" }) };
  }

  if (text === "表情符號") {
    if (!isApprovedPlayer) {
      await deps.sendTelegramMessage(chatId, getSpeechNotApprovedMessage(), playerKeyboard);
      return { handled: true, response: NextResponse.json({ ok: false, error: "not_approved" }, { status: 403 }) };
    }
    await deps.sendTelegramMessage(chatId, getSpeechEmojiPrompt(), getSpeechOptionKeyboard(emojiSpeechOptions));
    return { handled: true, response: NextResponse.json({ ok: true, action: "speech_emoji_menu" }) };
  }

  if (text === "短暫公告") {
    if (!isApprovedPlayer) {
      await deps.sendTelegramMessage(chatId, getSpeechNotApprovedMessage(), playerKeyboard);
      return { handled: true, response: NextResponse.json({ ok: false, error: "not_approved" }, { status: 403 }) };
    }
    await deps.sendTelegramMessage(chatId, getSpeechAnnouncementPrompt(), getSpeechOptionKeyboard(announcementSpeechOptions));
    return { handled: true, response: NextResponse.json({ ok: true, action: "speech_announcement_menu" }) };
  }

  if (presetSpeechOptions.includes(text as (typeof presetSpeechOptions)[number])) {
    await clearTelegramPendingAction(userId);
    await saveSpeechForTarget(userId, false, text, "preset", `telegram:${userId}`);
    await deps.sendTelegramMessage(chatId, getSpeechSavedMessage("preset", text), playerKeyboard);
    return { handled: true, response: NextResponse.json({ ok: true, action: "speech_preset_saved" }) };
  }

  if (emojiSpeechOptions.includes(text as (typeof emojiSpeechOptions)[number])) {
    await clearTelegramPendingAction(userId);
    await saveSpeechForTarget(userId, false, text, "emoji", `telegram:${userId}`);
    await deps.sendTelegramMessage(chatId, getSpeechSavedMessage("emoji", text), playerKeyboard);
    return { handled: true, response: NextResponse.json({ ok: true, action: "speech_emoji_saved" }) };
  }

  if (announcementSpeechOptions.includes(text as (typeof announcementSpeechOptions)[number])) {
    await clearTelegramPendingAction(userId);
    await saveSpeechForTarget(userId, false, text, "announcement", `telegram:${userId}`);
    await deps.sendTelegramMessage(chatId, getSpeechSavedMessage("announcement", text), playerKeyboard);
    return { handled: true, response: NextResponse.json({ ok: true, action: "speech_announcement_saved" }) };
  }

  if (session?.pendingAction === "speech_custom" && !isReservedTelegramText(text)) {
    const nextSpeech = text.slice(0, 30);
    await clearTelegramPendingAction(userId);
    await saveSpeechForTarget(userId, false, nextSpeech, "custom", `telegram:${userId}`);
    await deps.sendTelegramMessage(chatId, getSpeechSavedMessage("custom", nextSpeech), playerKeyboard);
    return { handled: true, response: NextResponse.json({ ok: true, action: "speech_custom_saved" }) };
  }

  if (text === "猜拳") {
    if (!isApprovedPlayer) {
      await deps.sendTelegramMessage(chatId, getPlayerNotApprovedStateMessage(), playerKeyboard);
      return { handled: true, response: NextResponse.json({ ok: false, error: "not_approved" }, { status: 403 }) };
    }

    const result = await startOrJoinRpsMatch(userId);
    if (!result.ok) {
      await deps.sendTelegramMessage(chatId, getPlayerStateUpdateFailedMessage(), playerKeyboard);
      return { handled: true, response: NextResponse.json({ ok: false, error: result.reason }, { status: 500 }) };
    }

    if (result.action === "created") {
      await deps.sendTelegramMessage(chatId, getRpsStartMessage(), playerKeyboard);
    } else if (result.action === "waiting") {
      await deps.sendTelegramMessage(chatId, getRpsAlreadyWaitingMessage(), playerKeyboard);
    } else {
      await deps.sendTelegramMessage(chatId, getRpsJoinedMessage(result.opponent?.name ?? "對手"), playerKeyboard);

      if (result.opponent?.platform === "telegram") {
        const opponentProfile = await getApprovedPlayerProfile(result.opponent.playerId);
        await deps.sendTelegramMessage(
          Number(result.opponent.platformUserId),
          getRpsOpponentJoinedMessage(result.participant.name),
          getPlayerKeyboardForProfile(true, opponentProfile)
        );
      }
    }

    return { handled: true, response: NextResponse.json({ ok: true, action: "rps_start", result }) };
  }

  const rpsMove = rpsMoveMap[text];
  if (rpsMove) {
    if (!isApprovedPlayer) {
      await deps.sendTelegramMessage(chatId, getPlayerNotApprovedStateMessage(), playerKeyboard);
      return { handled: true, response: NextResponse.json({ ok: false, error: "not_approved" }, { status: 403 }) };
    }

    const result = await submitRpsMove(userId, rpsMove);
    if (!result.ok) {
      const message =
        result.reason === "waiting_for_opponent"
          ? getRpsWaitingOpponentMessage()
          : result.reason === "move_already_submitted"
            ? getRpsAlreadyMovedMessage()
            : getRpsNoActiveMatchMessage();
      await deps.sendTelegramMessage(chatId, message, playerKeyboard);
      return { handled: true, response: NextResponse.json({ ok: false, action: "rps_move_rejected", reason: result.reason }) };
    }

    if (result.action === "move_saved") {
      await deps.sendTelegramMessage(chatId, getRpsMoveSavedMessage(result.move), playerKeyboard);
      return { handled: true, response: NextResponse.json({ ok: true, action: "rps_move_saved" }) };
    }

    if (result.event) {
      await Promise.all(
        result.event.players
          .filter((player) => player.platform === "telegram")
          .map(async (player) => {
            const profile = await getApprovedPlayerProfile(player.playerId);
            await deps.sendTelegramMessage(Number(player.platformUserId), getRpsResultMessage(result.event!, player.playerId), getPlayerKeyboardForProfile(true, profile));
          })
      );
    }

    return { handled: true, response: NextResponse.json({ ok: true, action: "rps_resolved", event: result.event }) };
  }

  const profileCommand = getCharacterCommandTargetForProfile(text, playerProfile);
  const command = profileCommand ?? commandMap[text];

  if (!command) {
    await deps.sendTelegramMessage(chatId, getPlayerUnknownCommandMessage(), playerKeyboard);
    return { handled: true, response: NextResponse.json({ ok: true, ignored: true }) };
  }

  if (!isApprovedPlayer) {
    await deps.sendTelegramMessage(chatId, getPlayerNotApprovedStateMessage(), playerKeyboard);
    return { handled: true, response: NextResponse.json({ ok: false, error: "Unauthorized telegram user." }, { status: 403 }) };
  }

  const result = await updateApprovedPlayerStatus(userId, command.status, `telegram:${userId}`, command.homeMode, command.poseKey);
  if (!result.ok) {
    await deps.sendTelegramMessage(chatId, getPlayerStateUpdateFailedMessage(), playerKeyboard);
    return { handled: true, response: NextResponse.json({ ok: false, error: result.reason }, { status: 500 }) };
  }

  await deps.sendTelegramMessage(chatId, getPlayerStateUpdatedMessage(result.state), playerKeyboard);
  return {
    handled: true,
    response: NextResponse.json({
      ok: true,
      message: `Player state updated to ${result.state.status}`,
      state: result.state
    })
  };
}

export async function handleTelegramAdminFlow(
  text: string,
  chatId: number,
  userId: string,
  session: TelegramSession | null,
  deps: TelegramFlowDeps
) {
  if (text === "/status" || text === "查看狀態") {
    const result = await getActorState();
    const weatherSettings = await getWorldWeatherSettings();
    await deps.sendTelegramMessage(chatId, getManagerStatusMessage(formatActorStateSummary(result), getWeatherModeLabel(weatherSettings.mode)), getTelegramControlKeyboard());
    return { handled: true, response: NextResponse.json({ ok: true, action: "status", state: result }) };
  }

  if (text === "角色狀態" || text === "天氣控制" || text === "遊戲控制") {
    await deps.sendTelegramMessage(chatId, getKeyboardSectionMessage(), getTelegramControlKeyboard());
    return { handled: true, response: NextResponse.json({ ok: true, action: "keyboard_section" }) };
  }

  if (text === "猜拳") {
    const managerParticipant = buildTelegramManagerRpsParticipant(userId);
    const result = await startOrJoinRpsMatch(userId, managerParticipant);
    const managerKeyboard = getTelegramControlKeyboard();

    if (!result.ok) {
      await deps.sendTelegramMessage(chatId, getPlayerStateUpdateFailedMessage(), managerKeyboard);
      return { handled: true, response: NextResponse.json({ ok: false, error: result.reason }, { status: 500 }) };
    }

    if (result.action === "created") {
      await deps.sendTelegramMessage(chatId, getRpsStartMessage(), managerKeyboard);
    } else if (result.action === "waiting") {
      await deps.sendTelegramMessage(chatId, getRpsAlreadyWaitingMessage(), managerKeyboard);
    } else {
      await deps.sendTelegramMessage(chatId, getRpsJoinedMessage(result.opponent?.name ?? "對手"), managerKeyboard);

      if (result.opponent?.platform === "telegram") {
        const opponentProfile = await getApprovedPlayerProfile(result.opponent.playerId);
        await deps.sendTelegramMessage(
          Number(result.opponent.platformUserId),
          getRpsOpponentJoinedMessage(result.participant.name),
          result.opponent.playerId === userId ? managerKeyboard : getPlayerKeyboardForProfile(true, opponentProfile)
        );
      }
    }

    return { handled: true, response: NextResponse.json({ ok: true, action: "manager_rps_start", result }) };
  }

  const managerRpsMove = rpsMoveMap[text];
  if (managerRpsMove) {
    const result = await submitRpsMove(userId, managerRpsMove, buildTelegramManagerRpsParticipant(userId));
    const managerKeyboard = getTelegramControlKeyboard();

    if (!result.ok) {
      const message =
        result.reason === "waiting_for_opponent"
          ? getRpsWaitingOpponentMessage()
          : result.reason === "move_already_submitted"
            ? getRpsAlreadyMovedMessage()
            : getRpsNoActiveMatchMessage();
      await deps.sendTelegramMessage(chatId, message, managerKeyboard);
      return { handled: true, response: NextResponse.json({ ok: false, action: "manager_rps_move_rejected", reason: result.reason }) };
    }

    if (result.action === "move_saved") {
      await deps.sendTelegramMessage(chatId, getRpsMoveSavedMessage(result.move), managerKeyboard);
      return { handled: true, response: NextResponse.json({ ok: true, action: "manager_rps_move_saved" }) };
    }

    if (result.event) {
      await Promise.all(
        result.event.players
          .filter((player) => player.platform === "telegram")
          .map(async (player) => {
            const profile = await getApprovedPlayerProfile(player.playerId);
            await deps.sendTelegramMessage(
              Number(player.platformUserId),
              getRpsResultMessage(result.event!, player.playerId),
              player.playerId === userId ? managerKeyboard : getPlayerKeyboardForProfile(true, profile)
            );
          })
      );
    }

    return { handled: true, response: NextResponse.json({ ok: true, action: "manager_rps_resolved", event: result.event }) };
  }

  if (text === "對話控制") {
    await deps.sendTelegramMessage(chatId, getSpeechControlsMessage(), getTelegramControlKeyboard());
    return { handled: true, response: NextResponse.json({ ok: true, action: "manager_speech_controls" }) };
  }

  if (text === "說話") {
    await setTelegramPendingAction(userId, "speech_custom");
    await deps.sendTelegramMessage(chatId, getSpeechPromptMessage(), getTelegramControlKeyboard());
    return { handled: true, response: NextResponse.json({ ok: true, action: "manager_speech_prompt" }) };
  }

  if (text === "刪除對話") {
    await clearTelegramPendingAction(userId);
    await clearSpeechForTarget(userId, true, `telegram:${userId}`);
    await deps.sendTelegramMessage(chatId, getSpeechClearedMessage(), getTelegramControlKeyboard());
    return { handled: true, response: NextResponse.json({ ok: true, action: "manager_speech_clear" }) };
  }

  if (text === "預設台詞") {
    await deps.sendTelegramMessage(chatId, getSpeechPresetPrompt(), getSpeechOptionKeyboard(presetSpeechOptions));
    return { handled: true, response: NextResponse.json({ ok: true, action: "manager_speech_preset_menu" }) };
  }

  if (text === "表情符號") {
    await deps.sendTelegramMessage(chatId, getSpeechEmojiPrompt(), getSpeechOptionKeyboard(emojiSpeechOptions));
    return { handled: true, response: NextResponse.json({ ok: true, action: "manager_speech_emoji_menu" }) };
  }

  if (text === "短暫公告") {
    await deps.sendTelegramMessage(chatId, getSpeechAnnouncementPrompt(), getSpeechOptionKeyboard(announcementSpeechOptions));
    return { handled: true, response: NextResponse.json({ ok: true, action: "manager_speech_announcement_menu" }) };
  }

  if (presetSpeechOptions.includes(text as (typeof presetSpeechOptions)[number])) {
    await clearTelegramPendingAction(userId);
    await saveSpeechForTarget(userId, true, text, "preset", `telegram:${userId}`);
    await deps.sendTelegramMessage(chatId, getSpeechSavedMessage("preset", text), getTelegramControlKeyboard());
    return { handled: true, response: NextResponse.json({ ok: true, action: "manager_speech_preset_saved" }) };
  }

  if (emojiSpeechOptions.includes(text as (typeof emojiSpeechOptions)[number])) {
    await clearTelegramPendingAction(userId);
    await saveSpeechForTarget(userId, true, text, "emoji", `telegram:${userId}`);
    await deps.sendTelegramMessage(chatId, getSpeechSavedMessage("emoji", text), getTelegramControlKeyboard());
    return { handled: true, response: NextResponse.json({ ok: true, action: "manager_speech_emoji_saved" }) };
  }

  if (announcementSpeechOptions.includes(text as (typeof announcementSpeechOptions)[number])) {
    await clearTelegramPendingAction(userId);
    await saveSpeechForTarget(userId, true, text, "announcement", `telegram:${userId}`);
    await deps.sendTelegramMessage(chatId, getSpeechSavedMessage("announcement", text), getTelegramControlKeyboard());
    return { handled: true, response: NextResponse.json({ ok: true, action: "manager_speech_announcement_saved" }) };
  }

  if (session?.pendingAction === "speech_custom" && !isReservedTelegramText(text)) {
    const nextSpeech = text.slice(0, 30);
    await clearTelegramPendingAction(userId);
    await saveSpeechForTarget(userId, true, nextSpeech, "custom", `telegram:${userId}`);
    await deps.sendTelegramMessage(chatId, getSpeechSavedMessage("custom", nextSpeech), getTelegramControlKeyboard());
    return { handled: true, response: NextResponse.json({ ok: true, action: "manager_speech_custom_saved" }) };
  }

  if (text === "待審核玩家" || text === "/pendingplayers") {
    const pending = await listPendingApplications();
    if (pending.length === 0) {
      await deps.sendTelegramMessage(chatId, getPendingEmptyMessage(), getTelegramControlKeyboard());
      return { handled: true, response: NextResponse.json({ ok: true, action: "pending_empty" }) };
    }

    await deps.sendTelegramMessage(chatId, getPendingListIntro(pending.length), getTelegramControlKeyboard());
    await Promise.all(
      pending.map((item) => deps.sendTelegramMessage(chatId, getPendingApplicationCardMessage(item), getPendingReviewKeyboard(item.telegramUserId)))
    );

    return { handled: true, response: NextResponse.json({ ok: true, action: "pending_list", count: pending.length }) };
  }

  if (text === "角色樣式列表" || text === "/characters") {
    await deps.sendTelegramMessage(chatId, getCharacterCatalogMessage(), getTelegramControlKeyboard());
    return { handled: true, response: NextResponse.json({ ok: true, action: "character_catalog" }) };
  }

  if (text === "玩家列表" || text === "/players") {
    const players = await listAllPlayers();
    if (players.length === 0) {
      await deps.sendTelegramMessage(chatId, getPlayersEmptyMessage(), getTelegramControlKeyboard());
      return { handled: true, response: NextResponse.json({ ok: true, action: "players_empty" }) };
    }

    await deps.sendTelegramMessage(chatId, getPlayersListMessage(players), getTelegramControlKeyboard());
    return { handled: true, response: NextResponse.json({ ok: true, action: "players_list", count: players.length }) };
  }

  const reviewMatch = text.match(/^(通過|拒絕|封鎖)\s+(\d+)$/);
  if (reviewMatch) {
    const [, actionText, targetUserId] = reviewMatch;
    const mappedStatus = actionText === "通過" ? "approved" : actionText === "拒絕" ? "rejected" : "blocked";
    const result = await reviewPlayerApplication(targetUserId, mappedStatus, `telegram:${userId}`);

    if (!result.ok) {
      await deps.sendTelegramMessage(chatId, getReviewFailedMessage(), getTelegramControlKeyboard());
      return { handled: true, response: NextResponse.json({ ok: false, error: result.reason }, { status: 400 }) };
    }

    await deps.sendTelegramMessage(chatId, getReviewResultMessage(targetUserId, actionText, result.playerLobbyStatus), getTelegramControlKeyboard());
    await deps.sendTelegramMessage(
      Number(targetUserId),
      getPlayerReviewNotification(actionText, targetUserId, result.playerLobbyStatus),
      actionText === "通過" ? getGenderSelectionKeyboard() : getTelegramPlayerKeyboard()
    );

    return { handled: true, response: NextResponse.json({ ok: true, action: "review", result }) };
  }

  if (text === "/weatherstatus" || text === "目前天氣模式") {
    const weatherSettings = await getWorldWeatherSettings();
    await deps.sendTelegramMessage(chatId, getWeatherStatusMessage(getWeatherModeLabel(weatherSettings.mode)), getTelegramControlKeyboard());
    return { handled: true, response: NextResponse.json({ ok: true, action: "weather_status", settings: weatherSettings }) };
  }

  const urls = Array.from(new Set(text.match(/https?:\/\/[^\s]+/g) ?? [])).map((value) => value.replace(/[),.;!?]+$/, ""));
  if (urls.length > 0) {
    const savedItems = await saveKnowledgeUrls(urls, `telegram:${userId}`);
    await deps.sendTelegramMessage(chatId, getKnowledgeSavedMessage(savedItems), getTelegramControlKeyboard());
    return { handled: true, response: NextResponse.json({ ok: true, action: "knowledge_saved", count: savedItems.length }) };
  }

  if (!(text in commandMap)) {
    if (text in weatherCommandMap) {
      const settings = await updateWorldWeatherMode(weatherCommandMap[text].mode, `telegram:${userId}`);
      await deps.sendTelegramMessage(chatId, getWeatherChangedMessage(getWeatherModeLabel(settings.mode)), getTelegramControlKeyboard());
      return { handled: true, response: NextResponse.json({ ok: true, action: "weather", settings }) };
    }

    await deps.sendTelegramMessage(chatId, getUnknownCommandMessage(formatTelegramHelp()), getTelegramControlKeyboard());
    return { handled: true, response: NextResponse.json({ ok: true, ignored: true }) };
  }

  const command = commandMap[text];
  const result = await saveActorState(command.status, `telegram:${userId}`, command.homeMode);
  await deps.sendTelegramMessage(chatId, getManagerStateUpdatedMessage(result), getTelegramControlKeyboard());
  return {
    handled: true,
    response: NextResponse.json({
      ok: true,
      message: `State updated to ${result.state.status}`,
      ...result
    })
  };
}
