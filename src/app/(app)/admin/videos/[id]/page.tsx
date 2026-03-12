import Link from "next/link";
import { loadExamTracks } from "@/lib/admin/loaders";
import {
  loadAdminVideoForEdit,
  loadAllSystemsForAdmin,
  loadTopicsForTrackAdmin,
  loadQuestionsForTrackAdmin,
} from "@/lib/admin/video-studio-loaders";
import { loadAllTopicsForAdmin } from "@/lib/admin/question-studio-loaders";
import {
  loadContentSourcesForAdmin,
  loadContentSourceIdsForEntity,
} from "@/lib/admin/source-loaders";
import { loadSourceEvidence } from "@/lib/admin/source-evidence";
import { VideoProductionStudio } from "@/components/admin/VideoProductionStudio";
import { SourceEvidencePanel } from "@/components/admin/SourceEvidencePanel";

export default async function VideoEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [tracks, video, systems, allTopics, questions, sources, sourceIds, sourceEvidence] = await Promise.all([
    loadExamTracks(),
    loadAdminVideoForEdit(id),
    loadAllSystemsForAdmin(),
    loadAllTopicsForAdmin(),
    loadQuestionsForTrackAdmin(null),
    loadContentSourcesForAdmin(),
    loadContentSourceIdsForEntity("video", id),
    loadSourceEvidence("video", id),
  ]);

  const [topicsForTrack, questionsForTrack] = await Promise.all([
    loadTopicsForTrackAdmin(video?.examTrackId ?? null),
    loadQuestionsForTrackAdmin(video?.examTrackId ?? null, 100),
  ]);

  const trackOptions = tracks.map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
  }));

  const topics = topicsForTrack.length > 0 ? topicsForTrack : allTopics;
  const qs = questionsForTrack.length > 0 ? questionsForTrack : questions;

  if (!video) {
    return (
      <div className="p-6">
        <p className="text-slate-500">Video not found.</p>
        <a href="/admin/videos" className="text-indigo-600 mt-4 inline-block">
          Back to Videos
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Link
          href={`/admin/videos/new?cloneFrom=${id}&trackId=${video.examTrackId}`}
          className="text-sm text-indigo-600 hover:underline"
        >
          Clone video
        </Link>
      </div>
      <VideoProductionStudio
        videoId={id}
        initialVideo={video}
        tracks={trackOptions}
        systems={systems}
        topics={topics}
        questions={qs}
        defaultTrackId={video.examTrackId}
      />
      <SourceEvidencePanel
        contentType="video"
        contentId={id}
        initialSourceBasis={sourceEvidence?.sourceBasis}
        initialLegalStatus={sourceEvidence?.legalStatus}
        initialLegalNotes={sourceEvidence?.legalNotes}
        initialAuthorNotes={sourceEvidence?.authorNotes}
        sources={sources}
        selectedSourceIds={sourceIds}
      />
    </div>
  );
}
