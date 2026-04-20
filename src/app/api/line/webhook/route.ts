import { NextResponse } from "next/server";

import { handleLineFlow } from "@/lib/platforms/line/flows";
import { getLineWebhookReadyMessage } from "@/lib/platforms/line/messages";

type LineWebhookBody = {
  events?: Array<{
    type?: string;
    source?: {
      userId?: string;
    };
    message?: {
      type?: string;
      text?: string;
    };
  }>;
};

function isLineAdmin(userId: string | undefined) {
  const allowed = process.env.LINE_ADMIN_IDS;
  if (!allowed || !userId) {
    return false;
  }

  return allowed
    .split(",")
    .map((value) => value.trim())
    .includes(userId);
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: getLineWebhookReadyMessage(),
    ready: false
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as LineWebhookBody;
  const event = body.events?.[0];
  const text = event?.message?.type === "text" ? event.message.text?.trim() ?? "" : "";
  const userId = event?.source?.userId;

  if (!text) {
    return NextResponse.json({
      ok: true,
      ignored: true,
      message: getLineWebhookReadyMessage()
    });
  }

  const result = handleLineFlow({
    text,
    isAdmin: isLineAdmin(userId)
  });

  return NextResponse.json({
    ok: true,
    ready: false,
    ...result
  });
}
