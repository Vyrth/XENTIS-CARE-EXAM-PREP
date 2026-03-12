/**
 * Question Generation Worker - validation before save.
 *
 * Validates every generated item before bulk insert.
 * Rules: minimum stem length, option counts, correct answer counts,
 * rationale present, track/system ids, etc.
 */

import type { QuestionItemType } from "@/lib/ai/question-factory/types";

const MIN_STEM_LENGTH = 80;
const MIN_STEM_LENGTH_SBA = 120;
const MIN_OPTIONS_SBA = 4;
const MIN_OPTIONS_MULTIPLE = 4;
const MIN_RATIONALE_LENGTH = 100;

export interface ValidatedQuestion {
  stem: string;
  leadIn?: string;
  instructions?: string;
  itemType: QuestionItemType;
  options: { key: string; text: string; isCorrect: boolean; distractorRationale?: string }[];
  rationale: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  learningObjective?: string;
  bloomLevel?: string;
  tags?: string[];
  teachingPoint?: string;
  boardRelevance?: string;
  mnemonic?: string;
}

export interface QuestionValidationResult {
  valid: boolean;
  errors: string[];
  data?: ValidatedQuestion;
}

export function validateGeneratedQuestion(
  raw: unknown,
  context: { examTrackId: string; systemId: string; topicId?: string | null }
): QuestionValidationResult {
  const errors: string[] = [];

  if (!raw || typeof raw !== "object") {
    return { valid: false, errors: ["Payload must be an object"] };
  }

  const p = raw as Record<string, unknown>;
  const itemType = (p.itemType ?? "single_best_answer") as QuestionItemType;

  if (!context.examTrackId?.trim()) errors.push("examTrackId is required");
  if (!context.systemId?.trim()) errors.push("systemId is required");

  if (!p.stem || typeof p.stem !== "string") {
    errors.push("stem is required and must be a string");
  } else {
    const stemLen = p.stem.trim().length;
    const minLen = itemType === "single_best_answer" || itemType === "case_study" ? MIN_STEM_LENGTH_SBA : MIN_STEM_LENGTH;
    if (stemLen < minLen) {
      errors.push(`stem must be at least ${minLen} characters (got ${stemLen})`);
    }
  }

  if (!Array.isArray(p.options)) {
    errors.push("options must be an array");
  } else {
    const opts = p.options as { key?: string; text?: string; isCorrect?: boolean; distractorRationale?: string }[];
    const minOpts = itemType === "single_best_answer" ? MIN_OPTIONS_SBA : itemType === "multiple_response" ? MIN_OPTIONS_MULTIPLE : 2;
    if (opts.length < minOpts) {
      errors.push(`${itemType} requires at least ${minOpts} options (got ${opts.length})`);
    }
    const correctCount = opts.filter((o) => o.isCorrect).length;
    if (itemType === "single_best_answer" && correctCount !== 1) {
      errors.push("single_best_answer must have exactly one correct option");
    }
    if (itemType === "multiple_response" && correctCount < 2) {
      errors.push("multiple_response must have at least 2 correct options");
    }
    if (itemType === "select_n") {
      const selectN = p.selectN as number | undefined;
      if (selectN != null && correctCount !== selectN) {
        errors.push(`select_n must have exactly ${selectN} correct options`);
      }
    }
    for (let i = 0; i < opts.length; i++) {
      const o = opts[i];
      if (!o?.key || typeof o.text !== "string") {
        errors.push(`Option ${i + 1}: key and text required`);
      }
      if (typeof o.isCorrect !== "boolean") {
        errors.push(`Option ${i + 1}: isCorrect must be boolean`);
      }
    }
  }

  if (!p.rationale || typeof p.rationale !== "string") {
    errors.push("rationale is required");
  } else if (p.rationale.trim().length < MIN_RATIONALE_LENGTH) {
    errors.push(`rationale must be at least ${MIN_RATIONALE_LENGTH} characters`);
  }

  const difficulty = p.difficulty as number | undefined;
  if (difficulty == null || typeof difficulty !== "number" || difficulty < 1 || difficulty > 5) {
    errors.push("difficulty must be 1-5");
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const opts = (p.options as { key?: string; text?: string; isCorrect?: boolean; distractorRationale?: string }[]) ?? [];
  const data: ValidatedQuestion = {
    stem: (p.stem as string).trim(),
    leadIn: (p.leadIn as string)?.trim() || undefined,
    instructions: (p.instructions as string)?.trim() || undefined,
    itemType,
    options: opts.map((o) => ({
      key: String(o.key ?? "?").trim().slice(0, 1).toUpperCase() || "A",
      text: String(o.text ?? "").trim(),
      isCorrect: Boolean(o.isCorrect),
      distractorRationale: o.distractorRationale?.trim() || undefined,
    })),
    rationale: (p.rationale as string).trim(),
    difficulty: (difficulty ?? 3) as 1 | 2 | 3 | 4 | 5,
    learningObjective: (p.learningObjective as string)?.trim() || undefined,
    bloomLevel: (p.bloomLevel as string)?.trim() || undefined,
    tags: Array.isArray(p.tags) ? (p.tags as string[]).filter((t) => typeof t === "string") : undefined,
    teachingPoint: (p.teachingPoint as string)?.trim() || undefined,
    boardRelevance: (p.boardRelevance as string)?.trim() || undefined,
    mnemonic: (p.mnemonic as string)?.trim() || undefined,
  };

  return { valid: true, errors: [], data };
}
