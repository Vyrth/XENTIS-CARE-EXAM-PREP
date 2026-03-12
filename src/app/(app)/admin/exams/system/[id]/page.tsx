import Link from "next/link";
import { TrackBadge } from "@/components/admin/TrackBadge";
import { loadSystemExamForEdit } from "@/lib/admin/exam-assembly-loaders";
import { loadExamTracks } from "@/lib/admin/loaders";
import {
  loadSystemExamPoolComposition,
  validatePool,
  loadBlueprintWeights,
} from "@/lib/admin/exam-assembly-pool";
import {
  loadContentSourcesForAdmin,
  loadContentSourceIdsForEntity,
} from "@/lib/admin/source-loaders";
import { loadSourceEvidence } from "@/lib/admin/source-evidence";
import { SystemExamEditor } from "@/components/admin/SystemExamEditor";
import { SourceEvidencePanel } from "@/components/admin/SourceEvidencePanel";

export default async function SystemExamEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const exam = await loadSystemExamForEdit(id);
  if (!exam) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-slate-500">System exam not found.</p>
        <Link
          href="/admin/exams"
          className="text-indigo-600 hover:underline mt-4 inline-block"
        >
          ← Back to Exams
        </Link>
      </div>
    );
  }

  const [tracks, poolData, blueprintWeights, sources, sourceIds, sourceEvidence] = await Promise.all([
    loadExamTracks(),
    loadSystemExamPoolComposition(id, exam.examTrackId),
    loadBlueprintWeights(exam.examTrackId),
    loadContentSourcesForAdmin(),
    loadContentSourceIdsForEntity("system_exam", id),
    loadSourceEvidence("system_exam", id),
  ]);

  const validation = await validatePool(
    exam.examTrackId,
    poolData.questionIds,
    exam.assemblyRules,
    exam.questionCount
  );

  const trackSlug = tracks.find((t) => t.id === exam.examTrackId)?.slug ?? "rn";

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/exams"
          className="text-slate-600 dark:text-slate-400 hover:underline"
        >
          ← Exams
        </Link>
        <TrackBadge slug={trackSlug as "lvn" | "rn" | "fnp" | "pmhnp"} />
        <span className="text-slate-500">{exam.name}</span>
      </div>

      <SystemExamEditor
        exam={exam}
        tracks={tracks.map((t) => ({ id: t.id, slug: t.slug, name: t.name }))}
        blueprintWeights={blueprintWeights}
        initialComposition={poolData.composition}
        initialWarnings={validation.warnings}
      />

      <SourceEvidencePanel
        contentType="system_exam"
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
