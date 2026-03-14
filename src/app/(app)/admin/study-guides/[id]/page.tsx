import Link from "next/link";
import { loadExamTracks } from "@/lib/admin/loaders";
import {
  loadAdminStudyGuideForEdit,
  loadAllSystemsForAdmin,
} from "@/lib/admin/study-guide-studio-loaders";
import { loadAllTopicsForAdmin } from "@/lib/admin/question-studio-loaders";
import {
  loadContentSourcesForAdmin,
  loadContentSourceIdsForEntity,
} from "@/lib/admin/source-loaders";
import { loadSourceEvidence, AI_ORIGINAL_AUTHOR_NOTES } from "@/lib/admin/source-evidence";
import { loadAIGenerationForContent } from "@/lib/admin/ai-generation-lookup";
import { StudyGuideProductionStudio } from "@/components/admin/StudyGuideProductionStudio";
import { SourceEvidencePanel } from "@/components/admin/SourceEvidencePanel";
import { AIGenerationSourcePanel } from "@/components/admin/AIGenerationSourcePanel";

export default async function StudyGuideEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [tracks, guide, systems, allTopics, sources, sourceIds, sourceEvidence, aiGeneration] = await Promise.all([
    loadExamTracks(),
    loadAdminStudyGuideForEdit(id),
    loadAllSystemsForAdmin(),
    loadAllTopicsForAdmin(),
    loadContentSourcesForAdmin(),
    loadContentSourceIdsForEntity("study_guide", id),
    loadSourceEvidence("study_guide", id),
    loadAIGenerationForContent("study_guide", id),
  ]);
  const topics = allTopics;

  const trackOptions = tracks.map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
  }));

  if (!guide) {
    return (
      <div className="p-6">
        <p className="text-slate-500">Study guide not found.</p>
        <a href="/admin/study-guides" className="text-indigo-600 mt-4 inline-block">
          Back to Study Guides
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {aiGeneration && (
        <AIGenerationSourcePanel record={aiGeneration} />
      )}
      <div className="flex justify-end">
        <Link
          href={`/admin/study-guides/new?cloneFrom=${id}&trackId=${guide.examTrackId}`}
          className="text-sm text-indigo-600 hover:underline"
        >
          Clone guide
        </Link>
      </div>
      <StudyGuideProductionStudio
        guideId={id}
        initialGuide={guide}
        tracks={trackOptions}
        systems={systems}
        topics={topics}
        defaultTrackId={guide.examTrackId}
      />
      <SourceEvidencePanel
        contentType="study_guide"
        contentId={id}
        initialSourceBasis={sourceEvidence?.sourceBasis}
        initialLegalStatus={sourceEvidence?.legalStatus}
        initialLegalNotes={sourceEvidence?.legalNotes}
        initialAuthorNotes={sourceEvidence?.authorNotes}
        sources={sources}
        selectedSourceIds={sourceIds}
        isAIAutoFilled={
          !!aiGeneration &&
          sourceEvidence?.sourceBasis === "internal" &&
          sourceEvidence?.legalStatus === "original" &&
          sourceEvidence?.authorNotes === AI_ORIGINAL_AUTHOR_NOTES
        }
      />
    </div>
  );
}
