import type { ActorLocation, ActorState, ActorStatus, AtHomeMode } from "@/types/actor";

export const DEFAULT_ACTOR_ID = "main-character";

export const statusMeta: Record<
  ActorStatus,
  {
    label: string;
    description: string;
    location: ActorLocation;
    emoji: string;
    accent: string;
  }
> = {
  working: {
    label: "工作中",
    description: "主角待在辦公大樓區，專注投入今天的任務。",
    location: "office",
    emoji: "PC",
    accent: "#ffcc4d"
  },
  company_eating: {
    label: "公司吃飯",
    description: "主角在公司用餐，短暫補充體力後準備回到任務節奏。",
    location: "office",
    emoji: "ME",
    accent: "#f1a96d"
  },
  field_work: {
    label: "外出工作",
    description: "主角外出處理工作任務，場景維持辦公區與城市行動感。",
    location: "office",
    emoji: "FW",
    accent: "#7cc6ff"
  },
  going_home: {
    label: "回家中",
    description: "主角穿過街道返回住宅區，城市節奏也跟著慢下來。",
    location: "road",
    emoji: "GO",
    accent: "#8ed1fc"
  },
  shopping: {
    label: "買東西",
    description: "主角在住家附近買東西，畫面會偏向日常生活與補給感。",
    location: "home",
    emoji: "SH",
    accent: "#f4c76d"
  },
  cleaning: {
    label: "打掃中",
    description: "主角回到住家，正在整理環境與打掃空間。",
    location: "home",
    emoji: "CL",
    accent: "#88d498"
  },
  sleeping: {
    label: "睡覺中",
    description: "主角正在家中休息，場景節奏會變得更安靜。",
    location: "home",
    emoji: "ZZ",
    accent: "#c8b8ff"
  },
  biking: {
    label: "騎車中",
    description: "主角正騎車移動中，整體節奏偏向通勤與外出。",
    location: "road",
    emoji: "BK",
    accent: "#7fc8f8"
  },
  thinking: {
    label: "沉思",
    description: "主角暫停腳步整理思緒，會依目前所在區域切換公司或住家背景。",
    location: "home",
    emoji: "TH",
    accent: "#c6d4ff"
  },
  at_home: {
    label: "在家",
    description: "主角在家中待命，畫面保持平靜的待機狀態。",
    location: "home",
    emoji: "HM",
    accent: "#f1d18a"
  }
};

export const defaultActorState: ActorState = {
  id: DEFAULT_ACTOR_ID,
  name: "D-exHor",
  status: "working",
  homeMode: "idle",
  speechText: "",
  speechType: "custom",
  location: "office",
  updatedAt: new Date("2026-04-04T00:00:00.000Z").toISOString(),
  updatedBy: "system"
};

export const atHomeModeMeta: Record<
  AtHomeMode,
  {
    label: string;
    description: string;
  }
> = {
  idle: {
    label: "在家",
    description: "主角在家中待命，畫面保持平靜的待機狀態。"
  },
  gaming: {
    label: "在家・打電動",
    description: "主角正在家裡打電動，整體氛圍更偏向放鬆娛樂。"
  },
  streaming: {
    label: "在家・追劇",
    description: "主角正在家中追劇，場景會呈現更悠閒的居家感。"
  },
  reading: {
    label: "在家・讀書",
    description: "主角在家中讀書，整體節奏安靜且專注。"
  },
  thinking: {
    label: "在家・沉思",
    description: "主角正在家中沉思，畫面會呈現更安靜內斂的節奏。"
  },
  eating: {
    label: "在家・吃飯",
    description: "主角正在家裡吃飯，整體氛圍更有生活感。"
  },
  cooking: {
    label: "在家・烹飪",
    description: "主角正在家中烹飪，場景會帶出更明顯的生活節奏。"
  },
  gardening: {
    label: "在家・種花",
    description: "主角正在家中種花，整體氛圍偏向悠閒且療癒。"
  }
};

export function buildActorState(status: ActorStatus, updatedBy: string, homeMode?: AtHomeMode, locationOverride?: ActorLocation): ActorState {
  return {
    ...defaultActorState,
    status,
    homeMode: status === "at_home" ? homeMode ?? defaultActorState.homeMode : defaultActorState.homeMode,
    location: locationOverride ?? statusMeta[status].location,
    updatedAt: new Date().toISOString(),
    updatedBy
  };
}
