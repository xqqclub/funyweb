import { NextResponse } from "next/server";

import { verifyAdminRequest } from "@/lib/firebase/admin-guard";
import { getActorStateResult, saveActorState } from "@/lib/firebase/actors";
import type { ActorStatus, AtHomeMode } from "@/types/actor";

type StatusPayload = {
  status?: ActorStatus;
  homeMode?: AtHomeMode;
  updatedBy?: string;
};

function isActorStatus(status: string): status is ActorStatus {
  return (
    status === "working" ||
    status === "company_eating" ||
    status === "field_work" ||
    status === "going_home" ||
    status === "shopping" ||
    status === "cleaning" ||
    status === "sleeping" ||
    status === "biking" ||
    status === "thinking" ||
    status === "at_home"
  );
}

function isAtHomeMode(value: string): value is AtHomeMode {
  return (
    value === "idle" ||
    value === "gaming" ||
    value === "streaming" ||
    value === "reading" ||
    value === "thinking" ||
    value === "eating" ||
    value === "cooking" ||
    value === "gardening"
  );
}

export async function POST(request: Request) {
  const admin = await verifyAdminRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized admin request." }, { status: 401 });
  }

  const payload = (await request.json()) as StatusPayload;

  if (!payload.status || !isActorStatus(payload.status)) {
    return NextResponse.json({ error: "Invalid status payload." }, { status: 400 });
  }

  const homeMode = payload.homeMode && isAtHomeMode(payload.homeMode) ? payload.homeMode : undefined;
  const result = await saveActorState(payload.status, payload.updatedBy ?? admin.email ?? admin.uid, homeMode);

  return NextResponse.json({ ok: true, ...result });
}

export async function GET() {
  const result = await getActorStateResult();

  return NextResponse.json({
    ok: true,
    ...result
  });
}
