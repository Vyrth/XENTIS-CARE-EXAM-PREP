/**
 * Question Factory - payload validation before save.
 * Rejects invalid question payloads.
 */

import type { QuestionPayload, QuestionOptionPayload, QuestionItemType } from "./types";

const VALID_ITEM_TYPES: QuestionItemType[] = [
  "single_best_answer",
  "multiple_response",
  "select_n",
  "image_based",
  "chart_table_exhibit",
  "ordered_response",
  "hotspot",
  "case_study",
  "dosage_calc",
];

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateQuestionPayload(payload: unknown): ValidationResult {
  const errors: string[] = [];

  if (!payload || typeof payload !== "object") {
    return { valid: false, errors: ["Payload must be an object"] };
  }

  const p = payload as Record<string, unknown>;
  const itemType = p.itemType as string | undefined;

  if (!p.stem || typeof p.stem !== "string") {
    errors.push("stem is required and must be a string");
  } else if (p.stem.trim().length < 10) {
    errors.push("stem must be at least 10 characters");
  } else if (
    (itemType === "single_best_answer" || itemType === "case_study") &&
    p.stem.trim().length < 120
  ) {
    errors.push("stem must be at least 120 characters for board-style clinical scenarios");
  }
  if (!itemType) {
    errors.push("itemType is required");
  } else if (!VALID_ITEM_TYPES.includes(itemType as QuestionItemType)) {
    errors.push(`itemType must be one of: ${VALID_ITEM_TYPES.join(", ")}`);
  }

  if (!Array.isArray(p.options)) {
    errors.push("options must be an array");
  } else {
    if (p.options.length < 2) {
      errors.push("At least 2 options required");
    }
    for (let i = 0; i < p.options.length; i++) {
      const o = p.options[i];
      if (!o || typeof o !== "object") {
        errors.push(`Option ${i + 1}: must be an object`);
      } else {
        const opt = o as Record<string, unknown>;
        if (!opt.key || typeof opt.key !== "string") errors.push(`Option ${i + 1}: key required`);
        if (opt.text === undefined || opt.text === null) errors.push(`Option ${i + 1}: text required`);
        if (typeof opt.isCorrect !== "boolean") errors.push(`Option ${i + 1}: isCorrect must be boolean`);
      }
    }
  }

  const correctCount = Array.isArray(p.options)
    ? (p.options as QuestionOptionPayload[]).filter((o) => o.isCorrect).length
    : 0;

  if (itemType === "single_best_answer" && correctCount !== 1) {
    errors.push("Single Best Answer must have exactly one correct option");
  }
  if (itemType === "multiple_response" && correctCount < 2) {
    errors.push("Multiple Response must have at least 2 correct options");
  }
  if (itemType === "select_n") {
    const selectN = p.selectN as number | undefined;
    if (selectN != null && correctCount !== selectN) {
      errors.push(`Select N must have exactly ${selectN} correct options`);
    } else if (correctCount < 1) {
      errors.push("Select N must have at least one correct option");
    }
  }
  if (["ordered_response", "image_based", "chart_table_exhibit", "hotspot", "case_study", "dosage_calc"].includes(itemType ?? "") && correctCount < 1) {
    errors.push("At least one correct option required");
  }

  if (!p.rationale || typeof p.rationale !== "string") {
    errors.push("rationale is required");
  } else if (p.rationale.trim().length < 10) {
    errors.push("rationale must be at least 10 characters");
  } else if (p.rationale.trim().length < 200) {
    errors.push("rationale must be at least 200 characters (post-generation quality check)");
  }

  // Distractor rationales required for all wrong options
  if (Array.isArray(p.options) && itemType === "single_best_answer") {
    const wrongOptions = (p.options as QuestionOptionPayload[]).filter((o) => !o.isCorrect);
    const missingDr = wrongOptions.filter((o) => !(o.distractorRationale && o.distractorRationale.trim().length > 0));
    if (missingDr.length > 0) {
      errors.push(`distractorRationale required for all wrong options (${missingDr.length} missing)`);
    }
  }

  const difficulty = p.difficulty as number | undefined;
  if (difficulty != null && (typeof difficulty !== "number" || difficulty < 1 || difficulty > 5)) {
    errors.push("difficulty must be 1-5");
  }

  if (p.tags != null && !Array.isArray(p.tags)) {
    errors.push("tags must be an array of strings");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
