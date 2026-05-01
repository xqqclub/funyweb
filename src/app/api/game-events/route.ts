import { NextResponse } from "next/server";

import { listRecentGameEvents } from "@/lib/game/rps-service";

export async function GET() {
  const events = await listRecentGameEvents(5);
  return NextResponse.json({ ok: true, events });
}
