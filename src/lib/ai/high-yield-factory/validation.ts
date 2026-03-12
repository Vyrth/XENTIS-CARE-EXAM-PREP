/**
 * High-Yield Factory - payload validation before save.
 */

import type { HighYieldContentType } from "./types";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function validateBase(d: Record<string, unknown>): string[] {
  const errors: string[] = [];
  if (!d.title || typeof d.title !== "string") errors.push("title is required");
  else if (d.title.trim().length < 2) errors.push("title must be at least 2 characters");
  return errors;
}

export function validateHighYieldPayload(
  payload: unknown,
  contentType: HighYieldContentType
): ValidationResult {
  const errors: string[] = [];

  if (!payload || typeof payload !== "object") {
    return { valid: false, errors: ["Payload must be an object"] };
  }

  const p = payload as Record<string, unknown>;
  errors.push(...validateBase(p));

  switch (contentType) {
    case "high_yield_summary":
      if (!p.explanation || typeof p.explanation !== "string")
        errors.push("explanation is required");
      break;
    case "common_confusion":
      if (!p.explanation || typeof p.explanation !== "string")
        errors.push("explanation is required");
      break;
    case "board_trap":
      if (!p.trapDescription && !p.trap_description) errors.push("trapDescription is required");
      if (!p.correctApproach && !p.correct_approach) errors.push("correctApproach is required");
      break;
    case "compare_contrast_summary":
      if (!p.conceptA) errors.push("conceptA is required");
      if (!p.conceptB) errors.push("conceptB is required");
      if (!p.keyDifference) errors.push("keyDifference is required");
      break;
  }

  return { valid: errors.length === 0, errors };
}
