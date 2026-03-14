/**
 * Jade Tutor Content Factory - structured JSON parsing with schema validation.
 * Extracts and validates AI output for persistence.
 */

import { parseQuestionPayload } from "../question-factory/parser";
import {
  parseStudyGuideOutput as parseStudyGuidePayload,
  parseStudyGuideSectionPackOutput as parseSectionPackPayload,
} from "../study-guide-factory/parser";
import { parseFlashcardDeckOutput as parseFlashcardDeckPayload } from "../flashcard-factory/parser";
import { parseHighYieldOutput as parseHighYieldPayload } from "../high-yield-factory/parser";
import type {
  ContentMode,
  QuestionOutput,
  QuestionOptionOutput,
  StudyGuideSectionOutput,
  StudyGuideOutput,
  StudyGuideSectionPackOutput,
  FlashcardOutput,
  FlashcardDeckOutput,
  HighYieldSummaryOutput,
  CommonConfusionOutput,
  BoardTrapOutput,
  CompareContrastOutput,
} from "./types";

/** Extract JSON object or array from raw text (handles markdown fences, preamble) */
export function extractJson<T = unknown>(text: string): T | null {
  if (!text || typeof text !== "string") return null;
  const trimmed = text.trim();

  // Try to find JSON object {...}
  const objectMatch = trimmed.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      return JSON.parse(objectMatch[0]) as T;
    } catch {
      // fall through to array
    }
  }

  // Try to find JSON array [...]
  const arrayMatch = trimmed.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]) as T;
    } catch {
      // fall through
    }
  }

  return null;
}

function normalizeOption(o: unknown): QuestionOptionOutput | null {
  if (!o || typeof o !== "object") return null;
  const obj = o as Record<string, unknown>;
  const key = String(obj.key ?? obj.option_key ?? "?").trim().slice(0, 1) || "A";
  const text = String(obj.text ?? obj.option_text ?? "").trim();
  const isCorrect = Boolean(obj.isCorrect ?? obj.is_correct);
  const distractorRationale = obj.distractorRationale ?? obj.distractor_rationale;
  return {
    key: key.toUpperCase(),
    text,
    isCorrect,
    distractorRationale: distractorRationale ? String(distractorRationale).trim() : undefined,
  };
}

/** Extended question output (full payload from question-factory parser) */
export type ExtendedQuestionOutput = QuestionOutput & {
  itemType?: string;
  difficulty?: 1 | 2 | 3 | 4 | 5;
  domain?: string;
  system?: string;
  topic?: string;
  learningObjective?: string;
  teachingPoint?: string;
  boardRelevance?: string;
  mnemonic?: string;
  tags?: string[];
  selectN?: number;
  exhibitPlaceholder?: string;
  dosageContext?: string;
  primaryReference?: string;
  guidelineReference?: string;
  evidenceTier?: 1 | 2 | 3;
  options: (QuestionOptionOutput & { correctOrder?: number; coords?: { x: number; y: number; radius?: number } })[];
};

export function parseQuestionOutput(raw: string): QuestionOutput | ExtendedQuestionOutput | null {
  const payload = parseQuestionPayload(raw);
  if (payload) {
    return {
      stem: payload.stem,
      leadIn: payload.leadIn,
      instructions: payload.instructions,
      options: payload.options.map((o) => ({
        key: o.key,
        text: o.text,
        isCorrect: o.isCorrect,
        distractorRationale: o.distractorRationale,
        correctOrder: o.correctOrder,
        coords: o.coords,
      })),
      rationale: payload.rationale,
      itemType: payload.itemType,
      difficulty: payload.difficulty,
      domain: payload.domain,
      system: payload.system,
      topic: payload.topic,
      learningObjective: payload.learningObjective,
      teachingPoint: payload.teachingPoint,
      boardRelevance: payload.boardRelevance,
      mnemonic: payload.mnemonic,
      tags: payload.tags,
      selectN: payload.selectN,
      exhibitPlaceholder: payload.exhibitPlaceholder,
      dosageContext: payload.dosageContext,
      primaryReference: payload.primaryReference,
      guidelineReference: payload.guidelineReference,
      evidenceTier: payload.evidenceTier,
    } as ExtendedQuestionOutput;
  }

  const parsed = extractJson<Record<string, unknown>>(raw);
  if (!parsed?.stem || !Array.isArray(parsed.options)) return null;

  const options = parsed.options
    .map(normalizeOption)
    .filter((o): o is QuestionOptionOutput => o != null);
  if (options.length < 2) return null;
  const hasCorrect = options.some((o) => o.isCorrect);
  if (!hasCorrect) return null;

  return {
    stem: String(parsed.stem).trim(),
    leadIn: parsed.leadIn ? String(parsed.leadIn).trim() : undefined,
    instructions: parsed.instructions ? String(parsed.instructions).trim() : undefined,
    options,
    rationale: parsed.rationale ? String(parsed.rationale).trim() : undefined,
  };
}

export function parseStudyGuideOutput(raw: string): StudyGuideOutput | null {
  const payload = parseStudyGuidePayload(raw);
  if (!payload) return null;
  return {
    title: payload.title,
    slugSuggestion: payload.slugSuggestion,
    description: payload.description,
    boardFocus: payload.boardFocus,
    sections: payload.sections.map((s) => ({
      title: s.title,
      slug: s.slug,
      contentMarkdown: s.contentMarkdown,
      plainExplanation: s.plainExplanation,
      keyTakeaways: s.keyTakeaways,
      commonTraps: s.commonTraps,
      quickReviewBullets: s.quickReviewBullets,
      mnemonics: s.mnemonics,
      highYield: s.highYield,
    })),
  };
}

export function parseStudyGuideSectionPackOutput(raw: string): StudyGuideSectionPackOutput | null {
  const payload = parseSectionPackPayload(raw);
  if (!payload) return null;
  return {
    sections: payload.sections.map((s) => ({
      title: s.title,
      slug: s.slug,
      contentMarkdown: s.contentMarkdown,
      plainExplanation: s.plainExplanation,
      keyTakeaways: s.keyTakeaways,
      commonTraps: s.commonTraps,
      quickReviewBullets: s.quickReviewBullets,
      mnemonics: s.mnemonics,
      highYield: s.highYield,
    })),
  };
}

export function parseStudyGuideSectionOutput(raw: string): StudyGuideSectionOutput | null {
  const parsed = extractJson<Record<string, unknown>>(raw);
  if (!parsed?.title || !parsed?.contentMarkdown) return null;

  return {
    title: String(parsed.title).trim(),
    contentMarkdown: String(parsed.contentMarkdown).trim(),
    keyTakeaways: Array.isArray(parsed.keyTakeaways)
      ? parsed.keyTakeaways.map((x) => String(x).trim()).filter(Boolean)
      : undefined,
    mnemonics: Array.isArray(parsed.mnemonics)
      ? parsed.mnemonics.map((x) => String(x).trim()).filter(Boolean)
      : undefined,
  };
}

function normalizeFlashcard(c: unknown): FlashcardOutput | null {
  if (!c || typeof c !== "object") return null;
  const obj = c as Record<string, unknown>;
  const front = String(obj.frontText ?? obj.front_text ?? "").trim();
  const back = String(obj.backText ?? obj.back_text ?? "").trim();
  if (!front || !back) return null;
  return {
    frontText: front,
    backText: back,
    hint: obj.hint ? String(obj.hint).trim() : undefined,
    memoryTrick: obj.memoryTrick ?? obj.memory_trick
      ? String(obj.memoryTrick ?? obj.memory_trick).trim()
      : undefined,
  };
}

export function parseFlashcardDeckOutput(raw: string): FlashcardDeckOutput | null {
  const payload = parseFlashcardDeckPayload(raw);
  if (payload) {
    return {
      name: payload.name,
      description: payload.description,
      deckType: payload.deckType,
      difficulty: payload.difficulty,
      cards: payload.cards.map((c) => ({
        frontText: c.frontText,
        backText: c.backText,
        hint: c.hint,
        memoryTrick: c.memoryTrick,
      })),
    };
  }

  const parsed = extractJson<Record<string, unknown>>(raw);
  if (!parsed) return null;

  const cards = Array.isArray(parsed.cards)
    ? parsed.cards.map(normalizeFlashcard).filter((c): c is FlashcardOutput => c != null)
    : [];
  if (cards.length < 3) return null;

  return {
    name: String(parsed.name ?? "Flashcard Deck").trim(),
    description: parsed.description ? String(parsed.description).trim() : undefined,
    deckType: parsed.deckType ? String(parsed.deckType).trim() : undefined,
    difficulty: parsed.difficulty ? String(parsed.difficulty).trim() : undefined,
    cards,
  };
}

export function parseFlashcardCardsOutput(raw: string): FlashcardOutput[] | null {
  const parsed = extractJson<unknown[]>(raw);
  if (!Array.isArray(parsed)) return null;

  const cards = parsed.map(normalizeFlashcard).filter((c): c is FlashcardOutput => c != null);
  return cards.length > 0 ? cards : null;
}

export function parseHighYieldSummaryOutput(raw: string): HighYieldSummaryOutput | null {
  const payload = parseHighYieldPayload(raw, "high_yield_summary");
  if (!payload) return null;
  return payload as HighYieldSummaryOutput;
}

export function parseCommonConfusionOutput(raw: string): CommonConfusionOutput | null {
  const payload = parseHighYieldPayload(raw, "common_confusion");
  if (!payload) return null;
  return payload as CommonConfusionOutput;
}

export function parseBoardTrapOutput(raw: string): BoardTrapOutput | null {
  const payload = parseHighYieldPayload(raw, "board_trap");
  if (!payload) return null;
  const p = payload as { trapDescription: string; correctApproach: string; severity?: number; trapSeverity?: number };
  return {
    ...payload,
    severity: (p.severity ?? p.trapSeverity) as 1 | 2 | 3 | 4 | 5 | undefined,
  } as BoardTrapOutput;
}

export function parseCompareContrastOutput(raw: string): CompareContrastOutput | null {
  const payload = parseHighYieldPayload(raw, "compare_contrast_summary");
  if (!payload) return null;
  return payload as CompareContrastOutput;
}

/** Parse raw content by mode */
export function parseByMode(
  mode: ContentMode,
  raw: string
):
  | QuestionOutput
  | StudyGuideSectionOutput
  | StudyGuideOutput
  | StudyGuideSectionPackOutput
  | FlashcardDeckOutput
  | FlashcardOutput[]
  | HighYieldSummaryOutput
  | CommonConfusionOutput
  | BoardTrapOutput
  | CompareContrastOutput
  | null {
  switch (mode) {
    case "question":
      return parseQuestionOutput(raw);
    case "study_guide":
      return parseStudyGuideOutput(raw);
    case "study_guide_section_pack":
      return parseStudyGuideSectionPackOutput(raw);
    case "study_guide_section":
      return parseStudyGuideSectionOutput(raw);
    case "flashcard_deck":
      return parseFlashcardDeckOutput(raw);
    case "flashcard_cards":
      return parseFlashcardCardsOutput(raw);
    case "high_yield_summary":
      return parseHighYieldSummaryOutput(raw);
    case "common_confusion":
      return parseCommonConfusionOutput(raw);
    case "board_trap":
      return parseBoardTrapOutput(raw);
    case "compare_contrast":
      return parseCompareContrastOutput(raw);
    default:
      return null;
  }
}
