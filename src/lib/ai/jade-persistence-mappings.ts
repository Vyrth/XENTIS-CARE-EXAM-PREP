/**
 * Jade Tutor - Helper Mappings for Persistence
 *
 * Maps AI output to existing schema values. Never assume wrong enum/slug values.
 */

/** Valid question_type_slug values from schema */
export const VALID_QUESTION_TYPE_SLUGS = [
  "single_best_answer",
  "multiple_response",
  "select_n",
  "image_based",
  "chart_table_exhibit",
  "matrix",
  "dropdown_cloze",
  "ordered_response",
  "hotspot",
  "highlight_text_table",
  "case_study",
  "bow_tie_analog",
  "dosage_calc",
] as const;

export type ValidQuestionTypeSlug = (typeof VALID_QUESTION_TYPE_SLUGS)[number];

/** Valid high_yield_content_type enum values */
export const VALID_HIGH_YIELD_TYPES = [
  "high_yield_summary",
  "common_confusion",
  "board_trap",
  "compare_contrast_summary",
] as const;

export type ValidHighYieldType = (typeof VALID_HIGH_YIELD_TYPES)[number];

/** Map AI question type output to valid existing question_type_slug */
export function mapQuestionTypeToExistingSlug(
  aiItemType: string | null | undefined
): ValidQuestionTypeSlug {
  if (!aiItemType || typeof aiItemType !== "string") return "single_best_answer";
  const normalized = aiItemType.trim().toLowerCase().replace(/\s+/g, "_");
  const slugMap: Record<string, ValidQuestionTypeSlug> = {
    single_best_answer: "single_best_answer",
    sba: "single_best_answer",
    single_best: "single_best_answer",
    multiple_choice: "single_best_answer",
    multiple_response: "multiple_response",
    select_multiple: "multiple_response",
    select_n: "select_n",
    image_based: "image_based",
    chart_table_exhibit: "chart_table_exhibit",
    matrix: "matrix",
    dropdown_cloze: "dropdown_cloze",
    ordered_response: "ordered_response",
    hotspot: "hotspot",
    highlight_text_table: "highlight_text_table",
    case_study: "case_study",
    bow_tie_analog: "bow_tie_analog",
    dosage_calc: "dosage_calc",
  };
  return slugMap[normalized] ?? "single_best_answer";
}

/** Map high-yield type to existing enum (already aligned) */
export function mapHighYieldTypeToExistingEnum(
  aiType: string | null | undefined
): ValidHighYieldType {
  if (!aiType || typeof aiType !== "string") return "high_yield_summary";
  const normalized = aiType.trim().toLowerCase().replace(/\s+/g, "_");
  if (VALID_HIGH_YIELD_TYPES.includes(normalized as ValidHighYieldType)) {
    return normalized as ValidHighYieldType;
  }
  const aliasMap: Record<string, ValidHighYieldType> = {
    summary: "high_yield_summary",
    confusion: "common_confusion",
    "common_confusion": "common_confusion",
    trap: "board_trap",
    "board_trap": "board_trap",
    compare_contrast: "compare_contrast_summary",
    "compare_contrast_summary": "compare_contrast_summary",
  };
  return aliasMap[normalized] ?? "high_yield_summary";
}

/** Resolve draft status for generated content - never auto-publish */
export function resolveDraftStatusForGeneratedContent(
  preferred?: "draft" | "editor_review" | null
): "draft" | "editor_review" {
  return preferred === "editor_review" ? "editor_review" : "draft";
}
