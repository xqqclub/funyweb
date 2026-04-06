import { NextResponse } from "next/server";

import { verifyAdminRequest } from "@/lib/firebase/admin-guard";
import { getWeatherSettings, saveWeatherSettings } from "@/lib/firebase/weather";
import type { WeatherMode } from "@/types/weather";

type WeatherPayload = {
  mode?: WeatherMode;
};

function isWeatherMode(value: string): value is WeatherMode {
  return value === "auto" || value === "rain";
}

export async function GET() {
  const settings = await getWeatherSettings();
  return NextResponse.json({ ok: true, settings });
}

export async function POST(request: Request) {
  const admin = await verifyAdminRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized admin request." }, { status: 401 });
  }

  const payload = (await request.json()) as WeatherPayload;

  if (!payload.mode || !isWeatherMode(payload.mode)) {
    return NextResponse.json({ error: "Invalid weather payload." }, { status: 400 });
  }

  const settings = await saveWeatherSettings(payload.mode, admin.email ?? admin.uid);
  return NextResponse.json({ ok: true, settings });
}
