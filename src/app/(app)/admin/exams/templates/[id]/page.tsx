import Link from "next/link";
import { loadExamTracks } from "@/lib/admin/loaders";
import { loadExamTemplateForEdit, loadSystemsForTrack } from "@/lib/admin/exam-assembly-loaders";
import { getTemplatePoolComposition, getBlueprintWeights } from "@/app/(app)/actions/exam-assembly";
import {
  loadContentSourcesForAdmin,
  loadContentSourceIdsForEntity,
} from "@/lib/admin/source-loaders";
import { loadSourceEvidence } from "@/lib/admin/source-evidence";
import { ExamAssemblyStudio } from "@/components/admin/ExamAssemblyStudio";
import { SourceEvidencePanel } from "@/components/admin/SourceEvidencePanel";

export default async function ExamTemplateEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const template = await loadExamTemplateForEdit(id);
  if (!template) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-slate-500">Exam template not found.</p>
        <Link
          href="/admin/exams"
          className="text-indigo-600 hover:underline mt-4 inline-block"
        >
          ← Back to Exams
        </Link>
      </div>
    );
  }

  const [tracks, systems, blueprintWeights, poolData, sources, sourceIds, sourceEvidence] = await Promise.all([
    loadExamTracks(),
    loadSystemsForTrack(template.examTrackId),
    getBlueprintWeights(template.examTrackId),
    getTemplatePoolComposition(template.id, template.examTrackId, {
      expectedTotal: template.questionCount,
      assemblyRules: template.assemblyRules,
    }),
    loadContentSourcesForAdmin(),
    loadContentSourceIdsForEntity("exam_template", id),
    loadSourceEvidence("exam_template", id),
  ]);

  const trackOptions = tracks.map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
  }));

  return (
    <div className="space-y-6">
      <ExamAssemblyStudio
        template={template}
        tracks={trackOptions}
        systems={systems}
        blueprintWeights={blueprintWeights}
        initialComposition={poolData.composition}
        initialWarnings={poolData.warnings}
      />
      <SourceEvidencePanel
        contentType="exam_template"
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
