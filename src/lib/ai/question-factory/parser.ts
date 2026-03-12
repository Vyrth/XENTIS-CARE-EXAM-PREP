/**
 * Question Factory - JSON parsing for AI-generated question output.
 */

import type { QuestionPayload, QuestionOptionPayload, QuestionItemType } from "./types";

function extractJson<T = unknown>(text: string): T | null {
  if (!text || typeof text !== "string") return null;
  const trimmed = text.trim();
  const objectMatch = trimmed.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      return JSON.parse(objectMatch[0]) as T;
    } catch {
      /* fall through */
    }
  }
  const arrayMatch = trimmed.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]) as T;
    } catch {
      /* fall through */
    }
  }
  return null;
}

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

function normalizeOption(o: unknown): QuestionOptionPayload | null {
  if (!o || typeof o !== "object") return null;
  const obj = o as Record<string, unknown>;
  const key = String(obj.key ?? obj.option_key ?? "?").trim().slice(0, 1).toUpperCase() || "A";
  const text = String(obj.text ?? obj.option_text ?? "").trim();
  const isCorrect = Boolean(obj.isCorrect ?? obj.is_correct);
  const distractorRationale = obj.distractorRationale ?? obj.distractor_rationale;
  const correctOrder = obj.correctOrder != null ? Number(obj.correctOrder) : undefined;
  const coords = obj.coords as { x: number; y: number; radius?: number } | undefined;

  const result: QuestionOptionPayload = {
    key,
    text,
    isCorrect,
    distractorRationale: distractorRationale ? String(distractorRationale).trim() : undefined,
  };
  if (correctOrder != null && correctOrder >= 1) result.correctOrder = correctOrder;
  if (coords && typeof coords.x === "number" && typeof coords.y === "number") {
    result.coords = { x: coords.x, y: coords.y, radius: coords.radius };
  }
  return result;
}

/** Map difficulty string (easy/moderate/hard) to 1-5 tier */
function mapDifficulty(d: unknown): 1 | 2 | 3 | 4 | 5 {
  if (d != null && typeof d === "number" && d >= 1 && d <= 5) return d as 1 | 2 | 3 | 4 | 5;
  const s = String(d ?? "").toLowerCase();
  if (s === "easy") return 1;
  if (s === "moderate" || s === "medium") return 3;
  if (s === "hard" || s === "difficult") return 5;
  return 3;
}

/** Convert options-as-strings + correct_index + distractor_rationales to QuestionOptionPayload[] */
function convertFromAlternateFormat(
  optionsRaw: unknown[],
  correctIndex: number,
  distractorRationales: unknown[]
): QuestionOptionPayload[] {
  const dr = Array.isArray(distractorRationales) ? distractorRationales.map((x) => String(x ?? "").trim()) : [];
  const wrongIndices = optionsRaw.map((_, i) => i).filter((i) => i !== correctIndex);
  return optionsRaw.map((opt, i) => {
    const text = typeof opt === "string" ? opt.trim() : String(opt ?? "").trim();
    const key = String.fromCharCode(65 + (i % 26));
    const isCorrect = i === correctIndex;
    const wrongIdx = wrongIndices.indexOf(i);
    const distractorRationale = wrongIdx >= 0 && dr[wrongIdx] ? dr[wrongIdx] : undefined;
    return { key, text, isCorrect, distractorRationale };
  });
}

export function parseQuestionPayload(raw: string): QuestionPayload | null {
  let parsed = extractJson<Record<string, unknown>>(raw);
  if (!parsed) return null;
  // Support batch format: { "questions": [{ stem, options, ... }] }
  if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
    const first = parsed.questions[0];
    parsed = first && typeof first === "object" ? (first as Record<string, unknown>) : parsed;
  }
  if (!parsed?.stem) return null;

  const itemType = String(parsed.itemType ?? "single_best_answer").trim() as QuestionItemType;
  if (!VALID_ITEM_TYPES.includes(itemType)) return null;

  let options: QuestionOptionPayload[];

  // Alternate format: options as string array + correct_index + distractor_rationales (Jade Tutor)
  if (Array.isArray(parsed.options) && parsed.options.length >= 2) {
    const first = parsed.options[0];
    const isStringOptions = typeof first === "string";
    if (isStringOptions) {
      const correctIndex = Math.max(0, Math.min(Number(parsed.correct_index ?? 0), parsed.options.length - 1));
      options = convertFromAlternateFormat(
        parsed.options,
        correctIndex,
        Array.isArray(parsed.distractor_rationales) ? parsed.distractor_rationales : []
      );
    } else {
      options = parsed.options
        .map(normalizeOption)
        .filter((o): o is QuestionOptionPayload => o != null);
    }
  } else {
    return null;
  }

  if (options.length < 2) return null;

  const correctCount = options.filter((o) => o.isCorrect).length;
  if (itemType === "single_best_answer" && correctCount !== 1) return null;
  if (itemType === "multiple_response" && correctCount < 2) return null;
  if (itemType === "select_n") {
    const selectN = parsed.selectN != null ? Number(parsed.selectN) : 2;
    if (correctCount !== selectN) return null;
  }
  if (correctCount < 1) return null;

  const rationale = parsed.rationale ? String(parsed.rationale).trim() : "";
  if (rationale.length < 10) return null;

  const difficultyTier = mapDifficulty(parsed.difficulty);

  return {
    stem: String(parsed.stem).trim(),
    leadIn: parsed.leadIn ? String(parsed.leadIn).trim() : undefined,
    instructions: parsed.instructions ? String(parsed.instructions).trim() : undefined,
    itemType,
    options,
    rationale,
    teachingPoint: parsed.teaching_point ? String(parsed.teaching_point).trim() : undefined,
    boardRelevance: parsed.board_relevance ? String(parsed.board_relevance).trim() : undefined,
    mnemonic: parsed.mnemonic ? String(parsed.mnemonic).trim() : undefined,
    difficulty: difficultyTier,
    domain: parsed.domain ? String(parsed.domain).trim() : undefined,
    system: parsed.system ? String(parsed.system).trim() : undefined,
    topic: parsed.topic ? String(parsed.topic).trim() : undefined,
    learningObjective: parsed.learningObjective ? String(parsed.learningObjective).trim() : undefined,
    tags: Array.isArray(parsed.tags) ? parsed.tags.map((t) => String(t).trim()).filter(Boolean) : undefined,
    selectN: parsed.selectN != null ? Number(parsed.selectN) : undefined,
    exhibitPlaceholder: parsed.exhibitPlaceholder ? String(parsed.exhibitPlaceholder).trim() : undefined,
    dosageContext: parsed.dosageContext ? String(parsed.dosageContext).trim() : undefined,
    primaryReference: parsed.primary_reference ? String(parsed.primary_reference).trim() : undefined,
    guidelineReference: parsed.guideline_reference ? String(parsed.guideline_reference).trim() : undefined,
    evidenceTier:
      typeof parsed.evidence_tier === "number" &&
      parsed.evidence_tier >= 1 &&
      parsed.evidence_tier <= 3
        ? (parsed.evidence_tier as 1 | 2 | 3)
        : undefined,
  };
}
