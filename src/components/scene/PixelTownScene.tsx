"use client";

import Image from "next/image";
import Link from "next/link";
import { CSSProperties, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { KnowledgeListPanel } from "@/components/scene/KnowledgeListPanel";
import { PlayerGallery, type PlayerGalleryItem } from "@/components/scene/PlayerGallery";
import { SelectedPlayerInfo } from "@/components/scene/SelectedPlayerInfo";
import { WorkLogPanel } from "@/components/scene/WorkLogPanel";
import { subscribeToActorState } from "@/lib/firebase/actors-client";
import { subscribeToPlayers } from "@/lib/firebase/players-client";
import { resolveCharacterStillAsset, resolveCharacterWalkFrames } from "@/lib/characters/catalog";
import { formatCharacterSummary } from "@/lib/players/format";
import { subscribeToWeatherSettings } from "@/lib/firebase/weather-client";
import { atHomeModeMeta, statusMeta } from "@/lib/status/mapping";
import { defaultWeatherSettings } from "@/lib/weather/defaults";
import type { ActorState, ActorStatus, AtHomeMode } from "@/types/actor";
import type { KnowledgePage } from "@/types/knowledge";
import type { WorkLogPage } from "@/types/work-log";
import type { WeatherSettings } from "@/types/weather";

import styles from "./scene.module.css";

const statusOrder: ActorStatus[] = ["working", "going_home", "biking", "cleaning", "sleeping", "at_home"];

type SceneProps = {
  initialState: ActorState;
  initialPlayers: ActorState[];
  initialWeatherSettings: WeatherSettings;
  assetVersions: Record<string, string>;
  knowledgePage: KnowledgePage;
  initialWorkLogPage: WorkLogPage;
  initialFocusPlayerId?: string;
  sceneMode?: "home" | "player";
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

type SpeechTheme = {
  background: string;
  border: string;
  text: string;
  glow: string;
  arrowBorder: string;
};

type ScenePlayer = ActorState & {
  isManager: boolean;
  roleLabel: string;
  permissions: string[];
  story: string;
  objective: string;
  queue: string[];
};

const TAICHUNG_COORDS = {
  latitude: 24.1477,
  longitude: 120.6736
} as const;

const playerPermissions = {
  manager: ["可審核玩家帳號", "可新增知識列表", "可切換世界天氣與焦點玩家"],
  player: ["只能更新自己的狀態", "可點擊首頁查看其他玩家", "不可新增知識列表或修改他人資料"]
} as const;

const playerStoryByStatus: Record<ActorStatus, string> = {
  working: "玩家正在辦公區專注工作，小卡以背景與狀態圖快速呈現。",
  going_home: "玩家正在返家途中，小卡只保留道路背景與步行狀態。",
  biking: "玩家正騎車移動，小卡畫面會保持更動態的節奏。",
  cleaning: "玩家正在整理居家空間，畫面聚焦在角色與住宅背景。",
  sleeping: "玩家目前睡覺中，小卡會優先呈現角色休息狀態。",
  at_home: "玩家目前留在家中，主體是角色圖，背景只作為陪襯。"
};

const playerObjectiveByStatus: Record<ActorStatus, string> = {
  working: "維持今日輸出與工作節奏。",
  going_home: "沿主要道路返家，畫面以通勤節奏為主。",
  biking: "保持穩定移動狀態，切換外出型場景。",
  cleaning: "整理住家區域，讓生活值與整潔度恢復穩定。",
  sleeping: "恢復體力與生活值，保持安靜休息節奏。",
  at_home: "保持居家狀態，等待下一次玩家操作。"
};

const playerQueueByStatus: Record<ActorStatus, string[]> = {
  working: ["更新自己的狀態", "等待主管理者推送事件", "同步個人任務進度"],
  going_home: ["更新回家中狀態", "顯示道路背景", "等待下一次個人操作"],
  biking: ["維持騎車狀態", "更新移動中節奏", "等待下一次個人操作"],
  cleaning: ["顯示打掃狀態圖", "同步住宅區氛圍", "等待下一次個人操作"],
  sleeping: ["維持睡眠狀態", "降低場景節奏", "等待玩家下一次更新"],
  at_home: ["更新在家子狀態", "切換對應狀態圖", "等待主管理者的世界事件"]
};

const lyraAtHomeStory: Partial<Record<AtHomeMode, string>> = {
  idle: "Lyra 正在家中待命，畫面會帶出更柔和的生活節奏。",
  thinking: "Lyra 正在沉思，場景會呈現靜靜整理思緒的氛圍。",
  eating: "Lyra 正在吃飯，整體氣氛會更偏向溫暖的日常感。",
  cooking: "Lyra 正在烹飪，場景會出現更明顯的生活動線。",
  gardening: "Lyra 正在種花，整體氛圍偏向放鬆且療癒。 "
};

const lyraAtHomeObjective: Partial<Record<AtHomeMode, string>> = {
  idle: "讓 Lyra 保持舒服的居家節奏，等待下一個行程。",
  thinking: "整理今天的想法與情緒，讓節奏慢下來。",
  eating: "享受一段安穩的用餐時間，補充生活能量。",
  cooking: "完成一段帶有煙火氣的烹飪時間。",
  gardening: "照顧花草，維持輕鬆又療癒的生活感。"
};

const lyraAtHomeQueue: Partial<Record<AtHomeMode, string[]>> = {
  idle: ["保持站立待機", "維持輕柔的居家氛圍", "等待玩家下一次操作"],
  thinking: ["切換沉思畫面", "維持安靜整理思緒的節奏", "等待下一次操作"],
  eating: ["切換吃飯畫面", "維持溫暖生活感", "等待下一次操作"],
  cooking: ["切換烹飪畫面", "加入煙火氣氛圍", "等待下一次操作"],
  gardening: ["切換種花畫面", "保持療癒綠意節奏", "等待下一次操作"]
};

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

function getStableHue(seed: string) {
  return Array.from(seed).reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360;
}

function getSpeechTheme(actor: ActorState, isManager: boolean): SpeechTheme {
  if (isManager) {
    return {
      background: "linear-gradient(180deg, rgba(255, 244, 204, 0.98), rgba(247, 226, 169, 0.94))",
      border: "rgba(167, 126, 35, 0.24)",
      text: "#2f2008",
      glow: "rgba(255, 213, 102, 0.24)",
      arrowBorder: "rgba(133, 99, 22, 0.16)"
    };
  }

  const hue = getStableHue(actor.id);
  return {
    background: `linear-gradient(180deg, hsla(${hue}, 72%, 96%, 0.98), hsla(${hue}, 64%, 90%, 0.94))`,
    border: `hsla(${hue}, 48%, 42%, 0.2)`,
    text: `hsl(${hue}, 32%, 20%)`,
    glow: `hsla(${hue}, 72%, 62%, 0.16)`,
    arrowBorder: `hsla(${hue}, 36%, 34%, 0.14)`
  };
}

function isLyraCharacter(actor: ActorState) {
  return actor.characterGender === "female" && actor.characterId === "lyra";
}

export function PixelTownScene({
  initialState,
  initialPlayers,
  initialWeatherSettings,
  assetVersions,
  knowledgePage,
  initialWorkLogPage,
  initialFocusPlayerId,
  sceneMode = "home"
}: SceneProps) {
  const [actorState, setActorState] = useState(initialState);
  const [players, setPlayers] = useState(initialPlayers);
  const [isPending, startTransition] = useTransition();
  const [selectedPlayerId, setSelectedPlayerId] = useState(initialFocusPlayerId ?? initialState.id);
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
  const [workLogPage, setWorkLogPage] = useState<WorkLogPage>(initialWorkLogPage);
  const [workLogCurrentPage, setWorkLogCurrentPage] = useState(initialWorkLogPage.page);
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
    const unsubscribe = subscribeToPlayers((nextPlayers) => {
      startTransition(() => {
        setPlayers(nextPlayers);
      });
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    setWorkLogCurrentPage(1);
  }, [selectedPlayerId]);

  useEffect(() => {
    let cancelled = false;

    const syncWorkLogs = async () => {
      try {
        const response = await fetch(`/api/work-log?targetId=${encodeURIComponent(selectedPlayerId)}&page=${workLogCurrentPage}`, {
          cache: "no-store"
        });
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { workLogPage?: WorkLogPage };
        if (!payload.workLogPage || cancelled) {
          return;
        }

        startTransition(() => {
          setWorkLogPage(payload.workLogPage as WorkLogPage);
        });
      } catch {
        return;
      }
    };

    syncWorkLogs();
    const interval = window.setInterval(syncWorkLogs, 4000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [selectedPlayerId, workLogCurrentPage]);

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
    reading: "/scenes/shared/characters/at-home-reading.png",
    thinking: "/scenes/shared/characters/at-home-idle.png",
    eating: "/scenes/shared/characters/at-home-idle.png",
    cooking: "/scenes/shared/characters/at-home-idle.png",
    gardening: "/scenes/shared/characters/at-home-idle.png"
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
  const manualWeatherOverride = weatherSettings.mode === "rain";
  const effectiveRaining = manualWeatherOverride || weatherState.isRaining;
  const managerMeta = statusMeta[actorState.status];
  const managerObjective =
    actorState.status === "at_home" ? atHomeModeMeta[actorState.homeMode].description : objectiveByStatus[actorState.status];
  const managerStory =
    actorState.status === "at_home" ? atHomeModeMeta[actorState.homeMode].description : managerMeta.description;
  const managerQueue =
    actorState.status === "at_home"
      ? {
          idle: ["保持待機站姿", "維持居家待命", "等待下一次管理指令"],
          gaming: ["切換娛樂狀態", "顯示打電動畫面", "維持居家放鬆節奏"],
          streaming: ["切換追劇畫面", "保持室內休閒氛圍", "等待下一次管理指令"],
          reading: ["切換讀書畫面", "維持安靜專注氛圍", "等待下一次管理指令"],
          thinking: ["切換沉思畫面", "保持安靜停頓節奏", "等待下一次管理指令"],
          eating: ["切換吃飯畫面", "帶出生活化節奏", "等待下一次管理指令"],
          cooking: ["切換烹飪畫面", "維持居家活動氛圍", "等待下一次管理指令"],
          gardening: ["切換種花畫面", "帶出療癒生活節奏", "等待下一次管理指令"]
        }[actorState.homeMode]
      : queueByStatus[actorState.status];
  const walkFrame1Path = "/scenes/shared/characters/走路1.png";
  const walkFrame2Path = "/scenes/shared/characters/走路2.png";
  const walkFrame3Path = "/scenes/shared/characters/走路3.png";
  const managerPlayer = useMemo<ScenePlayer>(
    () => ({
      ...actorState,
      isManager: true,
      roleLabel: "主管理者",
      permissions: [...playerPermissions.manager],
      story: managerStory,
      objective: managerObjective,
      queue: managerQueue
    }),
    [actorState, managerObjective, managerQueue, managerStory]
  );

  const realPlayers = useMemo<ScenePlayer[]>(
    () =>
      players.map((player) => {
        const isLyra = isLyraCharacter(player);
        const lyraStory =
          player.status === "at_home"
            ? lyraAtHomeStory[player.homeMode] ?? atHomeModeMeta[player.homeMode].description
            : player.status === "working"
              ? "Lyra 正在工作中，畫面會偏向俐落而專注的日常節奏。"
              : player.status === "going_home"
                ? "Lyra 正在奔跑回家，節奏會更輕快且有動態感。"
                : player.status === "cleaning"
                  ? "Lyra 正在打掃，場景會顯得更乾淨俐落。"
                  : player.status === "sleeping"
                    ? "Lyra 正在休息，整個場景會維持安靜柔和。"
                    : playerStoryByStatus[player.status];

        const lyraObjective =
          player.status === "at_home"
            ? lyraAtHomeObjective[player.homeMode] ?? atHomeModeMeta[player.homeMode].description
            : player.status === "working"
              ? "完成今天的工作節奏，維持專注與效率。"
              : player.status === "going_home"
                ? "以更輕巧的節奏回到家中，切換成生活模式。"
                : player.status === "cleaning"
                  ? "整理好居家空間，讓生活值恢復穩定。"
                  : player.status === "sleeping"
                    ? "讓 Lyra 安穩休息，為下一段節奏補充能量。"
                    : playerObjectiveByStatus[player.status];

        return {
          ...player,
          isManager: false,
          roleLabel: "玩家",
          permissions: [...playerPermissions.player],
          story: isLyra
            ? lyraStory
            : player.status === "at_home"
              ? atHomeModeMeta[player.homeMode].description
              : playerStoryByStatus[player.status],
          objective: isLyra
            ? lyraObjective
            : player.status === "at_home"
              ? atHomeModeMeta[player.homeMode].description
              : playerObjectiveByStatus[player.status],
          queue: isLyra && player.status === "at_home" ? lyraAtHomeQueue[player.homeMode] ?? playerQueueByStatus[player.status] : playerQueueByStatus[player.status]
        };
      }),
    [players]
  );

  const allPlayers = useMemo(() => [managerPlayer, ...realPlayers], [managerPlayer, realPlayers]);
  const deckPlayers = useMemo(() => {
    const others = realPlayers.filter((player) => player.id !== selectedPlayerId);
    if (selectedPlayerId === managerPlayer.id) {
      return others;
    }

    return [managerPlayer, ...others.filter((player) => player.id !== managerPlayer.id)];
  }, [managerPlayer, realPlayers, selectedPlayerId]);
  const activePlayer = allPlayers.find((player) => player.id === selectedPlayerId) ?? managerPlayer;
  const isActiveLyra = isLyraCharacter(activePlayer);
  const activeMeta = statusMeta[activePlayer.status];
  const featuredObjective = activePlayer.objective;
  const featuredLead = activePlayer.story;
  const featuredQueue = activePlayer.queue;
  const activeSpeechText = activePlayer.speechText?.trim() ?? "";
  const activeSpeechType = activePlayer.speechType ?? "custom";
  const activeSpeechTheme = getSpeechTheme(activePlayer, activePlayer.isManager);
  const activeSpeechPositionClass =
    activePlayer.status === "sleeping"
      ? styles.speechSleep
      : activePlayer.status === "biking"
        ? styles.speechBike
        : activePlayer.status === "going_home"
          ? styles.speechWalk
          : activePlayer.status === "cleaning"
            ? styles.speechClean
            : activePlayer.status === "working"
              ? styles.speechWork
              : activePlayer.homeMode === "gaming"
                ? styles.speechGaming
                : activePlayer.homeMode === "streaming"
                  ? styles.speechStreaming
                  : activePlayer.homeMode === "reading"
                    ? styles.speechReading
                    : styles.speechHome;
  const selectedDaySegment = timePhase === "night" ? "night" : "day";
  const selectedBackgroundPath = backgroundPathByStatus[activePlayer.status](viewportMode, selectedDaySegment, effectiveRaining);
  const selectedBackgroundImage = `${selectedBackgroundPath}?v=${assetVersions[selectedBackgroundPath] ?? "0"}`;
  const selectedCharacterWidth = characterWidthByStatus[activePlayer.status][viewportMode];
  const selectedCharacterPlacementBase = characterPlacementByStatus[activePlayer.status][viewportMode];
  const lyraDesktopBottomLift =
    isActiveLyra && viewportMode === "desktop"
      ? {
          working: 4,
          going_home: 4,
          biking: 3,
          cleaning: 4,
          sleeping: 6,
          at_home: 5
        }[activePlayer.status]
      : 0;
  const selectedCharacterPlacement = {
    ...selectedCharacterPlacementBase,
    bottom: selectedCharacterPlacementBase.bottom + lyraDesktopBottomLift
  };
  const selectedCharacterAsset = !activePlayer.isManager ? resolveCharacterStillAsset(activePlayer) : null;
  const needsCharacterSelection = !activePlayer.isManager && !selectedCharacterAsset;
  const selectedCharacterPath =
    (() => {
      if (selectedCharacterAsset) {
        return selectedCharacterAsset;
      }

      if (!activePlayer.isManager) {
        return null;
      }

      return activePlayer.status === "at_home"
        ? atHomeCharacterAssetByMode[activePlayer.homeMode]
        : characterAssetByStatus[activePlayer.status];
    })();
  const selectedCharacterScaleBoost =
    activePlayer.status === "at_home"
      ? {
          idle: 1,
          gaming: 1.42,
          streaming: 1.38,
          reading: 1.4,
          thinking: 1.3,
          eating: 1.34,
          cooking: 1.36,
          gardening: 1.34
        }[activePlayer.homeMode]
      : 1;
  const lyraStageScaleBoost = isActiveLyra
    ? viewportMode === "mobile"
      ? 1.3
      : 1.24
    : 1;
  const selectedBoostedCharacterWidth = selectedCharacterWidth * selectedCharacterScaleBoost * lyraStageScaleBoost;
  const selectedCharacterImage = selectedCharacterPath ? `${selectedCharacterPath}?v=${assetVersions[selectedCharacterPath] ?? "0"}` : null;
  const selectedWalkFrames = (() => {
    const profileWalkFrames = !activePlayer.isManager && activePlayer.status === "going_home" ? resolveCharacterWalkFrames(activePlayer) : null;

    if (profileWalkFrames?.length) {
      return profileWalkFrames.map((framePath) => `${framePath}?v=${assetVersions[framePath] ?? "0"}`);
    }

    return [
      `${walkFrame1Path}?v=${assetVersions[walkFrame1Path] ?? "0"}`,
      `${walkFrame2Path}?v=${assetVersions[walkFrame2Path] ?? "0"}`,
      `${walkFrame3Path}?v=${assetVersions[walkFrame3Path] ?? "0"}`
    ];
  })();
  useEffect(() => {
    if (!allPlayers.some((player) => player.id === selectedPlayerId)) {
      setSelectedPlayerId(managerPlayer.id);
    }
  }, [allPlayers, managerPlayer.id, selectedPlayerId]);

  const galleryPlayers: PlayerGalleryItem[] = [
    ...deckPlayers.slice(0, 4).map((player): PlayerGalleryItem => {
      const previewBackgroundPath = backgroundPathByStatus[player.status]("desktop", selectedDaySegment, effectiveRaining);
      const previewCharacterAsset = !player.isManager ? resolveCharacterStillAsset(player) : null;
      const previewCharacterPath = (() => {
        if (previewCharacterAsset) {
          return previewCharacterAsset;
        }

        return player.status === "at_home" ? atHomeCharacterAssetByMode[player.homeMode] : characterAssetByStatus[player.status];
      })();

      return {
        id: player.id,
        name: player.name,
        characterSummary: formatCharacterSummary(player),
        needsCharacterSelection: !player.isManager && !previewCharacterAsset,
        state: player,
        isManager: player.isManager,
        roleLabel: player.roleLabel,
        previewBackground: `${previewBackgroundPath}?v=${assetVersions[previewBackgroundPath] ?? "0"}`,
        previewCharacter: previewCharacterPath ? `${previewCharacterPath}?v=${assetVersions[previewCharacterPath] ?? "0"}` : "",
        previewObjective: player.objective,
        previewCharacterWidth:
          (player.status === "at_home" &&
          (player.homeMode === "gaming" ||
            player.homeMode === "streaming" ||
            player.homeMode === "reading" ||
            player.homeMode === "thinking" ||
            player.homeMode === "eating" ||
            player.homeMode === "cooking" ||
            player.homeMode === "gardening")
            ? 44
            : 36) * (isLyraCharacter(player) ? 1.2 : 1)
      };
    }),
    ...Array.from({ length: Math.max(0, 4 - deckPlayers.length) }, (_, index): PlayerGalleryItem => ({
      id: `placeholder-${index + 1}`,
      isPlaceholder: true,
      name: "",
      state: managerPlayer,
      isManager: false,
      roleLabel: "玩家",
      previewBackground: "",
      previewCharacter: "",
      previewObjective: "",
      previewCharacterWidth: 0
    }))
  ];
  const weatherDisplayLabel = manualWeatherOverride ? "手動雨天" : weatherState.label;
  const weatherDisplayHint = manualWeatherOverride
    ? "目前以管理者手動設定為主"
    : weatherState.ready
      ? "背景會依台中天氣與本地時間自動切換"
      : "正在偵測台中目前天氣";
  const isPlayerScene = sceneMode === "player";

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        {isPlayerScene ? (
          <section className={styles.playerEntryCard}>
            <div>
              <p className={styles.eyebrow}>Player Entry</p>
              <h2 className={styles.playerEntryTitle}>{activePlayer.name} 的個人頁</h2>
              <p className={styles.playerEntryLead}>這裡會直接聚焦你的角色舞台，方便從 Telegram 進入後立刻看到自己的狀態與場景。</p>
            </div>
            <Link href="/" className={styles.playerEntryLink}>
              返回首頁
            </Link>
          </section>
        ) : null}
        <section className={styles.hero}>
          <div className={styles.sceneColumn}>
            <div className={styles.sceneCard}>
              <div className={styles.topHud}>
                <div className={styles.hudBlock}>
                  <span className={styles.hudLabel}>district</span>
                  <strong>Funy City</strong>
                </div>
                <div className={styles.hudBlock}>
                  <span className={styles.hudLabel}>focus</span>
                  <strong>{activePlayer.name}</strong>
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
                    backgroundImage: `linear-gradient(180deg, rgba(9, 18, 28, 0.18), rgba(9, 18, 28, 0.3)), url(${selectedBackgroundImage})`,
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
                  className={`${styles.characterLayer} ${styles[`character${activePlayer.status}`]}`}
                  style={
                    {
                      ["--character-width" as string]: `${selectedBoostedCharacterWidth}%`,
                      ["--character-left" as string]: `${selectedCharacterPlacement.left}%`,
                      ["--character-bottom" as string]: `${selectedCharacterPlacement.bottom}%`
                    } as CSSProperties
                  }
                >
                  {needsCharacterSelection ? (
                    <div className={styles.characterFallback}>
                      <span>待選角</span>
                    </div>
                  ) : activePlayer.status === "going_home" ? (
                    <div className={styles.walkSprite} aria-label={`${activeMeta.label}中的主角`} role="img">
                      {selectedWalkFrames.map((src, index) => (
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
                      src={selectedCharacterImage as string}
                      alt={`${activeMeta.label}中的主角`}
                      width={770}
                      height={710}
                      priority
                      className={styles.characterImage}
                    />
                  )}
                  {activeSpeechText ? (
                    <div
                      className={`${styles.speechBubble} ${styles[`speech${activeSpeechType}`]} ${activeSpeechPositionClass}`}
                      style={
                        {
                          ["--speech-background" as string]: activeSpeechTheme.background,
                          ["--speech-border" as string]: activeSpeechTheme.border,
                          ["--speech-text" as string]: activeSpeechTheme.text,
                          ["--speech-glow" as string]: activeSpeechTheme.glow,
                          ["--speech-arrow-border" as string]: activeSpeechTheme.arrowBorder
                        } as CSSProperties
                      }
                    >
                      <span>{activeSpeechText}</span>
                    </div>
                  ) : null}
                </div>
                {notification ? (
                  <div key={notification.stamp} className={styles.flashNotice}>
                    <span className={styles.flashTag}>stage swapped</span>
                    <strong>{notification.title}</strong>
                    <p>{notification.body}</p>
                  </div>
                ) : null}
                <div className={styles.ambientLayer} aria-hidden="true">
                  {activePlayer.status === "working"
                    ? [0, 1, 2].map((index) => (
                        <span
                          key={`ambient-work-${index}`}
                          className={`${styles.ambientDot} ${styles.ambientWork}`}
                          style={{ left: `${43 + index * 4}%`, top: `${34 + (index % 2) * 6}%`, animationDelay: `${index * 0.35}s` }}
                        />
                      ))
                    : null}
                  {activePlayer.status === "cleaning"
                    ? [0, 1, 2, 3].map((index) => (
                        <span
                          key={`ambient-clean-${index}`}
                          className={`${styles.ambientDot} ${styles.ambientClean}`}
                          style={{ left: `${56 + (index % 2) * 5}%`, top: `${46 + Math.floor(index / 2) * 6}%`, animationDelay: `${index * 0.28}s` }}
                        />
                      ))
                    : null}
                  {activePlayer.status === "sleeping" ? <span className={styles.sleepBubble}>Zzz</span> : null}
                  {activePlayer.status === "biking"
                    ? [0, 1].map((index) => (
                        <span
                          key={`ambient-bike-${index}`}
                          className={`${styles.ambientStreak} ${styles.ambientBike}`}
                          style={{ left: `${40 + index * 14}%`, top: `${58 + index * 4}%`, animationDelay: `${index * 0.45}s` }}
                        />
                      ))
                    : null}
                  {activePlayer.status === "at_home" && activePlayer.homeMode === "gaming"
                    ? [0, 1, 2].map((index) => (
                        <span
                          key={`ambient-game-${index}`}
                          className={`${styles.ambientDot} ${styles.ambientGaming}`}
                          style={{ left: `${45 + index * 6}%`, top: `${40 + (index % 2) * 7}%`, animationDelay: `${index * 0.3}s` }}
                        />
                      ))
                    : null}
                  {activePlayer.status === "at_home" && activePlayer.homeMode === "streaming" ? (
                    <>
                      <span className={styles.streamGlow} />
                      <span className={styles.streamPlay}>▶</span>
                    </>
                  ) : null}
                  {activePlayer.status === "at_home" && activePlayer.homeMode === "reading"
                    ? [0, 1, 2].map((index) => (
                        <span
                          key={`ambient-read-${index}`}
                          className={`${styles.ambientDot} ${styles.ambientReading}`}
                          style={{ left: `${48 + index * 4}%`, top: `${42 + index * 5}%`, animationDelay: `${index * 0.4}s` }}
                        />
                      ))
                    : null}
                  {isLyraCharacter(activePlayer) && activePlayer.status === "at_home" && activePlayer.homeMode === "thinking"
                    ? [0, 1, 2].map((index) => (
                        <span
                          key={`ambient-think-${index}`}
                          className={`${styles.ambientDot} ${styles.ambientThinking}`}
                          style={{ left: `${47 + index * 5}%`, top: `${36 + index * 6}%`, animationDelay: `${index * 0.35}s` }}
                        />
                      ))
                    : null}
                  {isLyraCharacter(activePlayer) && activePlayer.status === "at_home" && activePlayer.homeMode === "eating"
                    ? [0, 1, 2].map((index) => (
                        <span
                          key={`ambient-eating-${index}`}
                          className={`${styles.ambientDot} ${styles.ambientEating}`}
                          style={{ left: `${46 + index * 6}%`, top: `${39 + index * 5}%`, animationDelay: `${index * 0.32}s` }}
                        />
                      ))
                    : null}
                  {isLyraCharacter(activePlayer) && activePlayer.status === "at_home" && activePlayer.homeMode === "cooking"
                    ? [0, 1, 2].map((index) => (
                        <span
                          key={`ambient-cooking-${index}`}
                          className={`${styles.ambientDot} ${styles.ambientCooking}`}
                          style={{ left: `${48 + index * 4}%`, top: `${34 + index * 5}%`, animationDelay: `${index * 0.3}s` }}
                        />
                      ))
                    : null}
                  {isLyraCharacter(activePlayer) && activePlayer.status === "at_home" && activePlayer.homeMode === "gardening"
                    ? [0, 1, 2, 3].map((index) => (
                        <span
                          key={`ambient-garden-${index}`}
                          className={`${styles.ambientDot} ${styles.ambientGardening}`}
                          style={{ left: `${45 + (index % 2) * 7}%`, top: `${40 + Math.floor(index / 2) * 7}%`, animationDelay: `${index * 0.28}s` }}
                        />
                      ))
                    : null}
                </div>
                {notification ? (
                  <div className={styles.effectLayer} aria-hidden="true">
                    {activePlayer.status === "working"
                      ? [0, 1, 2].map((index) => (
                          <span
                            key={`work-${index}`}
                            className={`${styles.effectBurst} ${styles.effectWork}`}
                            style={{ left: `${22 + index * 9}%`, top: `${26 + index * 4}%`, animationDelay: `${index * 120}ms` }}
                          />
                        ))
                      : null}
                    {activePlayer.status === "cleaning"
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
                  <p className={styles.overlayEyebrow}>{activePlayer.isManager ? "manager spotlight" : "player spotlight"}</p>
                  <h2 className={styles.overlayTitle}>{activePlayer.name}</h2>
                  <p className={styles.overlayBody}>{featuredObjective}</p>
                </div>
                <div className={styles.sceneOverlayRight}>
                  <p className={styles.overlayEyebrow}>active zone</p>
                  <strong>{zoneLabel[activePlayer.location] ?? activePlayer.location}</strong>
                  <span>{activePlayer.isManager ? "manager view pinned by default" : "tap any player card to feature here"}</span>
                </div>
                <div className={styles.bottomHud}>
                  <div className={styles.dockCard}>
                    <span className={styles.dockLabel}>avatar</span>
                    <strong>{activePlayer.name}</strong>
                  </div>
                  <div className={styles.dockCard}>
                    <span className={styles.dockLabel}>status</span>
                    <strong>{activePlayer.status === "at_home" ? atHomeModeMeta[activePlayer.homeMode].label : activeMeta.label}</strong>
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
                  <strong>{zoneLabel[activePlayer.location] ?? activePlayer.location}</strong>
                </div>
                <div className={styles.mobileStatCard}>
                  <span className={styles.dockLabel}>avatar</span>
                  <strong>{activePlayer.name}</strong>
                </div>
                <div className={styles.mobileStatCard}>
                  <span className={styles.dockLabel}>status</span>
                  <strong>{activePlayer.status === "at_home" ? atHomeModeMeta[activePlayer.homeMode].label : activeMeta.label}</strong>
                </div>
                <div className={styles.mobileStatCard}>
                  <span className={styles.dockLabel}>time</span>
                  <strong>{formatCurrentTime(currentDateTime)}</strong>
                </div>
              </div>
            </div>

            {!isPlayerScene ? (
              <WorkLogPanel
                targetName={activePlayer.name}
                workLogPage={workLogPage}
                onPageChange={setWorkLogCurrentPage}
                toLocalTime={toLocalTime}
              />
            ) : null}
            {!isPlayerScene ? <PlayerGallery players={galleryPlayers} activePlayerId={activePlayer.id} onSelect={setSelectedPlayerId} /> : null}
            {!isPlayerScene ? <KnowledgeListPanel knowledgePage={knowledgePage} toLocalTime={toLocalTime} /> : null}
          </div>
          <SelectedPlayerInfo
            player={{ ...activePlayer, story: featuredLead, objective: featuredObjective, queue: featuredQueue }}
            isPending={isPending}
            timePhaseLabel={phaseLabel[timePhase]}
            weatherLabel={weatherDisplayLabel}
            weatherHint={weatherDisplayHint}
            soundEnabled={soundEnabled}
            onToggleSound={() => setSoundEnabled((current) => !current)}
            notification={notification}
            toLocalTime={toLocalTime}
            zoneLabel={zoneLabel}
          />
        </section>

        {!isPlayerScene ? (
          <section className={styles.adminCard}>
          <div className={styles.adminHeader}>
            <div>
              <h2>多玩家首頁線框</h2>
              <p>這一區先用來展示首頁資訊架構。下一步可再把這些靜態玩家卡接到真實的 Firebase 玩家資料。</p>
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
                  data-active={activePlayer.status === status}
                  aria-pressed={activePlayer.status === status}
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
        ) : null}

      </div>
    </main>
  );
}
