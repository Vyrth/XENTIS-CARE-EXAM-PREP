import Link from "next/link";
import { loadExamTracks } from "@/lib/admin/loaders";
import { loadQuestionForEdit } from "@/lib/admin/loaders";
import {
  loadAllSystemsForAdmin,
  loadAllTopicsForAdmin,
  loadDomainsAdmin,
  loadSubtopicsForTopicAdmin,
  loadQuestionTypesAdmin,
} from "@/lib/admin/question-studio-loaders";
import {
  loadContentSourcesForAdmin,
  loadContentSourceIdsForEntity,
} from "@/lib/admin/source-loaders";
import { loadSourceEvidence } from "@/lib/admin/source-evidence";
import { loadAIGenerationForContent } from "@/lib/admin/ai-generation-lookup";
import { loadContentEvidenceMetadataWithNames } from "@/lib/admin/evidence-metadata-loaders";
import { QuestionProductionStudio } from "@/components/admin/QuestionProductionStudio";
import { SourceEvidencePanel } from "@/components/admin/SourceEvidencePanel";
import { AIGenerationSourcePanel } from "@/components/admin/AIGenerationSourcePanel";
import { EvidenceSourceGovernancePanel } from "@/components/admin/EvidenceSourceGovernancePanel";

export default async function QuestionEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [
    tracks,
    question,
    systems,
    topics,
    domains,
    questionTypes,
    sources,
    sourceIds,
    sourceEvidence,
    aiGeneration,
    evidenceMetadata,
  ] = await Promise.all([
    loadExamTracks(),
    loadQuestionForEdit(id),
    loadAllSystemsForAdmin(),
    loadAllTopicsForAdmin(),
    loadDomainsAdmin(),
    loadQuestionTypesAdmin(),
    loadContentSourcesForAdmin(),
    loadContentSourceIdsForEntity("question", id),
    loadSourceEvidence("question", id),
    loadAIGenerationForContent("question", id),
    loadContentEvidenceMetadataWithNames("question", id),
  ]);

  const allSubtopics: { id: string; slug: string; name: string; topicId: string }[] = [];
  for (const t of topics) {
    const subs = await loadSubtopicsForTopicAdmin(t.id);
    allSubtopics.push(...subs);
  }

  if (!question) {
    return (
      <div className="p-6">
        <p className="text-slate-500">Question not found.</p>
        <Link href="/admin/questions" className="text-indigo-600 mt-4 inline-block">
          Back to Questions
        </Link>
      </div>
    );
  }

  const initialData = {
    examTrackId: question.examTrackId,
    systemId: question.systemId ?? "",
    domainId: question.domainId ?? undefined,
    topicId: question.topicId ?? undefined,
    subtopicId: question.subtopicId ?? undefined,
    questionTypeId: question.questionTypeId,
    stem: question.stem,
    leadIn: question.leadIn,
    instructions: question.instructions,
    rationale: question.rationale,
    difficultyTier: question.difficultyTier ?? undefined,
    imageUrl: question.imageUrl,
    options: question.options,
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Link
          href={`/admin/questions/new?cloneFrom=${id}&trackId=${question.examTrackId}`}
          className="text-sm text-indigo-600 hover:underline"
        >
          Clone question
        </Link>
      </div>
      {aiGeneration && (
        <AIGenerationSourcePanel record={aiGeneration} />
      )}
      <EvidenceSourceGovernancePanel
        contentType="question"
        contentId={id}
        metadata={evidenceMetadata ?? null}
        sourceFrameworkName={evidenceMetadata?.sourceFrameworkName}
        primarySourceName={evidenceMetadata?.primarySourceName}
        guidelineSourceName={evidenceMetadata?.guidelineSourceName}
      />
      <QuestionProductionStudio
        questionId={id}
        initialData={initialData}
        tracks={tracks}
        systems={systems}
        topics={topics}
        subtopics={allSubtopics}
        domains={domains}
        questionTypes={questionTypes}
        defaultTrackId={question.examTrackId}
      />
      <SourceEvidencePanel
        contentType="question"
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
