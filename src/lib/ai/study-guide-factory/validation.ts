/**
 * Study Guide Factory - payload validation before save.
 */

import type { StudyGuidePayload, StudyGuideSectionPackPayload } from "./types";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateStudyGuidePayload(payload: unknown): ValidationResult {
  const errors: string[] = [];

  if (!payload || typeof payload !== "object") {
    return { valid: false, errors: ["Payload must be an object"] };
  }

  const p = payload as Record<string, unknown>;

  if (!p.title || typeof p.title !== "string") {
    errors.push("title is required and must be a string");
  } else if (p.title.trim().length < 3) {
    errors.push("title must be at least 3 characters");
  }

  if (!p.description || typeof p.description !== "string") {
    errors.push("description is required");
  } else if (p.description.trim().length < 10) {
    errors.push("description must be at least 10 characters");
  }

  if (!Array.isArray(p.sections)) {
    errors.push("sections must be an array");
  } else {
    if (p.sections.length < 1) errors.push("At least one section required");
    for (let i = 0; i < p.sections.length; i++) {
      const s = p.sections[i];
      if (!s || typeof s !== "object") {
        errors.push(`Section ${i + 1}: must be an object`);
      } else {
        const sec = s as Record<string, unknown>;
        if (!sec.title || typeof sec.title !== "string") errors.push(`Section ${i + 1}: title required`);
        if (!sec.contentMarkdown || typeof sec.contentMarkdown !== "string")
          errors.push(`Section ${i + 1}: contentMarkdown required`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateStudyGuideSectionPackPayload(payload: unknown): ValidationResult {
  const errors: string[] = [];

  if (!payload || typeof payload !== "object") {
    return { valid: false, errors: ["Payload must be an object"] };
  }

  const p = payload as StudyGuideSectionPackPayload;

  if (!Array.isArray(p.sections)) {
    errors.push("sections must be an array");
  } else {
    if (p.sections.length < 1) errors.push("At least one section required");
    for (let i = 0; i < p.sections.length; i++) {
      const s = p.sections[i];
      if (!s?.title?.trim()) errors.push(`Section ${i + 1}: title required`);
      if (!s?.contentMarkdown?.trim()) errors.push(`Section ${i + 1}: contentMarkdown required`);
    }
  }

  return { valid: errors.length === 0, errors };
}
