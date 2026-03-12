/**
 * Jade Tutor - Strict Output Validation
 *
 * Validates AI output before persistence. Returns validation errors
 * instead of crashing. Safe draft fallback path for malformed output.
 */

import {
  parseByMode,
  parseQuestionOutput,
  parseStudyGuideOutput,
  parseStudyGuideSectionPackOutput,
  parseFlashcardDeckOutput,
  parseHighYieldSummaryOutput,
  parseCommonConfusionOutput,
  parseBoardTrapOutput,
  parseCompareContrastOutput,
  type ExtendedQuestionOutput,
} from "./content-factory/parsers";
import type {
  ContentMode,
  QuestionOutput,
  QuestionOptionOutput,
  StudyGuideOutput,
  StudyGuideSectionPackOutput,
  FlashcardDeckOutput,
  FlashcardOutput,
  HighYieldSummaryOutput,
  CommonConfusionOutput,
  BoardTrapOutput,
  CompareContrastOutput,
} from "./content-factory/types";

export interface ValidationSuccess<T> {
  valid: true;
  data: T;
}

export interface ValidationFailure {
  valid: false;
  errors: string[];
  raw?: string;
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

function fail(errors: string[], raw?: string): ValidationFailure {
  return { valid: false, errors, raw };
}

/** Validate question output - stem, options, correct answer, rationale required */
export function validateQuestionOutput(raw: string): ValidationResult<QuestionOutput | ExtendedQuestionOutput> {
  try {
    const parsed = parseQuestionOutput(raw);
    if (!parsed) return fail(["Could not parse question JSON"], raw);

    const errors: string[] = [];
    if (!parsed.stem?.trim()) errors.push("stem is required");
    if (!Array.isArray(parsed.options) || parsed.options.length < 2) {
      errors.push("options array must have at least 2 items");
    } else {
      const hasCorrect = parsed.options.some((o) => o.isCorrect);
      if (!hasCorrect) errors.push("exactly one option must be correct");
      parsed.options.forEach((o, i) => {
        if (!o.text?.trim()) errors.push(`option ${i + 1} text is required`);
      });
    }
    if (!parsed.rationale?.trim()) errors.push("rationale is required");

    if (errors.length > 0) return fail(errors, raw);
    return { valid: true, data: parsed };
  } catch (e) {
    return fail([`Parse error: ${e instanceof Error ? e.message : String(e)}`], raw);
  }
}

/** Validate study guide - title, learning goals, sections required */
export function validateStudyGuideOutput(raw: string): ValidationResult<StudyGuideOutput> {
  try {
    const parsed = parseStudyGuideOutput(raw);
    if (!parsed) return fail(["Could not parse study guide JSON"], raw);

    const errors: string[] = [];
    if (!parsed.title?.trim()) errors.push("title is required");
    if (!parsed.description?.trim()) errors.push("description is required");
    if (!Array.isArray(parsed.sections) || parsed.sections.length === 0) {
      errors.push("sections array must have at least 1 item");
    } else {
      parsed.sections.forEach((s, i) => {
        if (!s.title?.trim()) errors.push(`section ${i + 1} title is required`);
        if (!s.contentMarkdown?.trim()) errors.push(`section ${i + 1} contentMarkdown is required`);
      });
    }

    if (errors.length > 0) return fail(errors, raw);
    return { valid: true, data: parsed };
  } catch (e) {
    return fail([`Parse error: ${e instanceof Error ? e.message : String(e)}`], raw);
  }
}

/** Validate study guide section pack */
export function validateStudyGuideSectionPackOutput(
  raw: string
): ValidationResult<StudyGuideSectionPackOutput> {
  try {
    const parsed = parseStudyGuideSectionPackOutput(raw);
    if (!parsed) return fail(["Could not parse section pack JSON"], raw);

    const errors: string[] = [];
    if (!Array.isArray(parsed.sections) || parsed.sections.length === 0) {
      errors.push("sections array must have at least 1 item");
    } else {
      parsed.sections.forEach((s, i) => {
        if (!s.title?.trim()) errors.push(`section ${i + 1} title is required`);
        if (!s.contentMarkdown?.trim()) errors.push(`section ${i + 1} contentMarkdown is required`);
      });
    }

    if (errors.length > 0) return fail(errors, raw);
    return { valid: true, data: parsed };
  } catch (e) {
    return fail([`Parse error: ${e instanceof Error ? e.message : String(e)}`], raw);
  }
}

/** Validate flashcard deck - name, cards with front/back required */
export function validateFlashcardDeckOutput(raw: string): ValidationResult<FlashcardDeckOutput> {
  try {
    const parsed = parseFlashcardDeckOutput(raw);
    if (!parsed) return fail(["Could not parse flashcard deck JSON"], raw);

    const errors: string[] = [];
    if (!parsed.name?.trim()) errors.push("deck name is required");
    if (!Array.isArray(parsed.cards) || parsed.cards.length === 0) {
      errors.push("cards array must have at least 1 item");
    } else {
      parsed.cards.forEach((c, i) => {
        if (!c.frontText?.trim()) errors.push(`card ${i + 1} frontText is required`);
        if (!c.backText?.trim()) errors.push(`card ${i + 1} backText is required`);
      });
    }

    if (errors.length > 0) return fail(errors, raw);
    return { valid: true, data: parsed };
  } catch (e) {
    return fail([`Parse error: ${e instanceof Error ? e.message : String(e)}`], raw);
  }
}

/** Validate high-yield output - content_type, title, explanation required */
export function validateHighYieldOutput(
  raw: string,
  contentType: "high_yield_summary" | "common_confusion" | "board_trap" | "compare_contrast_summary"
): ValidationResult<HighYieldSummaryOutput | CommonConfusionOutput | BoardTrapOutput | CompareContrastOutput> {
  try {
    let parsed: unknown = null;
    switch (contentType) {
      case "high_yield_summary":
        parsed = parseHighYieldSummaryOutput(raw);
        break;
      case "common_confusion":
        parsed = parseCommonConfusionOutput(raw);
        break;
      case "board_trap":
        parsed = parseBoardTrapOutput(raw);
        break;
      case "compare_contrast_summary":
        parsed = parseCompareContrastOutput(raw);
        break;
      default:
        return fail([`Unsupported content_type: ${contentType}`], raw);
    }

    if (!parsed || typeof parsed !== "object") {
      return fail([`Could not parse ${contentType} JSON`], raw);
    }

    const obj = parsed as Record<string, unknown>;
    const errors: string[] = [];
    if (!obj.title || typeof obj.title !== "string" || !String(obj.title).trim()) {
      errors.push("title is required");
    }
    if (contentType === "board_trap") {
      if (!String(obj.trapDescription ?? "").trim()) errors.push("trapDescription is required");
      if (!String(obj.correctApproach ?? "").trim()) errors.push("correctApproach is required");
    } else if (contentType === "compare_contrast_summary") {
      if (!String(obj.conceptA ?? "").trim()) errors.push("conceptA is required");
      if (!String(obj.conceptB ?? "").trim()) errors.push("conceptB is required");
      if (!String(obj.keyDifference ?? "").trim()) errors.push("keyDifference is required");
    } else {
      if (!String(obj.explanation ?? "").trim()) errors.push("explanation is required");
    }

    if (errors.length > 0) return fail(errors, raw);
    return { valid: true, data: parsed as HighYieldSummaryOutput };
  } catch (e) {
    return fail([`Parse error: ${e instanceof Error ? e.message : String(e)}`], raw);
  }
}

/** Safe parse by mode - returns validation result, never throws */
export function safeParseByMode(
  mode: ContentMode,
  raw: string
): ValidationResult<unknown> {
  try {
    const parsed = parseByMode(mode, raw);
    if (!parsed) return fail(["Could not parse AI output"], raw);

    switch (mode) {
      case "question":
        return validateQuestionOutput(raw);
      case "study_guide":
        return validateStudyGuideOutput(raw);
      case "study_guide_section_pack":
        return validateStudyGuideSectionPackOutput(raw);
      case "flashcard_deck":
        return validateFlashcardDeckOutput(raw);
      case "high_yield_summary":
        return validateHighYieldOutput(raw, "high_yield_summary");
      case "common_confusion":
        return validateHighYieldOutput(raw, "common_confusion");
      case "board_trap":
        return validateHighYieldOutput(raw, "board_trap");
      case "compare_contrast":
        return validateHighYieldOutput(raw, "compare_contrast_summary");
      default:
        return { valid: true, data: parsed };
    }
  } catch (e) {
    return fail([`Validation error: ${e instanceof Error ? e.message : String(e)}`], raw);
  }
}
