/**
 * Question Factory - post-generation normalizer for database persistence.
 * Converts QuestionPayload to questions + question_options row format.
 */

import type {
  QuestionPayload,
  QuestionOptionPayload,
  QuestionRow,
  QuestionOptionRow,
} from "./types";

export interface NormalizedQuestion {
  question: Omit<QuestionRow, "exam_track_id" | "question_type_id" | "domain_id" | "system_id" | "topic_id"> & {
    exam_track_id?: string;
    question_type_id?: string;
    domain_id?: string | null;
    system_id?: string | null;
    topic_id?: string | null;
  };
  options: Omit<QuestionOptionRow, "question_id">[];
  difficulty_tier: number | null;
  tags: string[];
}

/**
 * Normalize AI-generated question payload to database-ready format.
 * Fills in stem_metadata, option_metadata, and ensures valid structure.
 */
export function normalizeQuestionPayload(
  payload: QuestionPayload,
  ids?: { exam_track_id: string; question_type_id: string; domain_id?: string; system_id?: string; topic_id?: string }
): NormalizedQuestion {
  const stemMetadata: Record<string, unknown> = {
    leadIn: payload.leadIn?.trim() || undefined,
    instructions: payload.instructions?.trim() || undefined,
    rationale: payload.rationale?.trim() || undefined,
    aiGenerated: true,
    learningObjective: payload.learningObjective?.trim() || undefined,
    teachingPoint: payload.teachingPoint?.trim() || undefined,
    boardRelevance: payload.boardRelevance?.trim() || undefined,
    mnemonic: payload.mnemonic?.trim() || undefined,
  };
  if (payload.exhibitPlaceholder) stemMetadata.exhibitPlaceholder = payload.exhibitPlaceholder;
  if (payload.dosageContext) stemMetadata.dosageContext = payload.dosageContext;

  const question: NormalizedQuestion["question"] = {
    exam_track_id: ids?.exam_track_id,
    question_type_id: ids?.question_type_id,
    domain_id: ids?.domain_id ?? null,
    system_id: ids?.system_id ?? null,
    topic_id: ids?.topic_id ?? null,
    stem: payload.stem.trim(),
    stem_metadata: stemMetadata,
    status: "draft",
    difficulty_tier: payload.difficulty ?? null,
  };

  const options: NormalizedQuestion["options"] = payload.options.map((opt, i) => {
    const optionMetadata: Record<string, unknown> = {};
    if (opt.distractorRationale?.trim()) optionMetadata.rationale = opt.distractorRationale;
    if (opt.correctOrder != null) optionMetadata.correctOrder = opt.correctOrder;
    if (opt.coords) optionMetadata.coords = opt.coords;

    return {
      option_key: normalizeOptionKey(opt.key, i),
      option_text: opt.text?.trim() ?? "",
      is_correct: opt.isCorrect ?? false,
      option_metadata: Object.keys(optionMetadata).length > 0 ? optionMetadata : {},
      display_order: i,
    };
  });

  return {
    question,
    options,
    difficulty_tier: payload.difficulty ?? null,
    tags: Array.isArray(payload.tags) ? payload.tags.filter((t) => typeof t === "string").map((t) => t.trim()).filter(Boolean) : [],
  };
}

function normalizeOptionKey(key: string, index: number): string {
  const k = String(key ?? "").trim().toUpperCase().slice(0, 1);
  if (k && /[A-Z0-9]/.test(k)) return k;
  return String.fromCharCode(65 + (index % 26));
}
