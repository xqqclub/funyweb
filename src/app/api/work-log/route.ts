import { NextResponse } from "next/server";

import { listWorkLogs } from "@/lib/firebase/work-log";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetId = searchParams.get("targetId")?.trim();
  const page = Number(searchParams.get("page") ?? "1");

  if (!targetId) {
    return NextResponse.json({ ok: false, error: "Missing targetId" }, { status: 400 });
  }

  const workLogPage = await listWorkLogs(targetId, Number.isFinite(page) && page > 0 ? page : 1, 5);
  return NextResponse.json({ ok: true, workLogPage });
}
