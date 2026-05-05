const sceneAssetPaths = [
  "/scenes/mobile/backgrounds/city-office-day.png",
  "/scenes/mobile/backgrounds/city-office-night.png",
  "/scenes/mobile/backgrounds/city-office-day-rain.png",
  "/scenes/mobile/backgrounds/city-office-night-rain.png",
  "/scenes/mobile/backgrounds/forest-home-day.png",
  "/scenes/mobile/backgrounds/forest-home-night.png",
  "/scenes/mobile/backgrounds/home-day-rain.png",
  "/scenes/mobile/backgrounds/home-night-rain.png",
  "/scenes/mobile/backgrounds/road/road-day.png",
  "/scenes/mobile/backgrounds/road/road-night.png",
  "/scenes/mobile/backgrounds/road/road-day-rain.png",
  "/scenes/mobile/backgrounds/road/road-night-rain.png",
  "/scenes/desktop/backgrounds/city-office-day.png",
  "/scenes/desktop/backgrounds/city-office-night.png",
  "/scenes/desktop/backgrounds/city-office-day-rain.png",
  "/scenes/desktop/backgrounds/city-office-night-rain.png",
  "/scenes/desktop/backgrounds/forest-home-day.png",
  "/scenes/desktop/backgrounds/forest-home-night.png",
  "/scenes/desktop/backgrounds/home-day-rain.png",
  "/scenes/desktop/backgrounds/home-night-rain.png",
  "/scenes/desktop/backgrounds/road/road-day.png",
  "/scenes/desktop/backgrounds/road/road-night.png",
  "/scenes/desktop/backgrounds/road/road-day-rain.png",
  "/scenes/desktop/backgrounds/road/road-night-rain.png",
  "/scenes/shared/characters/main-working.png",
  "/scenes/shared/characters/主角-公司吃飯.png",
  "/scenes/shared/characters/主角-外出工作.png",
  "/scenes/shared/characters/主角-買東西.png",
  "/scenes/shared/characters/主角-在家吃飯.png",
  "/scenes/shared/characters/主角-沉思.png",
  "/scenes/shared/characters/main-going-home.png",
  "/scenes/shared/characters/main-cleaning.png",
  "/scenes/shared/characters/睡覺.png",
  "/scenes/shared/characters/at-home-idle.png",
  "/scenes/shared/characters/at-home-gaming.png",
  "/scenes/shared/characters/at-home-streaming.png",
  "/scenes/shared/characters/at-home-reading.png",
  "/scenes/shared/characters/走路1.png",
  "/scenes/shared/characters/走路2.png",
  "/scenes/shared/characters/走路3.png"
] as const;

export type SceneAssetVersions = Record<string, string>;

export function getSceneAssetVersions(): SceneAssetVersions {
  const buildVersion =
    process.env.DEPLOY_ID ||
    process.env.COMMIT_REF ||
    process.env.BRANCH ||
    "dev";

  return sceneAssetPaths.reduce<SceneAssetVersions>((accumulator, assetPath) => {
    accumulator[assetPath] = buildVersion;
    return accumulator;
  }, {});
}
