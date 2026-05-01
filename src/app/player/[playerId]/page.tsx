import { notFound } from "next/navigation";

import { PixelTownScene } from "@/components/scene/PixelTownScene";
import { getActorState } from "@/lib/firebase/actors";
import { getPlayerById, listAllPlayers } from "@/lib/firebase/players";
import { listKnowledgeItems } from "@/lib/firebase/knowledge";
import { listWorkLogs } from "@/lib/firebase/work-log";
import { listRecentGameEvents } from "@/lib/game/rps-service";
import { getWeatherSettings } from "@/lib/firebase/weather";
import { getSceneAssetVersions } from "@/lib/scenes/asset-versions";

export const dynamic = "force-dynamic";

type PlayerPageProps = {
  params: Promise<{
    playerId: string;
  }>;
  searchParams?: Promise<{
    logPage?: string;
  }>;
};

export default async function PlayerPage({ params, searchParams }: PlayerPageProps) {
  const { playerId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const logPage = Number(resolvedSearchParams?.logPage ?? "1");
  const player = await getPlayerById(playerId);

  if (!player) {
    notFound();
  }

  const actorState = await getActorState();
  const players = await listAllPlayers();
  const weatherSettings = await getWeatherSettings();
  const knowledgePage = await listKnowledgeItems(1, 5);
  const workLogPage = await listWorkLogs(player.id, logPage, 5);
  const gameEvents = await listRecentGameEvents(5);
  const assetVersions = getSceneAssetVersions();

  return (
    <PixelTownScene
      initialState={actorState}
      initialPlayers={players}
      initialWeatherSettings={weatherSettings}
      assetVersions={assetVersions}
      knowledgePage={knowledgePage}
      initialWorkLogPage={workLogPage}
      initialGameEvents={gameEvents}
      initialFocusPlayerId={player.id}
      sceneMode="player"
    />
  );
}
