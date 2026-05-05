export type ActorStatus =
  | "working"
  | "company_eating"
  | "field_work"
  | "going_home"
  | "shopping"
  | "cleaning"
  | "sleeping"
  | "biking"
  | "thinking"
  | "at_home";
export type AtHomeMode = "idle" | "gaming" | "streaming" | "reading" | "thinking" | "eating" | "cooking" | "gardening";
export type CharacterGender = "male" | "female";
export type SpeechType = "custom" | "preset" | "emoji" | "announcement";
export type PlayerLobbyStatus = "active" | "waitlist";
export type PlayerPlatform = "telegram" | "line" | "web";

export type ActorLocation = "office" | "road" | "home";

export interface ActorState {
  id: string;
  name: string;
  status: ActorStatus;
  homeMode: AtHomeMode;
  poseKey?: string;
  characterGender?: CharacterGender;
  characterId?: string;
  speechText?: string;
  speechType?: SpeechType;
  lobbyStatus?: PlayerLobbyStatus;
  joinedAt?: string;
  platform?: PlayerPlatform;
  platformUserId?: string;
  platformUsername?: string;
  telegramUserId?: string;
  telegramUsername?: string;
  isApproved?: boolean;
  isManager?: boolean;
  location: ActorLocation;
  updatedAt: string;
  updatedBy: string;
}
