/**
 * High-Yield Content Mass Production Plan
 *
 * Targets by track. Content types: high_yield_summary, common_confusion,
 * board_trap, compare_contrast_summary.
 *
 * Each item must include: title, explanation, why_high_yield, common_confusion,
 * high_yield_score, trap_severity, confusion_frequency (type-appropriate).
 */

export type ExamTrackSlug = "lvn" | "rn" | "fnp" | "pmhnp";

/** High-yield content count targets by track */
export const HIGH_YIELD_TARGETS: Record<ExamTrackSlug, number> = {
  rn: 500,
  fnp: 400,
  pmhnp: 300,
  lvn: 200,
};

/** Content types for mass production (cycle through) */
export const HIGH_YIELD_CONTENT_TYPES = [
  "high_yield_summary",
  "common_confusion",
  "board_trap",
  "compare_contrast_summary",
] as const;

export type HighYieldContentTypeSlug = (typeof HIGH_YIELD_CONTENT_TYPES)[number];
