import type { PlayerPlatform } from "@/types/actor";

export type RpsMove = "rock" | "paper" | "scissors";
export type GameMatchStatus = "waiting" | "active" | "resolved" | "expired";
export type GameEventType = "rps_result";

export interface GameParticipant {
  playerId: string;
  name: string;
  platform: PlayerPlatform;
  platformUserId: string;
}

export interface GameMatch {
  id: string;
  type: "rock_paper_scissors";
  status: GameMatchStatus;
  playerA: GameParticipant;
  playerB?: GameParticipant;
  playerAMove?: RpsMove;
  playerBMove?: RpsMove;
  winnerId?: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface GameEvent {
  id: string;
  type: GameEventType;
  title: string;
  message: string;
  playerIds: string[];
  players: GameParticipant[];
  result: "win" | "draw";
  winnerId?: string | null;
  moves: Record<string, RpsMove>;
  createdAt: string;
}
