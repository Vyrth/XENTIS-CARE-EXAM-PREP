import { loadExamTracks } from "@/lib/admin/loaders";
import {
  loadAllSystemsForAdmin,
  loadAdminVideoForEdit,
  loadTopicsForTrackAdmin,
  loadQuestionsForTrackAdmin,
} from "@/lib/admin/video-studio-loaders";
import { loadAllTopicsForAdmin } from "@/lib/admin/question-studio-loaders";
import { VideoProductionStudio } from "@/components/admin/VideoProductionStudio";

type Props = { searchParams: Promise<{ trackId?: string; cloneFrom?: string }> };

export default async function NewVideoPage({ searchParams }: Props) {
  const { trackId, cloneFrom } = await searchParams;

  const cloneSource = cloneFrom ? await loadAdminVideoForEdit(cloneFrom) : null;
  const effectiveTrackId = trackId ?? cloneSource?.examTrackId ?? null;

  const [tracks, systems, topicsForTrack, allTopics, questions] =
    await Promise.all([
      loadExamTracks(),
      loadAllSystemsForAdmin(),
      loadTopicsForTrackAdmin(effectiveTrackId),
      loadAllTopicsForAdmin(),
      loadQuestionsForTrackAdmin(effectiveTrackId, 100),
    ]);

  const trackOptions = tracks.map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
  }));

  const topics = topicsForTrack.length > 0 ? topicsForTrack : allTopics;

  const initialVideo = cloneSource
    ? {
        id: "",
        slug: cloneSource.slug,
        title: `${cloneSource.title} (Copy)`,
        description: cloneSource.description,
        examTrackId: cloneSource.examTrackId,
        systemId: cloneSource.systemId,
        topicId: cloneSource.topicId,
        videoUrl: cloneSource.videoUrl,
        durationSeconds: cloneSource.durationSeconds,
        thumbnailUrl: cloneSource.thumbnailUrl,
        transcript: cloneSource.transcript,
        status: "draft",
        transcriptSections: cloneSource.transcriptSections.map((s, i) => ({
          ...s,
          id: "",
          displayOrder: i,
        })),
        quizQuestionIds: [],
      }
    : undefined;

  return (
    <VideoProductionStudio
      tracks={trackOptions}
      systems={systems}
      topics={topics}
      questions={questions}
      defaultTrackId={effectiveTrackId ?? undefined}
      initialVideo={initialVideo ?? undefined}
    />
  );
}
