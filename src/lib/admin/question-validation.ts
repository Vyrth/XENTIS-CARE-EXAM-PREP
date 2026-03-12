/**
 * Question Production Studio - validation rules
 * Blocks incomplete board content from moving forward
 */

export interface QuestionOptionInput {
  key: string;
  text: string;
  isCorrect?: boolean;
  distractorRationale?: string;
}

export interface QuestionFormData {
  examTrackId: string;
  systemId: string;
  domainId?: string;
  topicId?: string;
  subtopicId?: string;
  questionTypeId: string;
  questionTypeSlug?: string;
  stem: string;
  leadIn?: string;
  instructions?: string;
  options: QuestionOptionInput[];
  rationale?: string;
  difficultyTier?: number;
  skillTags?: string[];
  imageUrl?: string;
  /** Set when content was AI-generated (audit tag) */
  aiGenerated?: boolean;
}

/** Validate for draft save - minimal requirements */
export function validateDraft(data: QuestionFormData): { success: true } | { success: false; errors: string[] } {
  const errors: string[] = [];
  if (!data.examTrackId?.trim()) errors.push("Track is required");
  if (!data.systemId?.trim()) errors.push("System is required");
  if (!data.questionTypeId?.trim()) errors.push("Item type is required");
  if (!data.stem?.trim()) errors.push("Stem is required");
  if ((data.stem?.trim().length ?? 0) < 10) errors.push("Stem must be at least 10 characters");
  if (!data.options?.length || data.options.length < 2) errors.push("At least 2 options required");
  for (let i = 0; i < (data.options?.length ?? 0); i++) {
    const o = data.options[i];
    if (!o.key?.trim()) errors.push(`Option ${i + 1}: key required`);
    if (!o.text?.trim()) errors.push(`Option ${i + 1}: text required`);
  }
  if (errors.length > 0) return { success: false, errors };
  return { success: true };
}

/** Validate for publish/approval - full board quality requirements */
export function validateForPublish(data: QuestionFormData): { success: true } | { success: false; errors: string[] } {
  const draft = validateDraft(data);
  if (!draft.success) return draft;

  const errors: string[] = [];
  const hasCorrect = data.options?.some((o) => o.isCorrect);
  if (!hasCorrect) errors.push("At least one option must be marked correct");

  const correctCount = data.options?.filter((o) => o.isCorrect).length ?? 0;
  if (data.questionTypeSlug === "single_best_answer" && correctCount !== 1) {
    errors.push("Single Best Answer must have exactly one correct option");
  }

  if (!data.rationale?.trim() || data.rationale.trim().length < 10) {
    errors.push("Rationale is required for publish (min 10 chars)");
  }

  if (errors.length > 0) return { success: false, errors };
  return { success: true };
}
