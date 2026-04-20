import { NextResponse } from "next/server";

import { getApprovedPlayerProfile, getPlayerApplication } from "@/lib/game/player-service";
import { handleTelegramAdminFlow, handleTelegramPlayerFlow } from "@/lib/platforms/telegram/flows";
import {
  getPlayerKeyboardForProfile,
  getTelegramAdminPreviewKeyboard,
  getTelegramControlKeyboard,
  getTelegramPlayerKeyboard,
  type TelegramReplyMarkup
} from "@/lib/platforms/telegram/ui";
import { formatTelegramHelp, formatTelegramPlayerHelp } from "@/lib/status/format";
import { getTelegramSession } from "@/lib/firebase/telegram-session";

type TelegramUpdate = {
  message?: {
    text?: string;
    chat?: {
      id?: number;
    };
    from?: {
      id?: number;
      username?: string;
      first_name?: string;
      last_name?: string;
    };
  };
};

async function sendTelegramMessage(chatId: number, text: string, replyMarkup?: TelegramReplyMarkup) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return;
  }

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      ...(replyMarkup ? { reply_markup: replyMarkup } : {})
    })
  });
}

function isAuthorizedUser(userId: number | undefined) {
  const allowed = process.env.TELEGRAM_ADMIN_IDS;
  if (!allowed || !userId) {
    return false;
  }

  return allowed
    .split(",")
    .map((value) => value.trim())
    .includes(String(userId));
}

function getPlayerEntryUrl(playerId: string) {
  return `https://funyweb.netlify.app/player/${playerId}`;
}

export async function POST(request: Request) {
  const body = (await request.json()) as TelegramUpdate;
  const text = body.message?.text?.trim();
  const userId = body.message?.from?.id;
  const username = body.message?.from?.username;
  const displayName = [body.message?.from?.first_name, body.message?.from?.last_name].filter(Boolean).join(" ");
  const chatId = body.message?.chat?.id;
  const isAdmin = isAuthorizedUser(userId);

  if (!text || !chatId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const normalizedUserId = String(userId ?? "");
  const application = userId ? await getPlayerApplication(normalizedUserId) : null;
  const isApprovedPlayer = application?.status === "approved";
  const playerProfile = userId && isApprovedPlayer ? await getApprovedPlayerProfile(normalizedUserId) : null;
  const playerKeyboard = getPlayerKeyboardForProfile(isApprovedPlayer, playerProfile);
  const session = userId ? await getTelegramSession(normalizedUserId) : null;

  if (text === "/start" || text === "/help") {
    if (!isAdmin) {
      await sendTelegramMessage(chatId, formatTelegramPlayerHelp(), playerKeyboard);
      return NextResponse.json({ ok: true, action: "player_help" });
    }

    await sendTelegramMessage(chatId, formatTelegramHelp(), getTelegramControlKeyboard());
    return NextResponse.json({ ok: true, action: "help" });
  }

  if (text === "/playerview") {
    if (!isAdmin) {
      await sendTelegramMessage(chatId, "這個指令只提供管理者預覽玩家端畫面。", playerKeyboard);
      return NextResponse.json({ ok: false, error: "Unauthorized telegram user." }, { status: 403 });
    }

    await sendTelegramMessage(chatId, formatTelegramPlayerHelp(), getTelegramAdminPreviewKeyboard());
    return NextResponse.json({ ok: true, action: "player_view_preview" });
  }

  if (text === "/adminview" || text === "切回管理者畫面") {
    if (!isAdmin) {
      await sendTelegramMessage(chatId, "這個指令只提供管理者切回控制面板。", getTelegramPlayerKeyboard());
      return NextResponse.json({ ok: false, error: "Unauthorized telegram user." }, { status: 403 });
    }

    await sendTelegramMessage(chatId, formatTelegramHelp(), getTelegramControlKeyboard());
    return NextResponse.json({ ok: true, action: "admin_view_preview" });
  }

  if (!userId) {
    return NextResponse.json({ ok: false, error: "Missing telegram user id." }, { status: 400 });
  }

  const deps = {
    sendTelegramMessage,
    getPlayerEntryUrl
  };

  if (isAdmin) {
    const result = await handleTelegramAdminFlow(text, chatId, normalizedUserId, session, deps);
    return result.response;
  }

  const result = await handleTelegramPlayerFlow({
    text,
    userId: normalizedUserId,
    username,
    displayName,
    chatId,
    isApprovedPlayer,
    application,
    playerProfile,
    playerKeyboard,
    session,
    deps
  });

  return result.response;
}
