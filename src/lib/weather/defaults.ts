import type { WeatherSettings } from "@/types/weather";

export const defaultWeatherSettings: WeatherSettings = {
  mode: "auto",
  updatedAt: new Date("2026-04-06T00:00:00.000Z").toISOString(),
  updatedBy: "system"
};
