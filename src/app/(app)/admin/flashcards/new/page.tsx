import { loadExamTracks } from "@/lib/admin/loaders";
import {
  loadAllSystemsForAdmin,
  loadTopicsForTrackAdmin,
  loadAISavedFlashcardSets,
  loadStudyGuideSectionsForImport,
} from "@/lib/admin/flashcard-studio-loaders";
import { loadAllTopicsForAdmin } from "@/lib/admin/question-studio-loaders";
import { FlashcardProductionStudio } from "@/components/admin/FlashcardProductionStudio";

type Props = { searchParams: Promise<{ trackId?: string }> };

export default async function NewFlashcardDeckPage({ searchParams }: Props) {
  const { trackId } = await searchParams;

  const [tracks, systems, topicsForTrack, allTopics, aiSets, guideSections] =
    await Promise.all([
      loadExamTracks(),
      loadAllSystemsForAdmin(),
      loadTopicsForTrackAdmin(trackId ?? null),
      loadAllTopicsForAdmin(),
      loadAISavedFlashcardSets(30),
      loadStudyGuideSectionsForImport(trackId ?? null),
    ]);

  const trackOptions = tracks.map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
  }));

  const topics = topicsForTrack.length > 0 ? topicsForTrack : allTopics;

  return (
    <FlashcardProductionStudio
      tracks={trackOptions}
      systems={systems}
      topics={topics}
      studyGuideSections={guideSections}
      aiSavedSets={aiSets}
      defaultTrackId={trackId ?? undefined}
    />
  );
}
