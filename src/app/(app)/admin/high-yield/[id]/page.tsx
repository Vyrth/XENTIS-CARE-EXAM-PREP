import Link from "next/link";
import { loadExamTracks } from "@/lib/admin/loaders";
import {
  loadAdminHighYieldItemForEdit,
  loadAllSystemsForAdmin,
  loadTopicsForTrackAdmin,
} from "@/lib/admin/high-yield-studio-loaders";
import { loadAllTopicsForAdmin } from "@/lib/admin/question-studio-loaders";
import {
  loadContentSourcesForAdmin,
  loadContentSourceIdsForEntity,
} from "@/lib/admin/source-loaders";
import { loadSourceEvidence, AI_ORIGINAL_AUTHOR_NOTES } from "@/lib/admin/source-evidence";
import { loadAIGenerationForContent } from "@/lib/admin/ai-generation-lookup";
import { HighYieldProductionStudio } from "@/components/admin/HighYieldProductionStudio";
import { SourceEvidencePanel } from "@/components/admin/SourceEvidencePanel";
import { AIGenerationSourcePanel } from "@/components/admin/AIGenerationSourcePanel";

export default async function EditHighYieldItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const item = await loadAdminHighYieldItemForEdit(id);
  if (!item) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-slate-500">High-yield item not found.</p>
        <Link
          href="/admin/high-yield"
          className="text-indigo-600 hover:underline mt-4 inline-block"
        >
          ← Back to High-Yield
        </Link>
      </div>
    );
  }

  const [tracks, systems, topicsForTrack, allTopics, sources, sourceIds, sourceEvidence, aiGeneration] = await Promise.all([
    loadExamTracks(),
    loadAllSystemsForAdmin(),
    loadTopicsForTrackAdmin(item.examTrackId),
    loadAllTopicsForAdmin(),
    loadContentSourcesForAdmin(),
    loadContentSourceIdsForEntity("high_yield_content", id),
    loadSourceEvidence("high_yield_content", id),
    loadAIGenerationForContent("high_yield_content", id),
  ]);
  const topics = topicsForTrack.length > 0 ? topicsForTrack : allTopics;

  const trackOptions = tracks.map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
  }));

  return (
    <div className="space-y-6">
      {aiGeneration && (
        <AIGenerationSourcePanel record={aiGeneration} />
      )}
      <HighYieldProductionStudio
        itemId={id}
        initialItem={item}
        tracks={trackOptions}
        systems={systems}
        topics={topics}
        defaultTrackId={item.examTrackId}
      />
      <SourceEvidencePanel
        contentType="high_yield_content"
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
