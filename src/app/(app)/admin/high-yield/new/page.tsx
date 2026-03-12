import { loadExamTracks } from "@/lib/admin/loaders";
import {
  loadAllSystemsForAdmin,
  loadTopicsForTrackAdmin,
} from "@/lib/admin/high-yield-studio-loaders";
import { loadAllTopicsForAdmin } from "@/lib/admin/question-studio-loaders";
import { HighYieldProductionStudio } from "@/components/admin/HighYieldProductionStudio";

type Props = { searchParams: Promise<{ trackId?: string }> };

export default async function NewHighYieldItemPage({ searchParams }: Props) {
  const { trackId } = await searchParams;

  const [tracks, systems, topicsForTrack, allTopics] = await Promise.all([
    loadExamTracks(),
    loadAllSystemsForAdmin(),
    loadTopicsForTrackAdmin(trackId ?? null),
    loadAllTopicsForAdmin(),
  ]);
  const topics = topicsForTrack.length > 0 ? topicsForTrack : allTopics;

  const trackOptions = tracks.map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
  }));

  return (
    <HighYieldProductionStudio
      tracks={trackOptions}
      systems={systems}
      topics={topics}
      defaultTrackId={trackId ?? undefined}
    />
  );
}
