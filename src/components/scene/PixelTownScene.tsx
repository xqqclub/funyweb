"use client";

import Image from "next/image";
import { CSSProperties, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { subscribeToActorState } from "@/lib/firebase/actors-client";
import { subscribeToWeatherSettings } from "@/lib/firebase/weather-client";
import { atHomeModeMeta, statusMeta } from "@/lib/status/mapping";
import { defaultWeatherSettings } from "@/lib/weather/defaults";
import type { ActorState, ActorStatus } from "@/types/actor";
import type { KnowledgePage } from "@/types/knowledge";
import type { WeatherSettings } from "@/types/weather";

import styles from "./scene.module.css";

const statusOrder: ActorStatus[] = ["working", "going_home", "biking", "cleaning", "sleeping", "at_home"];

type SceneProps = {
  initialState: ActorState;
  initialWeatherSettings: WeatherSettings;
  assetVersions: Record<string, string>;
  knowledgePage: KnowledgePage;
};

type TimePhase = "dawn" | "day" | "dusk" | "night";
type ViewportMode = "mobile" | "desktop";
type CharacterPlacement = {
  left: number;
  bottom: number;
};

type WeatherState = {
  isRaining: boolean;
  label: string;
  ready: boolean;
};

const TAICHUNG_COORDS = {
  latitude: 24.1477,
  longitude: 120.6736
} as const;

function toLocalTime(isoString: string) {
  return new Intl.DateTimeFormat("zh-Hant-TW", {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric"
  }).format(new Date(isoString));
}

function formatCurrentTime(date: Date) {
  return new Intl.DateTimeFormat("zh-Hant-TW", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function getTimePhase(hour: number): TimePhase {
  if (hour >= 5 && hour < 9) {
    return "dawn";
  }

  if (hour >= 9 && hour < 17) {
    return "day";
  }

  if (hour >= 17 && hour < 20) {
    return "dusk";
  }

  return "night";
}

function isRainCode(code: number | undefined) {
  if (typeof code !== "number") {
    return false;
  }

  return [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code);
}

export function PixelTownScene({ initialState, initialWeatherSettings, assetVersions, knowledgePage }: SceneProps) {
  const [actorState, setActorState] = useState(initialState);
  const [isPending, startTransition] = useTransition();
  const [currentDateTime, setCurrentDateTime] = useState(() => new Date());
  const [viewportMode, setViewportMode] = useState<ViewportMode>("desktop");
  const [notification, setNotification] = useState<{
    title: string;
    body: string;
    stamp: number;
  } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [weatherState, setWeatherState] = useState<WeatherState>({
    isRaining: false,
    label: "天氣偵測中",
    ready: false
  });
  const [weatherSettings, setWeatherSettings] = useState<WeatherSettings>(initialWeatherSettings);
  const previousStatusRef = useRef<ActorStatus>(initialState.status);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToActorState((state) => {
      startTransition(() => {
        setActorState(state);
      });
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToWeatherSettings((settings) => {
      startTransition(() => {
        setWeatherSettings(settings);
      });
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const syncWeatherFromApi = async () => {
      try {
        const response = await fetch("/api/weather", { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { settings?: WeatherSettings };
        if (!payload.settings || cancelled) {
          return;
        }

        startTransition(() => {
          setWeatherSettings((current) => {
            if (current.mode === payload.settings?.mode && current.updatedAt === payload.settings?.updatedAt) {
              return current;
            }

            return payload.settings as WeatherSettings;
          });
        });
      } catch {
        return;
      }
    };

    syncWeatherFromApi();
    const interval = window.setInterval(syncWeatherFromApi, 4000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const syncFromApi = async () => {
      try {
        const response = await fetch("/api/status", { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { state?: ActorState };
        if (!payload.state || cancelled) {
          return;
        }

        startTransition(() => {
          setActorState((current) => {
            if (current.updatedAt === payload.state?.updatedAt && current.status === payload.state?.status) {
              return current;
            }

            return payload.state as ActorState;
          });
        });
      } catch {
        return;
      }
    };

    syncFromApi();
    const interval = window.setInterval(syncFromApi, 4000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const syncClock = () => {
      setCurrentDateTime(new Date());
    };

    syncClock();
    const interval = window.setInterval(syncClock, 60_000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const updateWeather = async () => {
      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${TAICHUNG_COORDS.latitude}&longitude=${TAICHUNG_COORDS.longitude}&current=precipitation,rain,showers,weather_code&timezone=Asia%2FTaipei&forecast_days=1`,
          { cache: "no-store" }
        );

        if (!response.ok) {
          throw new Error("weather fetch failed");
        }

        const payload = (await response.json()) as {
          current?: {
            precipitation?: number;
            rain?: number;
            showers?: number;
            weather_code?: number;
          };
        };

        const current = payload.current;
        const raining =
          (current?.precipitation ?? 0) > 0 ||
          (current?.rain ?? 0) > 0 ||
          (current?.showers ?? 0) > 0 ||
          isRainCode(current?.weather_code);

        if (!cancelled) {
          setWeatherState({
            isRaining: raining,
            label: raining ? "台中雨天" : "台中無雨",
            ready: true
          });
        }
      } catch {
        if (!cancelled) {
          setWeatherState({
            isRaining: false,
            label: "天氣未連線",
            ready: true
          });
        }
      }
    };

    void updateWeather();
    const interval = window.setInterval(() => {
      void updateWeather();
    }, 15 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const syncViewport = () => {
      setViewportMode(window.innerWidth < 900 ? "mobile" : "desktop");
    };

    syncViewport();
    window.addEventListener("resize", syncViewport);

    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  useEffect(() => {
    if (previousStatusRef.current === actorState.status) {
      return;
    }

    const nextNotification = {
      title: "Mission Updated",
      body: `${statusMeta[actorState.status].label} 已啟動，城市流程已重新配置。`,
      stamp: Date.now()
    };

    previousStatusRef.current = actorState.status;
    setNotification(nextNotification);

    if (soundEnabled && typeof window !== "undefined") {
      const audioContext =
        audioContextRef.current ?? new window.AudioContext();

      audioContextRef.current = audioContext;

      const playTone = (frequency: number, startOffset: number, duration: number, type: OscillatorType) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = type;
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, audioContext.currentTime + startOffset);
        gain.gain.exponentialRampToValueAtTime(0.05, audioContext.currentTime + startOffset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + startOffset + duration);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(audioContext.currentTime + startOffset);
        oscillator.stop(audioContext.currentTime + startOffset + duration);
      };

      if (actorState.status === "working") {
        playTone(523.25, 0, 0.18, "square");
        playTone(659.25, 0.12, 0.22, "square");
      } else if (actorState.status === "going_home") {
        playTone(392, 0, 0.18, "triangle");
        playTone(349.23, 0.1, 0.18, "triangle");
        playTone(293.66, 0.2, 0.22, "triangle");
      } else {
        playTone(440, 0, 0.12, "sine");
        playTone(554.37, 0.08, 0.12, "sine");
        playTone(659.25, 0.16, 0.18, "sine");
      }
    }

    const timeout = window.setTimeout(() => {
      setNotification(null);
    }, 3200);

    return () => window.clearTimeout(timeout);
  }, [actorState.status, soundEnabled]);

  const activeMeta = useMemo(() => statusMeta[actorState.status], [actorState.status]);
  const timePhase = useMemo(() => getTimePhase(currentDateTime.getHours()), [currentDateTime]);
  const objectiveByStatus: Record<ActorStatus, string> = {
    working: "完成辦公區任務巡檢，維持今日輸出節奏。",
    going_home: "沿主要道路返家，避開尖峰時段的人流。",
    biking: "騎車在城鎮之間移動，保持穩定的外出節奏。",
    cleaning: "整理住家區域，讓生活值恢復到穩定狀態。",
    sleeping: "進入休息狀態，讓主角恢復體力與生活值。",
    at_home: "留在家中待命，保持安靜且穩定的居家節奏。"
  };
  const queueByStatus: Record<ActorStatus, string[]> = {
    working: ["整理辦公桌任務", "確認樓層能源燈號", "同步管理者排程"],
    going_home: ["更新通勤動畫", "切換住宅燈光", "讓 NPC 避開主角路徑"],
    biking: ["維持騎車狀態", "更新外出節奏", "切換移動中場景語氣"],
    cleaning: ["顯示掃除特效", "提高住宅整潔度", "準備下一個待辦狀態"],
    sleeping: ["降低場景節奏", "切換安靜氛圍", "維持休息中的狀態"],
    at_home: ["保持待機站姿", "顯示居家狀態", "等待下一次管理指令"]
  };
  const zoneLabel: Record<string, string> = {
    office: "辦公大樓區",
    road: "城市道路",
    home: "住宅街區"
  };
  const phaseLabel: Record<TimePhase, string> = {
    dawn: "清晨模式",
    day: "日間模式",
    dusk: "黃昏模式",
    night: "夜間模式"
  };
  const atmosphereByPhase: Record<
    TimePhase,
    {
      overlay: string;
      sky: string;
      horizon: string;
      orb: string;
      haze: string;
    }
  > = {
    dawn: {
      overlay: "linear-gradient(180deg, rgba(255, 183, 129, 0.16), rgba(74, 131, 186, 0.08) 48%, rgba(8, 17, 24, 0.2))",
      sky: "linear-gradient(180deg, rgba(255, 207, 161, 0.22), rgba(255, 151, 110, 0.08) 38%, rgba(0, 0, 0, 0) 78%)",
      horizon: "linear-gradient(180deg, rgba(255, 183, 125, 0), rgba(255, 183, 125, 0.18) 58%, rgba(61, 104, 138, 0.26))",
      orb: "radial-gradient(circle, rgba(255, 226, 178, 0.82), rgba(255, 169, 114, 0.32) 42%, rgba(255, 169, 114, 0) 72%)",
      haze: "radial-gradient(circle, rgba(255, 215, 173, 0.24), rgba(255, 215, 173, 0) 68%)"
    },
    day: {
      overlay: "linear-gradient(180deg, rgba(110, 181, 255, 0.08), rgba(255, 255, 255, 0.02) 42%, rgba(4, 12, 19, 0.12))",
      sky: "linear-gradient(180deg, rgba(175, 223, 255, 0.16), rgba(175, 223, 255, 0.03) 34%, rgba(0, 0, 0, 0) 72%)",
      horizon: "linear-gradient(180deg, rgba(255, 232, 181, 0), rgba(255, 232, 181, 0.08) 58%, rgba(49, 98, 122, 0.16))",
      orb: "radial-gradient(circle, rgba(255, 248, 213, 0.9), rgba(255, 232, 170, 0.28) 40%, rgba(255, 232, 170, 0) 70%)",
      haze: "radial-gradient(circle, rgba(172, 221, 255, 0.18), rgba(172, 221, 255, 0) 66%)"
    },
    dusk: {
      overlay: "linear-gradient(180deg, rgba(255, 135, 104, 0.18), rgba(121, 86, 162, 0.08) 42%, rgba(6, 14, 22, 0.24))",
      sky: "linear-gradient(180deg, rgba(255, 173, 122, 0.22), rgba(233, 116, 102, 0.08) 36%, rgba(0, 0, 0, 0) 74%)",
      horizon: "linear-gradient(180deg, rgba(255, 143, 110, 0), rgba(255, 143, 110, 0.18) 56%, rgba(92, 75, 140, 0.22))",
      orb: "radial-gradient(circle, rgba(255, 202, 134, 0.86), rgba(255, 138, 102, 0.36) 40%, rgba(255, 138, 102, 0) 72%)",
      haze: "radial-gradient(circle, rgba(255, 167, 118, 0.22), rgba(255, 167, 118, 0) 68%)"
    },
    night: {
      overlay: "linear-gradient(180deg, rgba(58, 95, 173, 0.16), rgba(15, 28, 55, 0.08) 40%, rgba(3, 9, 15, 0.36))",
      sky: "linear-gradient(180deg, rgba(93, 135, 222, 0.14), rgba(93, 135, 222, 0.03) 32%, rgba(0, 0, 0, 0) 72%)",
      horizon: "linear-gradient(180deg, rgba(85, 129, 216, 0), rgba(85, 129, 216, 0.1) 58%, rgba(10, 20, 42, 0.26))",
      orb: "radial-gradient(circle, rgba(213, 231, 255, 0.76), rgba(129, 175, 255, 0.24) 42%, rgba(129, 175, 255, 0) 72%)",
      haze: "radial-gradient(circle, rgba(114, 156, 255, 0.16), rgba(114, 156, 255, 0) 66%)"
    }
  };
  const backgroundPathByStatus: Record<ActorStatus, (mode: ViewportMode, segment: "day" | "night", raining: boolean) => string> = {
    working: (mode, segment, raining) =>
      raining ? `/scenes/${mode}/backgrounds/city-office-${segment}-rain.png` : `/scenes/${mode}/backgrounds/city-office-${segment}.png`,
    going_home: (mode, segment, raining) =>
      raining ? `/scenes/${mode}/backgrounds/road/road-${segment}-rain.png` : `/scenes/${mode}/backgrounds/road/road-${segment}.png`,
    biking: (mode, segment, raining) =>
      raining ? `/scenes/${mode}/backgrounds/road/road-${segment}-rain.png` : `/scenes/${mode}/backgrounds/road/road-${segment}.png`,
    cleaning: (mode, segment, raining) =>
      raining ? `/scenes/${mode}/backgrounds/home-${segment}-rain.png` : `/scenes/${mode}/backgrounds/forest-home-${segment}.png`,
    sleeping: (mode, segment, raining) =>
      raining ? `/scenes/${mode}/backgrounds/home-${segment}-rain.png` : `/scenes/${mode}/backgrounds/forest-home-${segment}.png`,
    at_home: (mode, segment, raining) =>
      raining ? `/scenes/${mode}/backgrounds/home-${segment}-rain.png` : `/scenes/${mode}/backgrounds/forest-home-${segment}.png`
  };
  const characterAssetByStatus: Record<ActorStatus, string> = {
    working: "/scenes/shared/characters/main-working.png",
    going_home: "/scenes/shared/characters/main-going-home.png",
    biking: "/scenes/shared/characters/main-going-home.png",
    cleaning: "/scenes/shared/characters/main-cleaning.png",
    sleeping: "/scenes/shared/characters/睡覺.png",
    at_home: "/scenes/shared/characters/at-home-idle.png"
  };
  const atHomeCharacterAssetByMode = {
    idle: "/scenes/shared/characters/at-home-idle.png",
    gaming: "/scenes/shared/characters/at-home-gaming.png",
    streaming: "/scenes/shared/characters/at-home-streaming.png",
    reading: "/scenes/shared/characters/at-home-reading.png"
  } as const;
  const characterWidthByStatus: Record<ActorStatus, { desktop: number; mobile: number }> = {
    working: { desktop: 34, mobile: 74 },
    going_home: { desktop: 18, mobile: 50 },
    biking: { desktop: 28, mobile: 64 },
    cleaning: { desktop: 38, mobile: 78 },
    sleeping: { desktop: 31, mobile: 72 },
    at_home: { desktop: 18, mobile: 48 }
  };
  const characterPlacementByStatus: Record<ActorStatus, Record<ViewportMode, CharacterPlacement>> = {
    working: {
      desktop: { left: 48, bottom: 7 },
      mobile: { left: 50, bottom: 14 }
    },
    going_home: {
      desktop: { left: 50, bottom: 9 },
      mobile: { left: 50, bottom: 14 }
    },
    biking: {
      desktop: { left: 51, bottom: 8 },
      mobile: { left: 50, bottom: 13 }
    },
    cleaning: {
      desktop: { left: 51, bottom: 6 },
      mobile: { left: 50, bottom: 12 }
    },
    sleeping: {
      desktop: { left: 52, bottom: 4 },
      mobile: { left: 50, bottom: 10 }
    },
    at_home: {
      desktop: { left: 51, bottom: 7 },
      mobile: { left: 50, bottom: 14 }
    }
  };
  const daySegment = timePhase === "night" ? "night" : "day";
  const manualWeatherOverride = weatherSettings.mode === "rain";
  const effectiveRaining = manualWeatherOverride || weatherState.isRaining;
  const backgroundPath = backgroundPathByStatus[actorState.status](viewportMode, daySegment, effectiveRaining);
  const backgroundImage = `${backgroundPath}?v=${assetVersions[backgroundPath] ?? "0"}`;
  const characterWidth = characterWidthByStatus[actorState.status][viewportMode];
  const characterPlacement = characterPlacementByStatus[actorState.status][viewportMode];
  const characterPath =
    actorState.status === "at_home" ? atHomeCharacterAssetByMode[actorState.homeMode] : characterAssetByStatus[actorState.status];
  const characterScaleBoost =
    actorState.status === "at_home"
      ? {
          idle: 1,
          gaming: 1.42,
          streaming: 1.38,
          reading: 1.4
        }[actorState.homeMode]
      : 1;
  const boostedCharacterWidth = characterWidth * characterScaleBoost;
  const characterImage = `${characterPath}?v=${assetVersions[characterPath] ?? "0"}`;
  const currentObjective =
    actorState.status === "at_home" ? atHomeModeMeta[actorState.homeMode].description : objectiveByStatus[actorState.status];
  const currentLead =
    actorState.status === "at_home" ? atHomeModeMeta[actorState.homeMode].description : activeMeta.description;
  const currentQueue =
    actorState.status === "at_home"
      ? {
          idle: ["保持待機站姿", "維持居家待命", "等待下一次管理指令"],
          gaming: ["切換娛樂狀態", "顯示打電動畫面", "維持居家放鬆節奏"],
          streaming: ["切換追劇畫面", "保持室內休閒氛圍", "等待下一次管理指令"],
          reading: ["切換讀書畫面", "維持安靜專注氛圍", "等待下一次管理指令"]
        }[actorState.homeMode]
      : queueByStatus[actorState.status];
  const walkFrame1Path = "/scenes/shared/characters/走路1.png";
  const walkFrame2Path = "/scenes/shared/characters/走路2.png";
  const walkFrame3Path = "/scenes/shared/characters/走路3.png";
  const walkFrameImages = [
    `${walkFrame1Path}?v=${assetVersions[walkFrame1Path] ?? "0"}`,
    `${walkFrame2Path}?v=${assetVersions[walkFrame2Path] ?? "0"}`,
    `${walkFrame3Path}?v=${assetVersions[walkFrame3Path] ?? "0"}`
  ];

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <div className={styles.sceneColumn}>
            <div className={styles.sceneCard}>
              <div className={styles.topHud}>
              <div className={styles.hudBlock}>
                <span className={styles.hudLabel}>district</span>
                <strong>Funy City</strong>
              </div>
              <div className={styles.hudBlock}>
                <span className={styles.hudLabel}>sync</span>
                <strong>{isPending ? "reloading" : "live"}</strong>
              </div>
              <div className={styles.hudBlock}>
                <span className={styles.hudLabel}>clock</span>
                <strong>{phaseLabel[timePhase]}</strong>
              </div>
            </div>

            <div
              className={styles.sceneViewport}
              style={
                {
                  backgroundImage: `linear-gradient(180deg, rgba(9, 18, 28, 0.18), rgba(9, 18, 28, 0.3)), url(${backgroundImage})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  ["--phase-overlay" as string]: atmosphereByPhase[timePhase].overlay,
                  ["--phase-sky" as string]: atmosphereByPhase[timePhase].sky,
                  ["--phase-horizon" as string]: atmosphereByPhase[timePhase].horizon,
                  ["--phase-orb" as string]: atmosphereByPhase[timePhase].orb,
                  ["--phase-haze" as string]: atmosphereByPhase[timePhase].haze,
                  ["--scene-glow" as string]:
                    timePhase === "day"
                      ? "radial-gradient(circle, rgba(255, 236, 168, 0.25), transparent 70%)"
                      : timePhase === "dawn"
                        ? "radial-gradient(circle, rgba(255, 167, 92, 0.28), transparent 70%)"
                        : timePhase === "dusk"
                          ? "radial-gradient(circle, rgba(255, 118, 100, 0.26), transparent 70%)"
                        : "radial-gradient(circle, rgba(99, 198, 255, 0.18), transparent 70%)"
                } as CSSProperties
              }
            >
              <div className={styles.phaseWash} />
              <div className={styles.phaseSky} />
              <div className={styles.phaseHorizon} />
              <div className={styles.phaseOrb} />
              <div className={styles.phaseHaze} />
              {effectiveRaining ? (
                <div className={styles.rainLayer} aria-hidden="true">
                  <span className={`${styles.rainCurtain} ${styles.rainCurtainFar}`} />
                  <span className={`${styles.rainCurtain} ${styles.rainCurtainMid}`} />
                  <span className={`${styles.rainCurtain} ${styles.rainCurtainNear}`} />
                  <span className={styles.rainMist} />
                </div>
              ) : null}
              <div className={styles.sceneGlow} />
              <div
                className={`${styles.characterLayer} ${styles[`character${actorState.status}`]}`}
                style={
                  {
                    ["--character-width" as string]: `${boostedCharacterWidth}%`,
                    ["--character-left" as string]: `${characterPlacement.left}%`,
                    ["--character-bottom" as string]: `${characterPlacement.bottom}%`
                  } as CSSProperties
                }
              >
                {actorState.status === "going_home" ? (
                  <div className={styles.walkSprite} aria-label={`${activeMeta.label}中的主角`} role="img">
                    {walkFrameImages.map((src, index) => (
                      <Image
                        key={src}
                        src={src}
                        alt=""
                        aria-hidden="true"
                        width={345}
                        height={616}
                        className={`${styles.walkFrame} ${styles[`walkFrame${index + 1}`]}`}
                      />
                    ))}
                  </div>
                ) : (
                  <Image
                    src={characterImage}
                    alt={`${activeMeta.label}中的主角`}
                    width={770}
                    height={710}
                    priority
                    className={styles.characterImage}
                  />
                )}
              </div>
              {notification ? (
                <div key={notification.stamp} className={styles.flashNotice}>
                  <span className={styles.flashTag}>status changed</span>
                  <strong>{notification.title}</strong>
                  <p>{notification.body}</p>
                </div>
              ) : null}
              <div className={styles.ambientLayer} aria-hidden="true">
                {actorState.status === "working"
                  ? [0, 1, 2].map((index) => (
                      <span
                        key={`ambient-work-${index}`}
                        className={`${styles.ambientDot} ${styles.ambientWork}`}
                        style={{ left: `${43 + index * 4}%`, top: `${34 + (index % 2) * 6}%`, animationDelay: `${index * 0.35}s` }}
                      />
                    ))
                  : null}
                {actorState.status === "cleaning"
                  ? [0, 1, 2, 3].map((index) => (
                      <span
                        key={`ambient-clean-${index}`}
                        className={`${styles.ambientDot} ${styles.ambientClean}`}
                        style={{ left: `${56 + (index % 2) * 5}%`, top: `${46 + Math.floor(index / 2) * 6}%`, animationDelay: `${index * 0.28}s` }}
                      />
                    ))
                  : null}
                {actorState.status === "sleeping" ? <span className={styles.sleepBubble}>Zzz</span> : null}
                {actorState.status === "biking"
                  ? [0, 1].map((index) => (
                      <span
                        key={`ambient-bike-${index}`}
                        className={`${styles.ambientStreak} ${styles.ambientBike}`}
                        style={{ left: `${40 + index * 14}%`, top: `${58 + index * 4}%`, animationDelay: `${index * 0.45}s` }}
                      />
                    ))
                  : null}
                {actorState.status === "at_home" && actorState.homeMode === "gaming"
                  ? [0, 1, 2].map((index) => (
                      <span
                        key={`ambient-game-${index}`}
                        className={`${styles.ambientDot} ${styles.ambientGaming}`}
                        style={{ left: `${45 + index * 6}%`, top: `${40 + (index % 2) * 7}%`, animationDelay: `${index * 0.3}s` }}
                      />
                    ))
                  : null}
                {actorState.status === "at_home" && actorState.homeMode === "streaming" ? (
                  <>
                    <span className={styles.streamGlow} />
                    <span className={styles.streamPlay}>▶</span>
                  </>
                ) : null}
                {actorState.status === "at_home" && actorState.homeMode === "reading"
                  ? [0, 1, 2].map((index) => (
                      <span
                        key={`ambient-read-${index}`}
                        className={`${styles.ambientDot} ${styles.ambientReading}`}
                        style={{ left: `${48 + index * 4}%`, top: `${42 + index * 5}%`, animationDelay: `${index * 0.4}s` }}
                      />
                    ))
                  : null}
              </div>
              {notification ? (
                <div className={styles.effectLayer} aria-hidden="true">
                  {actorState.status === "working"
                    ? [0, 1, 2].map((index) => (
                        <span
                          key={`work-${index}`}
                          className={`${styles.effectBurst} ${styles.effectWork}`}
                          style={{ left: `${22 + index * 9}%`, top: `${26 + index * 4}%`, animationDelay: `${index * 120}ms` }}
                        />
                      ))
                    : null}
                  {actorState.status === "going_home" ? null : null}
                  {actorState.status === "cleaning"
                    ? [0, 1, 2, 3, 4].map((index) => (
                        <span
                          key={`clean-${index}`}
                          className={`${styles.effectBurst} ${styles.effectClean}`}
                          style={{ left: `${56 + (index % 3) * 6}%`, top: `${40 + (index % 2) * 7}%`, animationDelay: `${index * 80}ms` }}
                        />
                      ))
                    : null}
                </div>
              ) : null}
              <div className={styles.sceneOverlayLeft}>
                <p className={styles.overlayEyebrow}>main objective</p>
                <h2 className={styles.overlayTitle}>{activeMeta.label}</h2>
                <p className={styles.overlayBody}>{currentObjective}</p>
              </div>
              <div className={styles.sceneOverlayRight}>
                <p className={styles.overlayEyebrow}>active zone</p>
                <strong>{zoneLabel[actorState.location] ?? actorState.location}</strong>
                <span>route guided by realtime state</span>
              </div>
              <div className={styles.bottomHud}>
                <div className={styles.dockCard}>
                  <span className={styles.dockLabel}>avatar</span>
                  <strong>{actorState.name}</strong>
                </div>
                <div className={styles.dockCard}>
                  <span className={styles.dockLabel}>status</span>
                  <strong>{activeMeta.label}</strong>
                </div>
                <div className={styles.dockCard}>
                  <span className={styles.dockLabel}>time</span>
                  <strong>{formatCurrentTime(currentDateTime)}</strong>
                </div>
              </div>
            </div>
              <div className={styles.mobileSceneStats}>
                <div className={styles.mobileStatCard}>
                  <span className={styles.dockLabel}>active zone</span>
                  <strong>{zoneLabel[actorState.location] ?? actorState.location}</strong>
                </div>
                <div className={styles.mobileStatCard}>
                  <span className={styles.dockLabel}>avatar</span>
                  <strong>{actorState.name}</strong>
                </div>
                <div className={styles.mobileStatCard}>
                  <span className={styles.dockLabel}>status</span>
                  <strong>{activeMeta.label}</strong>
                </div>
                <div className={styles.mobileStatCard}>
                  <span className={styles.dockLabel}>time</span>
                  <strong>{formatCurrentTime(currentDateTime)}</strong>
                </div>
              </div>
            </div>

            <section id="knowledge-list" className={styles.knowledgeCard}>
              <div className={styles.knowledgeHeader}>
                <div>
                  <p className={styles.eyebrow}>Knowledge List</p>
                  <h2 className={styles.knowledgeTitle}>知識列表</h2>
                </div>
                <p className={styles.knowledgeHint}>顯示最近 5 筆由 Telegram 傳入的知識連結。</p>
              </div>

              <div className={styles.knowledgeList}>
                {knowledgePage.items.length > 0 ? (
                  knowledgePage.items.map((item) => (
                    <a
                      key={item.id}
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.knowledgeRow}
                    >
                      <div className={styles.knowledgeMain}>
                        <strong>{item.title}</strong>
                        <span>{item.domain}</span>
                      </div>
                      <span className={styles.knowledgeTime}>{toLocalTime(item.createdAt)}</span>
                    </a>
                  ))
                ) : (
                  <div className={styles.knowledgeEmpty}>目前還沒有知識連結。你可以直接把網址傳到 Telegram Bot。</div>
                )}
              </div>

              <div className={styles.knowledgePager}>
                {knowledgePage.hasPreviousPage ? (
                  <a className={styles.knowledgePageLink} href={`/?page=${knowledgePage.page - 1}#knowledge-list`}>
                    上一頁
                  </a>
                ) : (
                  <span className={styles.knowledgePageLinkDisabled}>上一頁</span>
                )}
                <span className={styles.knowledgePageStatus}>第 {knowledgePage.page} 頁</span>
                {knowledgePage.hasNextPage ? (
                  <a className={styles.knowledgePageLink} href={`/?page=${knowledgePage.page + 1}#knowledge-list`}>
                    下一頁
                  </a>
                ) : (
                  <span className={styles.knowledgePageLinkDisabled}>下一頁</span>
                )}
              </div>
            </section>
          </div>

          <aside className={styles.infoPanel}>
            <p className={styles.eyebrow}>Live Sim Dashboard</p>
            <h1 className={styles.title}>Pixel Town Control</h1>
            <p className={styles.lead}>
              管理者透過後台與 Telegram 就能驅動整座微型城市，首頁則像遊戲 HUD 一樣即時反映主角與場景的變化。
            </p>
            <div className={styles.statusBadge}>
              <span className={styles.chip} style={{ ["--chip-color" as string]: activeMeta.accent }}>
                {activeMeta.emoji}
              </span>
              <span>{activeMeta.label}</span>
            </div>
            <p className={styles.lead}>{currentLead}</p>
            <div className={styles.missionPanel}>
              <div>
                <span className={styles.statLabel}>目前任務</span>
                <p className={styles.missionTitle}>{currentObjective}</p>
              </div>
              <div className={styles.syncLine}>
                <span className={styles.syncDot} />
                Firestore Realtime + Telegram Control
              </div>
              <div className={styles.phaseRow}>
                <span className={styles.phaseChip}>{phaseLabel[timePhase]}</span>
                <span className={`${styles.phaseChip} ${effectiveRaining ? styles.weatherChipRain : styles.weatherChip}`}>
                  {manualWeatherOverride ? "手動雨天" : weatherState.label}
                </span>
                <span className={styles.phaseHint}>
                  {manualWeatherOverride
                    ? "目前以管理者手動設定為主"
                    : weatherState.ready
                      ? "背景會依台中天氣與本地時間自動切換"
                      : "正在偵測台中目前天氣"}
                </span>
              </div>
              <div className={styles.audioRow}>
                <button
                  type="button"
                  className={styles.audioToggle}
                  onClick={() => setSoundEnabled((current) => !current)}
                  aria-pressed={soundEnabled}
                >
                  <span className={styles.audioIcon}>{soundEnabled ? "SFX ON" : "SFX OFF"}</span>
                  <span>{soundEnabled ? "事件提示音已啟用" : "事件提示音已靜音"}</span>
                </button>
              </div>
            </div>
            <div className={styles.stats}>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>主角</span>
                <p className={styles.statValue}>{actorState.name}</p>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>所在區域</span>
                <p className={styles.statValue}>{zoneLabel[actorState.location] ?? actorState.location}</p>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>更新時間</span>
                <p className={styles.statValue}>{toLocalTime(actorState.updatedAt)}</p>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>更新來源</span>
                <p className={styles.statValue}>{actorState.updatedBy}</p>
              </div>
            </div>
            <div className={styles.queuePanel}>
              <p className={styles.queueTitle}>狀態佇列</p>
                {currentQueue.map((item) => (
                <div key={item} className={styles.queueItem}>
                  <span className={styles.queueBullet} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <p className={styles.notice}>
              {isPending ? "正在同步最新狀態..." : "系統目前處於即時同步模式，後台與 Bot 的更新會直接推送到首頁。"}
            </p>
            {notification ? (
              <div key={`panel-${notification.stamp}`} className={styles.eventCard}>
                <span className={styles.eventLabel}>Event Feed</span>
                <strong>{notification.title}</strong>
                <p>{notification.body}</p>
              </div>
            ) : null}
          </aside>
        </section>

        <section className={styles.adminCard}>
          <div className={styles.adminHeader}>
            <div>
              <h2>控制台場景指令</h2>
              <p>主角狀態與場景敘事綁在一起，每次切換都會影響 HUD、路徑提示與城市語氣。</p>
            </div>
          </div>
          <div className={styles.actions}>
            {statusOrder.map((status) => {
              const meta = statusMeta[status];
              return (
                <button
                  key={status}
                  type="button"
                  className={styles.actionButton}
                  data-active={actorState.status === status}
                  aria-pressed={actorState.status === status}
                >
                  <span className={styles.actionAccent} style={{ background: meta.accent }} />
                  <span className={styles.buttonTitle}>{meta.label}</span>
                  <span className={styles.buttonHint}>{meta.description}</span>
                </button>
              );
            })}
          </div>
          <div className={styles.sceneMeta}>
            <div className={styles.statCard}>
              <span className={styles.adminLabel}>前端節奏</span>
              <p className={styles.adminValue}>Game-like HUD</p>
            </div>
            <div className={styles.statCard}>
              <span className={styles.adminLabel}>同步引擎</span>
              <p className={styles.adminValue}>Firestore Live Feed</p>
            </div>
            <div className={styles.statCard}>
              <span className={styles.adminLabel}>控制入口</span>
              <p className={styles.adminValue}>Admin + Telegram</p>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}
