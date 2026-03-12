import { loadExamTracks } from "@/lib/admin/loaders";
import {
  loadAllSystemsForAdmin,
  loadAllTopicsForAdmin,
  loadDomainsAdmin,
  loadSubtopicsForTopicAdmin,
  loadQuestionTypesAdmin,
} from "@/lib/admin/question-studio-loaders";
import { loadQuestionForEdit } from "@/lib/admin/loaders";
import { QuestionProductionStudio } from "@/components/admin/QuestionProductionStudio";

export default async function NewQuestionPage({
  searchParams,
}: {
  searchParams: Promise<{ trackId?: string; cloneFrom?: string }>;
}) {
  const params = await searchParams;
  const trackId = params.trackId ?? null;
  const cloneFromId = params.cloneFrom ?? null;

  const [
    tracks,
    systems,
    topics,
    domains,
    questionTypes,
    cloneSource,
  ] = await Promise.all([
    loadExamTracks(),
    loadAllSystemsForAdmin(),
    loadAllTopicsForAdmin(),
    loadDomainsAdmin(),
    loadQuestionTypesAdmin(),
    cloneFromId ? loadQuestionForEdit(cloneFromId) : Promise.resolve(null),
  ]);

  const allSubtopics: { id: string; slug: string; name: string; topicId: string }[] = [];
  if (topics.length > 0) {
    for (const t of topics) {
      const subs = await loadSubtopicsForTopicAdmin(t.id);
      allSubtopics.push(...subs);
    }
  }

  const initialData = cloneSource
    ? {
        examTrackId: cloneSource.examTrackId,
        systemId: cloneSource.systemId ?? "",
        domainId: cloneSource.domainId ?? undefined,
        topicId: cloneSource.topicId ?? undefined,
        subtopicId: cloneSource.subtopicId ?? undefined,
        questionTypeId: cloneSource.questionTypeId,
        stem: cloneSource.stem,
        leadIn: cloneSource.leadIn,
        instructions: cloneSource.instructions,
        rationale: cloneSource.rationale,
        difficultyTier: cloneSource.difficultyTier ?? undefined,
        imageUrl: cloneSource.imageUrl,
        options: cloneSource.options,
      }
    : undefined;

  return (
    <QuestionProductionStudio
      tracks={tracks}
      systems={systems}
      topics={topics}
      subtopics={allSubtopics}
      domains={domains}
      questionTypes={questionTypes}
      defaultTrackId={trackId ?? undefined}
      initialData={initialData}
    />
  );
}
