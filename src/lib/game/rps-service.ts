import { createGameEvent, createGameMatch, getGameMatch, listGameEvents, listOpenRpsMatches, saveGameMatch } from "@/lib/firebase/game";
import { getPlayerById } from "@/lib/firebase/players";
import type { ActorState } from "@/types/actor";
import type { GameEvent, GameMatch, GameParticipant, RpsMove } from "@/types/game";

export const rpsMoveLabels: Record<RpsMove, string> = {
  rock: "石頭",
  paper: "布",
  scissors: "剪刀"
};

function toParticipant(player: ActorState): GameParticipant {
  return {
    playerId: player.id,
    name: player.name,
    platform: player.platform ?? "telegram",
    platformUserId: player.platformUserId ?? player.telegramUserId ?? player.id
  };
}

export function buildTelegramManagerRpsParticipant(userId: string): GameParticipant {
  return {
    playerId: userId,
    name: "D-exHor",
    platform: "telegram",
    platformUserId: userId
  };
}

function getOpponent(match: GameMatch, playerId: string) {
  if (match.playerA.playerId === playerId) {
    return match.playerB;
  }

  if (match.playerB?.playerId === playerId) {
    return match.playerA;
  }

  return null;
}

function getMoveForPlayer(match: GameMatch, playerId: string) {
  if (match.playerA.playerId === playerId) {
    return match.playerAMove;
  }

  if (match.playerB?.playerId === playerId) {
    return match.playerBMove;
  }

  return undefined;
}

function resolveWinner(match: GameMatch): string | null {
  const moveA = match.playerAMove;
  const moveB = match.playerBMove;

  if (!moveA || !moveB || moveA === moveB) {
    return null;
  }

  const playerAWins =
    (moveA === "rock" && moveB === "scissors") ||
    (moveA === "scissors" && moveB === "paper") ||
    (moveA === "paper" && moveB === "rock");

  return playerAWins ? match.playerA.playerId : match.playerB?.playerId ?? null;
}

function buildResultMessage(match: GameMatch, winnerId: string | null) {
  const moveA = match.playerAMove ? rpsMoveLabels[match.playerAMove] : "未出拳";
  const moveB = match.playerBMove ? rpsMoveLabels[match.playerBMove] : "未出拳";

  if (!match.playerB) {
    return `${match.playerA.name} 正在等待對手加入猜拳。`;
  }

  if (!winnerId) {
    return `${match.playerA.name} 出了${moveA}，${match.playerB.name} 出了${moveB}，結果是平手。`;
  }

  const winner = winnerId === match.playerA.playerId ? match.playerA : match.playerB;
  return `${match.playerA.name} 出了${moveA}，${match.playerB.name} 出了${moveB}，${winner.name} 勝利。`;
}

async function resolveCompletedMatch(nextMatch: GameMatch, move: RpsMove, now: string) {
  const playerB = nextMatch.playerB;
  const playerAMove = nextMatch.playerAMove;
  const playerBMove = nextMatch.playerBMove;
  if (!playerB || !playerAMove || !playerBMove) {
    return { ok: false as const, reason: "match_not_ready", match: nextMatch };
  }

  const winnerId = resolveWinner(nextMatch);
  const resolvedMatch: GameMatch = {
    ...nextMatch,
    status: "resolved",
    winnerId,
    resolvedAt: now,
    updatedAt: now
  };
  await saveGameMatch(resolvedMatch);

  const eventResult = await createGameEvent({
    type: "rps_result",
    title: winnerId ? "猜拳勝負已分" : "猜拳平手",
    message: buildResultMessage(resolvedMatch, winnerId),
    playerIds: [resolvedMatch.playerA.playerId, playerB.playerId],
    players: [resolvedMatch.playerA, playerB],
    result: winnerId ? "win" : "draw",
    winnerId,
    moves: {
      [resolvedMatch.playerA.playerId]: playerAMove,
      [playerB.playerId]: playerBMove
    },
    createdAt: now
  });

  return {
    ok: true as const,
    action: "resolved" as const,
    match: resolvedMatch,
    move,
    event: eventResult.ok ? eventResult.event : null
  };
}

export async function startOrJoinRpsMatch(playerId: string, fallbackParticipant?: GameParticipant) {
  const player = await getPlayerById(playerId);
  if (!player && !fallbackParticipant) {
    return { ok: false as const, reason: "player_not_found" };
  }

  const participant = player ? toParticipant(player) : fallbackParticipant!;
  const openMatches = await listOpenRpsMatches();
  const ownMatch = openMatches.find((match) => match.playerA.playerId === playerId || match.playerB?.playerId === playerId);

  if (ownMatch) {
    const opponent = getOpponent(ownMatch, playerId);
    return {
      ok: true as const,
      action: ownMatch.status === "waiting" ? "waiting" : "active",
      match: ownMatch,
      opponent,
      participant
    };
  }

  const waitingMatch = openMatches.find((match) => match.status === "waiting" && match.playerA.playerId !== playerId);
  const now = new Date().toISOString();

  if (waitingMatch) {
    const nextMatch: GameMatch = {
      ...waitingMatch,
      status: "active",
      playerB: participant,
      updatedAt: now
    };
    await saveGameMatch(nextMatch);

    return {
      ok: true as const,
      action: "joined",
      match: nextMatch,
      opponent: nextMatch.playerA,
      participant
    };
  }

  const match: GameMatch = {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `rps-${Date.now()}-${playerId}`,
    type: "rock_paper_scissors",
    status: "waiting",
    playerA: participant,
    createdAt: now,
    updatedAt: now
  };

  const result = await createGameMatch(match);
  if (!result.ok) {
    return { ok: false as const, reason: result.reason };
  }

  return {
    ok: true as const,
    action: "created",
    match,
    opponent: null,
    participant
  };
}

export async function submitRpsMove(playerId: string, move: RpsMove, fallbackParticipant?: GameParticipant) {
  const player = await getPlayerById(playerId);
  const participant = player ? toParticipant(player) : fallbackParticipant;
  const openMatches = await listOpenRpsMatches();
  const match = openMatches.find((item) => item.playerA.playerId === playerId || item.playerB?.playerId === playerId);
  const now = new Date().toISOString();

  if (!match) {
    if (!participant) {
      return { ok: false as const, reason: "match_not_found" };
    }

    const waitingMatch = openMatches.find((item) => item.status === "waiting" && item.playerA.playerId !== playerId);
    if (waitingMatch) {
      const nextMatch: GameMatch = {
        ...waitingMatch,
        status: "active",
        playerB: participant,
        playerBMove: move,
        updatedAt: now
      };

      if (nextMatch.playerAMove) {
        return resolveCompletedMatch(nextMatch, move, now);
      }

      await saveGameMatch(nextMatch);
      return {
        ok: true as const,
        action: "move_saved" as const,
        match: nextMatch,
        move
      };
    }

    const nextMatch: GameMatch = {
      id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `rps-${Date.now()}-${playerId}`,
      type: "rock_paper_scissors",
      status: "waiting",
      playerA: participant,
      playerAMove: move,
      createdAt: now,
      updatedAt: now
    };

    const result = await createGameMatch(nextMatch);
    if (!result.ok) {
      return { ok: false as const, reason: result.reason };
    }

    return {
      ok: true as const,
      action: "move_saved" as const,
      match: nextMatch,
      move
    };
  }

  if (getMoveForPlayer(match, playerId)) {
    return { ok: false as const, reason: "move_already_submitted", match };
  }

  const nextMatch: GameMatch =
    match.playerA.playerId === playerId
      ? { ...match, playerAMove: move, updatedAt: now }
      : { ...match, playerBMove: move, updatedAt: now };

  if (!nextMatch.playerAMove || !nextMatch.playerBMove) {
    await saveGameMatch(nextMatch);
    return {
      ok: true as const,
      action: "move_saved" as const,
      match: nextMatch,
      move
    };
  }

  return resolveCompletedMatch(nextMatch, move, now);
}

export async function getRpsMatchForPlayer(playerId: string) {
  const openMatches = await listOpenRpsMatches();
  return openMatches.find((match) => match.playerA.playerId === playerId || match.playerB?.playerId === playerId) ?? null;
}

export async function getRpsMatchById(matchId: string) {
  return getGameMatch(matchId);
}

export async function listRecentGameEvents(limit = 5): Promise<GameEvent[]> {
  return listGameEvents(limit);
}
