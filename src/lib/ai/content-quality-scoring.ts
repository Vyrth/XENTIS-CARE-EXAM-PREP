/**
 * Content Quality Scoring - post-save validation and auto-publish eligibility.
 * Used by AI Factory after persist to:
 * - Assign quality score (0-100)
 * - Set auto_publish_eligible
 * - Record validation_status and validation_errors
 */

import type { QuestionDraftOutput } from "@/lib/ai/admin-drafts/types";
import type { ExtendedQuestionOutput } from "@/lib/ai/content-factory/parsers";
import { checkQuestionQuality } from "@/lib/ai/quality-checks";

const MIN_RATIONALE_LENGTH = 50;
const MIN_QUALITY_FOR_ELIGIBLE = 70;

export interface QuestionQualityResult {
  qualityScore: number;
  autoPublishEligible: boolean;
  validationStatus: string;
  validationErrors: string[];
}

/** Compute quality score and eligibility for a saved question (from draft). */
export function computeQuestionQualityScore(
  draft: QuestionDraftOutput | ExtendedQuestionOutput
): QuestionQualityResult {
  const errors: string[] = [];
  const check = checkQuestionQuality({
    stem: draft.stem ?? "",
    rationale: (draft as { rationale?: string }).rationale ?? "",
    options: Array.isArray(draft.options)
      ? draft.options.map((o) => ({
          key: (o as { key?: string }).key ?? "A",
          text: (o as { text?: string }).text ?? "",
          isCorrect: (o as { isCorrect?: boolean }).isCorrect ?? false,
        }))
      : [],
    itemType: (draft as ExtendedQuestionOutput).itemType,
    difficulty: (draft as { difficulty?: number }).difficulty,
  });

  if (!check.valid) {
    errors.push(...check.errors);
    return {
      qualityScore: 0,
      autoPublishEligible: false,
      validationStatus: "schema_invalid",
      validationErrors: errors,
    };
  }

  const rationale = ((draft as { rationale?: string }).rationale ?? "").trim();
  if (rationale.length < MIN_RATIONALE_LENGTH) {
    errors.push(`Rationale too short (min ${MIN_RATIONALE_LENGTH} chars)`);
  }

  const correctCount = (draft.options ?? []).filter((o) => (o as { isCorrect?: boolean }).isCorrect).length;
  if (correctCount !== 1) {
    errors.push("Exactly one correct answer required");
  }

  const boardRelevance = check.boardRelevance ?? 0.5;
  const qualityScore = Math.round(boardRelevance * 100);

  const autoPublishEligible =
    errors.length === 0 &&
    qualityScore >= MIN_QUALITY_FOR_ELIGIBLE &&
    rationale.length >= MIN_RATIONALE_LENGTH &&
    correctCount === 1;

  return {
    qualityScore,
    autoPublishEligible,
    validationStatus: errors.length > 0 ? "validation_failed" : "passed",
    validationErrors: errors,
  };
}
