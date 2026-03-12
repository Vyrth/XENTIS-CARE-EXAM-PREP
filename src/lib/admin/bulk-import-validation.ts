/**
 * Bulk import validation - validate rows before commit, flag missing fields
 */

import { validateDraft, type QuestionFormData } from "./question-validation";

export interface ValidatedRow {
  rowIndex: number;
  data: QuestionFormData;
  valid: boolean;
  errors: string[];
}

export function validateImportRows(
  rows: (Partial<QuestionFormData> & { stem?: string; options?: { key: string; text: string; isCorrect?: boolean }[] })[],
  defaultTrackId?: string,
  defaultSystemId?: string,
  defaultQuestionTypeId?: string
): ValidatedRow[] {
  return rows.map((r, idx) => {
    const data: QuestionFormData = {
      examTrackId: r.examTrackId || defaultTrackId || "",
      systemId: r.systemId || defaultSystemId || "",
      domainId: r.domainId,
      topicId: r.topicId,
      subtopicId: r.subtopicId,
      questionTypeId: r.questionTypeId || defaultQuestionTypeId || "",
      questionTypeSlug: r.questionTypeSlug || "single_best_answer",
      stem: r.stem || "",
      leadIn: r.leadIn,
      instructions: r.instructions,
      options: r.options || [],
      rationale: r.rationale,
      difficultyTier: r.difficultyTier,
      imageUrl: r.imageUrl,
    };

    const result = validateDraft(data);
    return {
      rowIndex: idx + 1,
      data,
      valid: result.success,
      errors: result.success ? [] : result.errors,
    };
  });
}
