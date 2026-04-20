import type { ActorState, ActorStatus, AtHomeMode, CharacterGender } from "@/types/actor";

export type CharacterCommandTarget = {
  status: ActorStatus;
  homeMode?: AtHomeMode;
  poseKey?: string;
};

export type CharacterDefinition = {
  id: string;
  label: string;
  gender: CharacterGender;
  pathSegment: string;
  keyboardRows: string[][];
  commands: Record<string, CharacterCommandTarget>;
  assets: {
    working?: string;
    cleaning?: string;
    sleeping?: string;
    biking?: string;
    atHome?: Partial<Record<AtHomeMode, string>>;
    poseFiles?: Record<string, string>;
    walkFrames?: Record<string, string[]>;
  };
};

const characterDefinitions: CharacterDefinition[] = [
  {
    id: "d-exhor",
    label: "D-exHor",
    gender: "male",
    pathSegment: "d-exhor",
    keyboardRows: [
      ["工作中", "散步中", "走路中"],
      ["睡覺中", "在家", "吃飯中"],
      ["抽菸中", "打瞌睡中", "拄杖中"]
    ],
    commands: {
      工作中: { status: "working", poseKey: "cane" },
      散步中: { status: "going_home", poseKey: "stroll" },
      走路中: { status: "going_home", poseKey: "walk" },
      睡覺中: { status: "sleeping" },
      在家: { status: "at_home", homeMode: "idle", poseKey: "idle" },
      吃飯中: { status: "at_home", homeMode: "eating", poseKey: "eating" },
      抽菸中: { status: "at_home", homeMode: "thinking", poseKey: "smoking" },
      打瞌睡中: { status: "at_home", homeMode: "idle", poseKey: "dozing" },
      拄杖中: { status: "working", poseKey: "cane" }
    },
    assets: {
      working: "老人-拿拐杖.png",
      sleeping: "老人-睡覺.png",
      atHome: {
        idle: "老人-站立.png",
        eating: "老人-吃飯.png",
        thinking: "老人-抽菸.png"
      },
      poseFiles: {
        idle: "老人-站立.png",
        eating: "老人-吃飯.png",
        smoking: "老人-抽菸.png",
        dozing: "老人-打瞌睡.png",
        cane: "老人-拿拐杖.png",
        stroll: "老人-散步.png",
        walk: "老人-走路.png"
      },
      walkFrames: {
        stroll: ["老人-散步.png", "老人-散步.png", "老人-散步.png"],
        walk: ["老人-走路.png", "老人-散步.png", "老人-走路.png"]
      }
    }
  },
  {
    id: "drovik",
    label: "Drovik",
    gender: "male",
    pathSegment: "drovik",
    keyboardRows: [
      ["工作中", "走路中", "衝刺中"],
      ["騎車中", "睡覺中", "在家"],
      ["打電動中", "沉思中", "打籃球中"]
    ],
    commands: {
      工作中: { status: "working" },
      走路中: { status: "going_home", poseKey: "walk" },
      衝刺中: { status: "going_home", poseKey: "sprint" },
      騎車中: { status: "biking" },
      睡覺中: { status: "sleeping" },
      在家: { status: "at_home", homeMode: "idle", poseKey: "idle" },
      打電動中: { status: "at_home", homeMode: "gaming", poseKey: "gaming" },
      沉思中: { status: "at_home", homeMode: "thinking", poseKey: "thinking" },
      打籃球中: { status: "at_home", homeMode: "gaming", poseKey: "basketball" }
    },
    assets: {
      working: "帥哥-工作.png",
      sleeping: "帥哥-睡覺.png",
      biking: "帥哥-騎車.png",
      atHome: {
        idle: "帥哥-站立.png",
        gaming: "帥哥-打電動.png",
        thinking: "帥哥-沉思.png"
      },
      poseFiles: {
        idle: "帥哥-站立.png",
        gaming: "帥哥-打電動.png",
        thinking: "帥哥-沉思.png",
        basketball: "帥哥-打籃球.png",
        sprint: "帥哥-衝刺.png",
        walk: "帥哥-走路.png"
      },
      walkFrames: {
        walk: ["帥哥-走路.png", "帥哥-走路.png", "帥哥-走路.png"],
        sprint: ["帥哥-衝刺.png", "帥哥-走路.png", "帥哥-衝刺.png"]
      }
    }
  },
  {
    id: "strong",
    label: "Strong",
    gender: "male",
    pathSegment: "Strong",
    keyboardRows: [
      ["工作中", "走路中", "奔跑中"],
      ["騎重機中", "睡覺中", "在家"],
      ["抽菸中", "打拳中", "吼叫中"]
    ],
    commands: {
      工作中: { status: "working" },
      走路中: { status: "going_home", poseKey: "walk" },
      奔跑中: { status: "going_home", poseKey: "run" },
      騎重機中: { status: "biking", poseKey: "heavy-bike" },
      睡覺中: { status: "sleeping" },
      在家: { status: "at_home", homeMode: "idle", poseKey: "idle" },
      抽菸中: { status: "at_home", homeMode: "thinking", poseKey: "smoking" },
      打拳中: { status: "at_home", homeMode: "gaming", poseKey: "punch" },
      吼叫中: { status: "at_home", homeMode: "streaming", poseKey: "roaring" }
    },
    assets: {
      working: "猛男-工作.png",
      sleeping: "猛男-睡覺.png",
      biking: "猛男-騎重機.png",
      atHome: {
        idle: "猛男-站立.png",
        thinking: "猛男-抽菸.png",
        gaming: "猛男-打拳.png",
        streaming: "猛男-吼叫.png"
      },
      poseFiles: {
        idle: "猛男-站立.png",
        smoking: "猛男-抽菸.png",
        punch: "猛男-打拳.png",
        roaring: "猛男-吼叫.png",
        run: "猛男-奔跑.png",
        walk: "猛男-走路.png",
        "heavy-bike": "猛男-騎重機.png"
      },
      walkFrames: {
        walk: ["猛男-走路.png", "猛男-走路.png", "猛男-走路.png"],
        run: ["猛男-奔跑.png", "猛男-走路.png", "猛男-奔跑.png"]
      }
    }
  },
  {
    id: "lyra",
    label: "Lyra",
    gender: "female",
    pathSegment: "lyra",
    keyboardRows: [
      ["工作中", "奔跑中", "打掃中"],
      ["睡覺中", "在家", "沉思中"],
      ["吃飯中", "烹飪中", "種花中"]
    ],
    commands: {
      工作中: { status: "working" },
      奔跑中: { status: "going_home", poseKey: "run" },
      打掃中: { status: "cleaning" },
      睡覺中: { status: "sleeping" },
      在家: { status: "at_home", homeMode: "idle" },
      沉思中: { status: "at_home", homeMode: "thinking" },
      吃飯中: { status: "at_home", homeMode: "eating" },
      烹飪中: { status: "at_home", homeMode: "cooking" },
      種花中: { status: "at_home", homeMode: "gardening" }
    },
    assets: {
      working: "working.png",
      cleaning: "cleaning.png",
      sleeping: "sleeping.png",
      biking: "biking.png",
      atHome: {
        idle: "at-home-idle.png",
        thinking: "at-home-thinking.png",
        eating: "at-home-eating.png",
        cooking: "at-home-cooking.png",
        gardening: "at-home-gardening.png"
      },
      poseFiles: {
        run: "going-home-1.png"
      },
      walkFrames: {
        run: ["going-home-1.png", "going-home-2.png", "going-home-3.png"]
      }
    }
  },
  {
    id: "niva",
    label: "Niva",
    gender: "female",
    pathSegment: "niva",
    keyboardRows: [
      ["上班中", "走路中", "開車中"],
      ["睡覺中", "在家", "看書中"],
      ["吃飯中", "喝茶中"]
    ],
    commands: {
      上班中: { status: "working" },
      走路中: { status: "going_home", poseKey: "walk" },
      開車中: { status: "biking", poseKey: "driving" },
      睡覺中: { status: "sleeping" },
      在家: { status: "at_home", homeMode: "idle", poseKey: "idle" },
      看書中: { status: "at_home", homeMode: "reading", poseKey: "reading" },
      吃飯中: { status: "at_home", homeMode: "eating", poseKey: "eating" },
      喝茶中: { status: "at_home", homeMode: "thinking", poseKey: "tea" }
    },
    assets: {
      working: "妙齡女子-上班.png",
      sleeping: "妙齡女子-睡覺.png",
      biking: "妙齡女子-開車.png",
      atHome: {
        idle: "妙齡女子-坐著.png",
        reading: "妙齡女子-看書.png",
        eating: "妙齡女子-吃飯.png",
        thinking: "妙齡女子-喝茶.png"
      },
      poseFiles: {
        idle: "妙齡女子-坐著.png",
        reading: "妙齡女子-看書.png",
        eating: "妙齡女子-吃飯.png",
        tea: "妙齡女子-喝茶.png",
        driving: "妙齡女子-開車.png",
        walk: "妙齡女子-走路.png"
      },
      walkFrames: {
        walk: ["妙齡女子-走路.png", "妙齡女子-走路.png", "妙齡女子-走路.png"]
      }
    }
  },
  {
    id: "amy",
    label: "Amy",
    gender: "female",
    pathSegment: "Amy",
    keyboardRows: [
      ["上班中", "走路中", "坐車中"],
      ["睡覺中", "在家", "看書中"],
      ["吃飯中", "看電視中", "逛街中"]
    ],
    commands: {
      上班中: { status: "working" },
      走路中: { status: "going_home", poseKey: "walk" },
      坐車中: { status: "biking", poseKey: "riding" },
      睡覺中: { status: "sleeping" },
      在家: { status: "at_home", homeMode: "idle", poseKey: "idle" },
      看書中: { status: "at_home", homeMode: "reading", poseKey: "reading" },
      吃飯中: { status: "at_home", homeMode: "eating", poseKey: "eating" },
      看電視中: { status: "at_home", homeMode: "streaming", poseKey: "tv" },
      逛街中: { status: "going_home", poseKey: "shopping" }
    },
    assets: {
      working: "上班族女性-上班.png",
      sleeping: "上班族女性-睡覺.png",
      biking: "上班族女性-坐車.png",
      atHome: {
        idle: "上班族女性-坐著.png",
        reading: "上班族女性-看書.png",
        eating: "上班族女性-吃飯.png",
        streaming: "上班族女性-看電視.png"
      },
      poseFiles: {
        idle: "上班族女性-坐著.png",
        reading: "上班族女性-看書.png",
        eating: "上班族女性-吃飯.png",
        tv: "上班族女性-看電視.png",
        shopping: "上班族女性-逛街.png",
        riding: "上班族女性-坐車.png",
        walk: "上班族女性-走路.png"
      },
      walkFrames: {
        walk: ["上班族女性-走路.png", "上班族女性-走路.png", "上班族女性-走路.png"],
        shopping: ["上班族女性-逛街.png", "上班族女性-走路.png", "上班族女性-逛街.png"]
      }
    }
  }
];

export const characterCatalog = {
  male: characterDefinitions.filter((character) => character.gender === "male").map(({ id, label }) => ({ id, label })),
  female: characterDefinitions.filter((character) => character.gender === "female").map(({ id, label }) => ({ id, label }))
} as const;

export function getCharacterDefinition(gender?: CharacterGender, characterId?: string) {
  if (!gender || !characterId) {
    return null;
  }

  return characterDefinitions.find((character) => character.gender === gender && character.id === characterId) ?? null;
}

export function getCharacterDefinitionFromActor(actor?: Pick<ActorState, "characterGender" | "characterId"> | null) {
  return getCharacterDefinition(actor?.characterGender, actor?.characterId);
}

export function getCharacterCommandTarget(
  text: string,
  actor?: Pick<ActorState, "characterGender" | "characterId"> | null
) {
  const definition = getCharacterDefinitionFromActor(actor);
  if (!definition) {
    return null;
  }

  return definition.commands[text] ?? null;
}

export function getCharacterKeyboardRows(actor?: Pick<ActorState, "characterGender" | "characterId"> | null) {
  return getCharacterDefinitionFromActor(actor)?.keyboardRows ?? null;
}

export function getAllCharacterCommandLabels() {
  return characterDefinitions.flatMap((character) => Object.keys(character.commands));
}

export function getCharacterAssetBase(actor?: Pick<ActorState, "characterGender" | "characterId"> | null) {
  const definition = getCharacterDefinitionFromActor(actor);
  if (!definition) {
    return null;
  }

  return `/scenes/shared/characters/${definition.gender}/${definition.pathSegment}`;
}

export function resolveCharacterStillAsset(actor: Pick<ActorState, "characterGender" | "characterId" | "status" | "homeMode" | "poseKey">) {
  const definition = getCharacterDefinitionFromActor(actor);
  if (!definition) {
    return null;
  }

  const poseFile = actor.poseKey ? definition.assets.poseFiles?.[actor.poseKey] : null;
  const base = getCharacterAssetBase(actor);

  if (!base) {
    return null;
  }

  if (poseFile) {
    return `${base}/${poseFile}`;
  }

  if (actor.status === "working" && definition.assets.working) {
    return `${base}/${definition.assets.working}`;
  }

  if (actor.status === "cleaning" && definition.assets.cleaning) {
    return `${base}/${definition.assets.cleaning}`;
  }

  if (actor.status === "sleeping" && definition.assets.sleeping) {
    return `${base}/${definition.assets.sleeping}`;
  }

  if (actor.status === "biking" && definition.assets.biking) {
    return `${base}/${definition.assets.biking}`;
  }

  if (actor.status === "at_home") {
    const atHomeFile = definition.assets.atHome?.[actor.homeMode] ?? definition.assets.atHome?.idle;
    if (atHomeFile) {
      return `${base}/${atHomeFile}`;
    }
  }

  if (actor.status === "going_home") {
    const walkFrames = definition.assets.walkFrames?.[actor.poseKey ?? "walk"];
    if (walkFrames?.[0]) {
      return `${base}/${walkFrames[0]}`;
    }
  }

  return null;
}

export function resolveCharacterWalkFrames(actor: Pick<ActorState, "characterGender" | "characterId" | "poseKey">) {
  const definition = getCharacterDefinitionFromActor(actor);
  const base = getCharacterAssetBase(actor);

  if (!definition || !base) {
    return null;
  }

  const candidate = definition.assets.walkFrames?.[actor.poseKey ?? "walk"];
  if (!candidate?.length) {
    return null;
  }

  return candidate.map((fileName) => `${base}/${fileName}`);
}
