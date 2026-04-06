import { PixelTownScene } from "@/components/scene/PixelTownScene";
import { getActorState } from "@/lib/firebase/actors";
import { listKnowledgeItems } from "@/lib/firebase/knowledge";
import { getWeatherSettings } from "@/lib/firebase/weather";
import { getSceneAssetVersions } from "@/lib/scenes/asset-versions";

export const dynamic = "force-dynamic";

type HomePageProps = {
  searchParams?: Promise<{
    page?: string;
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const page = Number(resolvedSearchParams?.page ?? "1");
  const actorState = await getActorState();
  const weatherSettings = await getWeatherSettings();
  const knowledgePage = await listKnowledgeItems(page, 5);
  const assetVersions = getSceneAssetVersions();

  return (
    <PixelTownScene
      initialState={actorState}
      initialWeatherSettings={weatherSettings}
      assetVersions={assetVersions}
      knowledgePage={knowledgePage}
    />
  );
}
