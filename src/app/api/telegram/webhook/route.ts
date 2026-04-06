import { NextResponse } from "next/server";

import { getActorState, saveActorState } from "@/lib/firebase/actors";
import { saveKnowledgeUrl } from "@/lib/firebase/knowledge";
import { getWeatherSettings, saveWeatherSettings } from "@/lib/firebase/weather";
import { formatActorStateSummary, formatTelegramHelp, getAtHomeModeLabel, getStatusLabel } from "@/lib/status/format";
import type { ActorStatus, AtHomeMode } from "@/types/actor";
import type { WeatherMode } from "@/types/weather";

type TelegramUpdate = {
  message?: {
    message_id?: number;
    text?: string;
    chat?: {
      id?: number;
    };
    from?: {
      id?: number;
    };
  };
};

type TelegramReplyMarkup = {
  keyboard: Array<Array<{ text: string }>>;
  resize_keyboard: boolean;
  persistent?: boolean;
};

type CommandTarget = {
  status: ActorStatus;
  homeMode?: AtHomeMode;
};

type WeatherCommandTarget = {
  mode: WeatherMode;
};

const commandMap: Record<string, CommandTarget> = {
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
  "在家讀書": { status: "at_home", homeMode: "reading" }
};

const weatherCommandMap: Record<string, WeatherCommandTarget> = {
  "/weatherauto": { mode: "auto" },
  "自動天氣": { mode: "auto" },
  "/weatherrain": { mode: "rain" },
  "手動雨天": { mode: "rain" }
};

function getTelegramControlKeyboard(): TelegramReplyMarkup {
  return {
    keyboard: [
      [{ text: "/status" }, { text: "/help" }],
      [{ text: "角色狀態" }],
      [{ text: "工作中" }, { text: "回家中" }, { text: "騎車中" }],
      [{ text: "打掃中" }, { text: "睡覺中" }, { text: "在家" }],
      [{ text: "在家打電動" }, { text: "在家追劇" }, { text: "在家讀書" }],
      [{ text: "天氣控制" }],
      [{ text: "目前天氣模式" }, { text: "自動天氣" }, { text: "手動雨天" }]
    ],
    resize_keyboard: true,
    persistent: true
  };
}

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

function extractUrls(text: string) {
  return Array.from(new Set(text.match(/https?:\/\/[^\s]+/g) ?? [])).map((value) => value.replace(/[),.;!?]+$/, ""));
}

export async function POST(request: Request) {
  const body = (await request.json()) as TelegramUpdate;
  const text = body.message?.text?.trim();
  const userId = body.message?.from?.id;
  const chatId = body.message?.chat?.id;

  if (!text || !chatId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  if (text === "/start" || text === "/help") {
    if (!isAuthorizedUser(userId)) {
      await sendTelegramMessage(chatId, "你目前不在允許的管理者名單中。");
      return NextResponse.json({ ok: false, error: "Unauthorized telegram user." }, { status: 403 });
    }

    await sendTelegramMessage(chatId, formatTelegramHelp(), getTelegramControlKeyboard());
    return NextResponse.json({ ok: true, action: "help" });
  }

  if (text === "/status" || text === "查看狀態") {
    if (!isAuthorizedUser(userId)) {
      await sendTelegramMessage(chatId, "你目前不在允許的管理者名單中。");
      return NextResponse.json({ ok: false, error: "Unauthorized telegram user." }, { status: 403 });
    }

    const result = await getActorState();
    const weatherSettings = await getWeatherSettings();
    await sendTelegramMessage(
      chatId,
      [formatActorStateSummary(result), `天氣模式：${weatherSettings.mode === "rain" ? "手動雨天" : "自動依台中天氣"}`].join("\n"),
      getTelegramControlKeyboard()
    );
    return NextResponse.json({ ok: true, action: "status", state: result });
  }

  if (text === "角色狀態" || text === "天氣控制") {
    if (!isAuthorizedUser(userId)) {
      await sendTelegramMessage(chatId, "你目前不在允許的管理者名單中。");
      return NextResponse.json({ ok: false, error: "Unauthorized telegram user." }, { status: 403 });
    }

    await sendTelegramMessage(chatId, "請直接點選下方對應區塊的按鈕。", getTelegramControlKeyboard());
    return NextResponse.json({ ok: true, action: "keyboard_section" });
  }

  if (text === "/weatherstatus" || text === "目前天氣模式") {
    if (!isAuthorizedUser(userId)) {
      await sendTelegramMessage(chatId, "你目前不在允許的管理者名單中。");
      return NextResponse.json({ ok: false, error: "Unauthorized telegram user." }, { status: 403 });
    }

    const weatherSettings = await getWeatherSettings();
    await sendTelegramMessage(
      chatId,
      `目前天氣模式：${weatherSettings.mode === "rain" ? "手動雨天" : "自動依台中天氣"}`,
      getTelegramControlKeyboard()
    );
    return NextResponse.json({ ok: true, action: "weather_status", settings: weatherSettings });
  }

  const urls = extractUrls(text);
  if (urls.length > 0) {
    if (!isAuthorizedUser(userId)) {
      await sendTelegramMessage(chatId, "你目前不在允許的管理者名單中。");
      return NextResponse.json({ ok: false, error: "Unauthorized telegram user." }, { status: 403 });
    }

    const savedItems = (await Promise.all(urls.map((url) => saveKnowledgeUrl(url, `telegram:${userId}`)))).filter(Boolean);
    await sendTelegramMessage(
      chatId,
      [
        `已收錄 ${savedItems.length} 筆知識連結。`,
        ...savedItems.map((item, index) => `${index + 1}. ${item?.title ?? item?.url}`)
      ].join("\n"),
      getTelegramControlKeyboard()
    );

    return NextResponse.json({ ok: true, action: "knowledge_saved", count: savedItems.length });
  }

  if (!(text in commandMap)) {
    if (text in weatherCommandMap) {
      if (!isAuthorizedUser(userId)) {
        await sendTelegramMessage(chatId, "你目前不在允許的管理者名單中。");
        return NextResponse.json({ ok: false, error: "Unauthorized telegram user." }, { status: 403 });
      }

      const settings = await saveWeatherSettings(weatherCommandMap[text].mode, `telegram:${userId}`);
      await sendTelegramMessage(
        chatId,
        `已切換天氣模式為：${settings.mode === "rain" ? "手動雨天" : "自動依台中天氣"}`,
        getTelegramControlKeyboard()
      );

      return NextResponse.json({ ok: true, action: "weather", settings });
    }

    if (isAuthorizedUser(userId)) {
      await sendTelegramMessage(chatId, `未識別指令。\n\n${formatTelegramHelp()}`, getTelegramControlKeyboard());
    }
    return NextResponse.json({ ok: true, ignored: true });
  }

  if (!isAuthorizedUser(userId)) {
    await sendTelegramMessage(chatId, "你目前不在允許的管理者名單中。");
    return NextResponse.json({ ok: false, error: "Unauthorized telegram user." }, { status: 403 });
  }

  const command = commandMap[text];
  const result = await saveActorState(command.status, `telegram:${userId}`, command.homeMode);
  await sendTelegramMessage(
    chatId,
    [
      `已切換為：${getStatusLabel(result.state.status)}${result.state.status === "at_home" ? ` (${getAtHomeModeLabel(result.state.homeMode)})` : ""}`,
      result.source === "firebase" ? "已同步到 Firebase。" : `未寫入 Firebase：${result.error ?? "unknown error"}`,
      "",
      formatActorStateSummary(result.state)
    ].join("\n"),
    getTelegramControlKeyboard()
  );

  return NextResponse.json({
    ok: true,
    message: `State updated to ${result.state.status}`,
    ...result
  });
}
