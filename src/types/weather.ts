export type WeatherMode = "auto" | "rain";

export interface WeatherSettings {
  mode: WeatherMode;
  updatedAt: string;
  updatedBy: string;
}
