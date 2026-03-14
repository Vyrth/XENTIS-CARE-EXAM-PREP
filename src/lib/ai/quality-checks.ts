/**
 * AI Content Factory - quality validation and duplicate detection.
 *
 * Quality checks (client-side): block save when invalid.
 * Duplicate detection (server-side): flag likely duplicates in preview.
 */

import { validateQuestionPayload } from "@/lib/ai/question-factory/validation";
import { validateStudyGuidePayload, validateStudyGuideSectionPackPayload } from "@/lib/ai/study-guide-factory/validation";
import { validateFlashcardDeckPayload } from "@/lib/ai/flashcard-factory/validation";
import { validateHighYieldPayload } from "@/lib/ai/high-yield-factory/validation";
import type { HighYieldContentType } from "@/lib/ai/high-yield-factory/types";

export interface QualityCheckResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  /** 0–1 heuristic score for board relevance (optional) */
  boardRelevance?: number;
}

const MIN_SECTION_CONTENT = 20;
const MIN_FLASHCARD_FRONT = 5;
const MIN_FLASHCARD_BACK = 5;

/** Quality check for question draft */
export function checkQuestionQuality(
  draft: {
    stem: string;
    rationale?: string;
    options: { key: string; text: string; isCorrect: boolean; distractorRationale?: string }[];
    itemType?: string;
    difficulty?: number;
  },
  options?: { lenient?: boolean }
): QualityCheckResult {
  const payload = {
    stem: draft.stem,
    itemType: draft.itemType ?? "single_best_answer",
    options: draft.options,
    rationale: draft.rationale ?? "",
    difficulty: (draft.difficulty ?? 3) as 1 | 2 | 3 | 4 | 5,
  };
  const result = validateQuestionPayload(payload, { lenient: options?.lenient ?? false });
  const warnings: string[] = [];
  const rationaleLen = draft.rationale?.trim().length ?? 0;
  if (result.valid && rationaleLen > 0 && rationaleLen < 30) {
    warnings.push("Rationale is short; consider expanding for better learning value");
  }
  return {
    valid: result.valid,
    errors: result.errors,
    warnings,
    boardRelevance: estimateQuestionBoardRelevance(draft),
  };
}

/** Quality check for study guide draft */
export function checkStudyGuideQuality(
  draft: { title: string; description?: string; sections: { title: string; contentMarkdown?: string }[] },
  mode: "full" | "section_pack"
): QualityCheckResult {
  const result =
    mode === "full"
      ? validateStudyGuidePayload(draft)
      : validateStudyGuideSectionPackPayload({ sections: draft.sections });
  const errors = [...result.errors];
  const warnings: string[] = [];

  for (let i = 0; i < (draft.sections?.length ?? 0); i++) {
    const s = draft.sections[i];
    const content = s?.contentMarkdown?.trim() ?? "";
    if (content.length > 0 && content.length < MIN_SECTION_CONTENT) {
      errors.push(`Section ${i + 1}: content too short (min ${MIN_SECTION_CONTENT} chars)`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    boardRelevance: estimateStudyGuideBoardRelevance(draft),
  };
}

/** Quality check for flashcard deck draft */
export function checkFlashcardDeckQuality(draft: {
  name: string;
  cards: { frontText?: string; backText?: string }[];
  deckType?: string;
}): QualityCheckResult {
  const result = validateFlashcardDeckPayload(draft);
  const errors = [...result.errors];
  const warnings: string[] = [];

  const validDeckTypes = ["rapid_recall", "high_yield_clinical", "standard", "high_yield", "compare_contrast", "pharm_focus"];
  if (draft.deckType && !validDeckTypes.includes(draft.deckType)) {
    errors.push(`Invalid deck type: ${draft.deckType}`);
  }

  for (let i = 0; i < (draft.cards?.length ?? 0); i++) {
    const c = draft.cards[i];
    const front = c?.frontText?.trim() ?? "";
    const back = c?.backText?.trim() ?? "";
    if (front.length > 0 && front.length < MIN_FLASHCARD_FRONT) {
      errors.push(`Card ${i + 1}: front too short (min ${MIN_FLASHCARD_FRONT} chars)`);
    }
    if (back.length > 0 && back.length < MIN_FLASHCARD_BACK) {
      errors.push(`Card ${i + 1}: back too short (min ${MIN_FLASHCARD_BACK} chars)`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    boardRelevance: estimateFlashcardBoardRelevance(draft),
  };
}

/** Quality check for high-yield draft */
export function checkHighYieldQuality(
  draft: Record<string, unknown>,
  contentType: HighYieldContentType
): QualityCheckResult {
  const result = validateHighYieldPayload(draft, contentType);
  const errors = [...result.errors];
  const warnings: string[] = [];

  const validTypes: HighYieldContentType[] = [
    "high_yield_summary",
    "common_confusion",
    "board_trap",
    "compare_contrast_summary",
  ];
  if (contentType && !validTypes.includes(contentType)) {
    errors.push(`Invalid content type: ${contentType}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    boardRelevance: estimateHighYieldBoardRelevance(draft),
  };
}

/** Heuristic: question has rationale, options, reasonable stem length */
function estimateQuestionBoardRelevance(draft: {
  stem?: string;
  rationale?: string;
  options?: unknown[];
}): number {
  let score = 0.5;
  if (draft.stem?.trim().length && draft.stem.trim().length >= 30) score += 0.2;
  if (draft.rationale?.trim().length && draft.rationale.trim().length >= 50) score += 0.2;
  if (draft.options?.length && draft.options.length >= 4) score += 0.1;
  return Math.min(1, score);
}

/** Heuristic: guide has description, multiple sections with content */
function estimateStudyGuideBoardRelevance(draft: {
  description?: string;
  sections?: { contentMarkdown?: string }[];
}): number {
  let score = 0.5;
  if (draft.description?.trim().length && draft.description.trim().length >= 30) score += 0.2;
  const sectionsWithContent = (draft.sections ?? []).filter((s) => (s?.contentMarkdown?.trim() ?? "").length >= 50);
  if (sectionsWithContent.length >= 2) score += 0.2;
  if (sectionsWithContent.length >= 4) score += 0.1;
  return Math.min(1, score);
}

/** Heuristic: deck has multiple cards with substantial content */
function estimateFlashcardBoardRelevance(draft: { cards?: { frontText?: string; backText?: string }[] }): number {
  let score = 0.5;
  const cards = draft.cards ?? [];
  if (cards.length >= 5) score += 0.2;
  const substantial = cards.filter(
    (c) => (c?.frontText?.trim() ?? "").length >= 10 && (c?.backText?.trim() ?? "").length >= 10
  );
  if (substantial.length >= 3) score += 0.2;
  if (substantial.length >= 5) score += 0.1;
  return Math.min(1, score);
}

/** Heuristic: high-yield has title and explanation */
function estimateHighYieldBoardRelevance(draft: Record<string, unknown>): number {
  let score = 0.5;
  const title = String(draft.title ?? "").trim();
  const explanation = String(draft.explanation ?? draft.trapDescription ?? draft.trap_description ?? "").trim();
  if (title.length >= 5) score += 0.2;
  if (explanation.length >= 50) score += 0.3;
  return Math.min(1, score);
}
