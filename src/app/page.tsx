import { PixelTownScene } from "@/components/scene/PixelTownScene";
import { getActorState } from "@/lib/firebase/actors";
import { listPlayers } from "@/lib/firebase/players";
import { listKnowledgeItems } from "@/lib/firebase/knowledge";
import { listWorkLogs } from "@/lib/firebase/work-log";
import { getWeatherSettings } from "@/lib/firebase/weather";
import { getSceneAssetVersions } from "@/lib/scenes/asset-versions";

export const dynamic = "force-dynamic";

type HomePageProps = {
  searchParams?: Promise<{
    page?: string;
    logPage?: string;
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const page = Number(resolvedSearchParams?.page ?? "1");
  const logPage = Number(resolvedSearchParams?.logPage ?? "1");
  const actorState = await getActorState();
  const players = await listPlayers();
  const weatherSettings = await getWeatherSettings();
  const knowledgePage = await listKnowledgeItems(page, 5);
  const workLogPage = await listWorkLogs(actorState.id, logPage, 5);
  const assetVersions = getSceneAssetVersions();

  return (
    <PixelTownScene
      initialState={actorState}
      initialPlayers={players}
      initialWeatherSettings={weatherSettings}
      assetVersions={assetVersions}
      knowledgePage={knowledgePage}
      initialWorkLogPage={workLogPage}
    />
  );
}
