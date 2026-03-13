/**
 * Content Quality Scoring - post-save validation and auto-publish eligibility.
 * Used by AI Factory after persist to:
 * - Assign quality score (0-100)
 * - Set auto_publish_eligible
 * - Record validation_status and validation_errors
 */

import type { QuestionDraftOutput } from "@/lib/ai/admin-drafts/types";
import type { ExtendedQuestionOutput } from "@/lib/ai/content-factory/parsers";
import {
  checkQuestionQuality,
  checkStudyGuideQuality,
  checkFlashcardDeckQuality,
  checkHighYieldQuality,
} from "@/lib/ai/quality-checks";
import type { HighYieldContentType } from "@/lib/ai/high-yield-factory/types";

const MIN_RATIONALE_LENGTH = 50;
const MIN_QUALITY_FOR_ELIGIBLE = 70;

export interface QualityResult {
  qualityScore: number;
  autoPublishEligible: boolean;
  validationStatus: string;
  validationErrors: string[];
}

/** Compute quality score and eligibility for a saved question (from draft). */
export function computeQuestionQualityScore(
  draft: QuestionDraftOutput | ExtendedQuestionOutput
): QualityResult {
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

/** Compute quality score for study guide (full or section pack). */
export function computeStudyGuideQualityScore(
  draft: { title?: string; description?: string; sections: { title?: string; contentMarkdown?: string }[] },
  mode: "full" | "section_pack"
): QualityResult {
  const normalized = {
    title: draft.title ?? "",
    description: draft.description,
    sections: draft.sections.map((s) => ({ title: s.title ?? "", contentMarkdown: s.contentMarkdown })),
  };
  const check = checkStudyGuideQuality(normalized, mode);
  const qualityScore = Math.round((check.boardRelevance ?? 0.5) * 100);
  const autoPublishEligible = check.valid && qualityScore >= MIN_QUALITY_FOR_ELIGIBLE;
  return {
    qualityScore,
    autoPublishEligible,
    validationStatus: check.valid ? "passed" : "validation_failed",
    validationErrors: check.errors,
  };
}

/** Compute quality score for flashcard deck. */
export function computeFlashcardDeckQualityScore(draft: {
  name: string;
  cards: { frontText?: string; backText?: string }[];
  deckType?: string;
}): QualityResult {
  const check = checkFlashcardDeckQuality(draft);
  const qualityScore = Math.round((check.boardRelevance ?? 0.5) * 100);
  const autoPublishEligible = check.valid && qualityScore >= MIN_QUALITY_FOR_ELIGIBLE;
  return {
    qualityScore,
    autoPublishEligible,
    validationStatus: check.valid ? "passed" : "validation_failed",
    validationErrors: check.errors,
  };
}

/** Compute quality score for high-yield content. */
export function computeHighYieldQualityScore(
  draft: Record<string, unknown>,
  contentType: HighYieldContentType
): QualityResult {
  const check = checkHighYieldQuality(draft, contentType);
  const qualityScore = Math.round((check.boardRelevance ?? 0.5) * 100);
  const autoPublishEligible = check.valid && qualityScore >= MIN_QUALITY_FOR_ELIGIBLE;
  return {
    qualityScore,
    autoPublishEligible,
    validationStatus: check.valid ? "passed" : "validation_failed",
    validationErrors: check.errors,
  };
}

/** @deprecated Use QualityResult */
export type QuestionQualityResult = QualityResult;
