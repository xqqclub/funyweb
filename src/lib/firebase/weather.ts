import { getFirebaseAdminDb } from "@/lib/firebase/admin";
import { defaultWeatherSettings } from "@/lib/weather/defaults";
import type { WeatherMode, WeatherSettings } from "@/types/weather";

const COLLECTION_NAME = "scene_config";
const DOC_ID = "weather";

function isWeatherMode(value: unknown): value is WeatherMode {
  return value === "auto" || value === "rain";
}

function normalizeWeatherSettings(raw: Partial<WeatherSettings> | undefined): {
  settings: WeatherSettings;
  changed: boolean;
} {
  const merged: WeatherSettings = {
    ...defaultWeatherSettings,
    ...raw
  };

  let changed = false;

  if (!isWeatherMode(raw?.mode)) {
    merged.mode = defaultWeatherSettings.mode;
    changed = true;
  }

  if (!raw?.updatedAt || !raw?.updatedBy) {
    changed = true;
  }

  return {
    settings: merged,
    changed
  };
}

export async function getWeatherSettings(): Promise<WeatherSettings> {
  const db = getFirebaseAdminDb();

  if (!db) {
    return defaultWeatherSettings;
  }

  try {
    const ref = db.collection(COLLECTION_NAME).doc(DOC_ID);
    const snapshot = await ref.get();

    if (!snapshot.exists) {
      await ref.set(defaultWeatherSettings);
      return defaultWeatherSettings;
    }

    const normalized = normalizeWeatherSettings(snapshot.data() as Partial<WeatherSettings> | undefined);

    if (normalized.changed) {
      await ref.set(normalized.settings, { merge: true });
    }

    return normalized.settings;
  } catch {
    return defaultWeatherSettings;
  }
}

export async function saveWeatherSettings(mode: WeatherMode, updatedBy: string): Promise<WeatherSettings> {
  const db = getFirebaseAdminDb();

  const nextSettings: WeatherSettings = {
    mode,
    updatedAt: new Date().toISOString(),
    updatedBy
  };

  if (!db) {
    return nextSettings;
  }

  try {
    await db.collection(COLLECTION_NAME).doc(DOC_ID).set(nextSettings, { merge: true });
    return nextSettings;
  } catch {
    return nextSettings;
  }
}
