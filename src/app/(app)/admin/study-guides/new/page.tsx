import { loadExamTracks } from "@/lib/admin/loaders";
import {
  loadAllSystemsForAdmin,
  loadAdminStudyGuideForEdit,
  loadTopicsForTrackAdmin,
} from "@/lib/admin/study-guide-studio-loaders";
import { loadAllTopicsForAdmin } from "@/lib/admin/question-studio-loaders";
import { StudyGuideProductionStudio } from "@/components/admin/StudyGuideProductionStudio";

type Props = { searchParams: Promise<{ trackId?: string; cloneFrom?: string }> };

export default async function NewStudyGuidePage({ searchParams }: Props) {
  const { trackId, cloneFrom } = await searchParams;

  const cloneSource = cloneFrom ? await loadAdminStudyGuideForEdit(cloneFrom) : null;
  const effectiveTrackId = trackId ?? cloneSource?.examTrackId ?? null;

  const [tracks, systems, topicsForTrack, allTopics] = await Promise.all([
    loadExamTracks(),
    loadAllSystemsForAdmin(),
    loadTopicsForTrackAdmin(effectiveTrackId),
    loadAllTopicsForAdmin(),
  ]);
  const topics = topicsForTrack.length > 0 ? topicsForTrack : allTopics;

  const trackOptions = tracks.map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
  }));

  const initialGuide = cloneSource
    ? {
        id: "",
        slug: cloneSource.slug,
        title: `${cloneSource.title} (Copy)`,
        description: cloneSource.description,
        examTrackId: cloneSource.examTrackId,
        systemId: cloneSource.systemId,
        topicId: cloneSource.topicId,
        status: "draft",
        sections: cloneSource.sections.map((s, i) => ({
          ...s,
          id: "",
          slug: s.slug || `section-${i + 1}`,
        })),
      }
    : undefined;

  return (
    <StudyGuideProductionStudio
      tracks={trackOptions}
      systems={systems}
      topics={topics}
      defaultTrackId={effectiveTrackId ?? undefined}
      initialGuide={initialGuide ?? undefined}
    />
  );
}
