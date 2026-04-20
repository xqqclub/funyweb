import { saveKnowledgeUrl } from "@/lib/firebase/knowledge";
import { getWeatherSettings, saveWeatherSettings } from "@/lib/firebase/weather";
import type { WeatherMode } from "@/types/weather";

export function getWeatherModeLabel(mode: WeatherMode) {
  return mode === "rain" ? "手動雨天" : "自動依台中天氣";
}

export async function getWorldWeatherSettings() {
  return getWeatherSettings();
}

export async function updateWorldWeatherMode(mode: WeatherMode, updatedBy: string) {
  return saveWeatherSettings(mode, updatedBy);
}

export async function saveKnowledgeUrls(urls: string[], updatedBy: string) {
  const savedItems = await Promise.all(urls.map((url) => saveKnowledgeUrl(url, updatedBy)));
  return savedItems.filter(Boolean);
}
