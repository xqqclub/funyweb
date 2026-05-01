import { doc, onSnapshot } from "firebase/firestore";

import { getFirebaseClientDb } from "@/lib/firebase/client";
import { defaultWeatherSettings } from "@/lib/weather/defaults";
import type { WeatherSettings, WeatherMode } from "@/types/weather";

const COLLECTION_NAME = "scene_config";
const DOC_ID = "weather";

function isWeatherMode(value: unknown): value is WeatherMode {
  return value === "auto" || value === "rain";
}

function normalizeWeatherSettings(raw: Partial<WeatherSettings> | undefined): WeatherSettings {
  return {
    ...defaultWeatherSettings,
    ...raw,
    mode: isWeatherMode(raw?.mode) ? raw.mode : defaultWeatherSettings.mode
  };
}

export function subscribeToWeatherSettings(onChange: (settings: WeatherSettings) => void) {
  const db = getFirebaseClientDb();

  if (!db) {
    onChange(defaultWeatherSettings);
    return () => undefined;
  }

  const ref = doc(db, COLLECTION_NAME, DOC_ID);

  return onSnapshot(ref, async (snapshot) => {
    if (!snapshot.exists()) {
      onChange(defaultWeatherSettings);
      return;
    }

    onChange(normalizeWeatherSettings(snapshot.data() as Partial<WeatherSettings>));
  });
}
