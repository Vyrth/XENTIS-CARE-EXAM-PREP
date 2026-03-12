/**
 * Jade Tutor - Strict Response Contract
 *
 * All AI outputs must conform to these schemas. Server-side validation ensures
 * malformed output never reaches the UI. Each response includes a `mode` for
 * deterministic rendering.
 */

import { z } from "zod";
import type { ExamTrack } from "@/lib/ai/jade-client";

// ─── Question Set ───────────────────────────────────────────────────────────

const choiceSchema = z.object({
  key: z.string().min(1).max(2),
  text: z.string().min(1),
});

const questionItemSchema = z.object({
  stem: z.string().min(1),
  choices: z.array(choiceSchema).min(2).max(6),
  correct_answer: z.string().min(1),
  rationale: z.string().min(1),
  difficulty: z.enum(["easy", "medium", "hard"]).optional().default("medium"),
  exam_track: z.enum(["lvn", "rn", "fnp", "pmhnp"]).optional(),
});

export const questionSetSchema = z.object({
  mode: z.literal("question_set"),
  track: z.enum(["lvn", "rn", "fnp", "pmhnp"]),
  topic: z.string().optional(),
  system: z.string().optional(),
  questions: z.array(questionItemSchema).min(1).max(20),
});

export type QuestionSetPayload = z.infer<typeof questionSetSchema>;
export type QuestionItem = z.infer<typeof questionItemSchema>;

// ─── Flashcard Set ─────────────────────────────────────────────────────────

const flashcardItemSchema = z.object({
  front: z.string().min(1),
  back: z.string().min(1),
});

export const flashcardSetSchema = z.object({
  mode: z.literal("flashcard_set"),
  cards: z.array(flashcardItemSchema).min(1).max(50),
});

export type FlashcardSetPayload = z.infer<typeof flashcardSetSchema>;
export type FlashcardItem = z.infer<typeof flashcardItemSchema>;

// ─── Concept Explanation ───────────────────────────────────────────────────

export const conceptExplanationSchema = z.object({
  mode: z.literal("concept_explanation"),
  title: z.string().min(1),
  summary: z.string().min(1),
  high_yield_points: z.array(z.string().min(1)).min(1).max(10),
  common_traps: z.array(z.string().min(1)).min(0).max(5).optional().default([]),
});

export type ConceptExplanationPayload = z.infer<typeof conceptExplanationSchema>;

// ─── Union for validation ──────────────────────────────────────────────────

export const jadeResponseSchema = z.discriminatedUnion("mode", [
  questionSetSchema,
  flashcardSetSchema,
  conceptExplanationSchema,
]);

export type JadeResponsePayload = z.infer<typeof jadeResponseSchema>;

// ─── Validation helpers ────────────────────────────────────────────────────

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; raw?: string };

export function parseQuestionSet(raw: string, fallbackTrack: ExamTrack): ParseResult<QuestionSetPayload> {
  const parsed = extractJson(raw);
  if (!parsed) return { ok: false, error: "No valid JSON found in response", raw: raw.slice(0, 500) };

  let toValidate: Record<string, unknown>;
  if (Array.isArray(parsed)) {
    toValidate = {
      mode: "question_set",
      track: fallbackTrack,
      questions: parsed.map((q) => normalizeQuestionRaw(q)),
    };
  } else {
    const normalized = normalizeQuestionRaw(parsed) as Record<string, unknown>;
    toValidate = {
      mode: normalized.mode ?? "question_set",
      track: normalized.track ?? fallbackTrack,
      topic: (normalized as { topic?: string }).topic,
      system: (normalized as { system?: string }).system,
      questions: Array.isArray(normalized.questions) ? normalized.questions.map((q: unknown) => normalizeQuestionRaw(q)) : [],
    };
  }

  const result = questionSetSchema.safeParse(toValidate);
  if (result.success) {
    const data = result.data;
    data.questions.forEach((q) => {
      if (!q.exam_track) q.exam_track = data.track;
    });
    return { ok: true, data };
  }

  const msg = result.error?.message ?? "Invalid question set structure";
  return { ok: false, error: msg, raw: raw.slice(0, 500) };
}

export function parseFlashcardSet(raw: string): ParseResult<FlashcardSetPayload> {
  const parsed = extractJson(raw);
  if (!parsed) return { ok: false, error: "No valid JSON found in response", raw: raw.slice(0, 500) };

  const toValidate = normalizeFlashcardRaw(parsed) as Record<string, unknown>;
  if (!toValidate.mode) toValidate.mode = "flashcard_set";

  const result = flashcardSetSchema.safeParse(toValidate);
  if (result.success) return { ok: true, data: result.data };

  const msg = result.error?.message ?? "Invalid flashcard set structure";
  return { ok: false, error: msg, raw: raw.slice(0, 500) };
}

export function parseConceptExplanation(raw: string): ParseResult<ConceptExplanationPayload> {
  const parsed = extractJson(raw);
  if (!parsed) return { ok: false, error: "No valid JSON found in response", raw: raw.slice(0, 500) };

  const obj = parsed as Record<string, unknown>;
  if (!obj.mode) obj.mode = "concept_explanation";

  const result = conceptExplanationSchema.safeParse(obj);
  if (result.success) return { ok: true, data: result.data };

  const msg = result.error?.message ?? "Invalid concept explanation structure";
  return { ok: false, error: msg, raw: raw.slice(0, 500) };
}

function extractJson(text: string): unknown {
  if (!text?.trim()) return null;
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]);
    } catch {
      // fall through
    }
  }
  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      return JSON.parse(objectMatch[0]);
    } catch {
      // fall through
    }
  }
  return null;
}

/** Normalize AI output variations (options→choices, correctKey→correct_answer) for validation */
export function normalizeQuestionRaw(obj: unknown): unknown {
  if (!obj || typeof obj !== "object") return obj;
  const o = obj as Record<string, unknown>;
  const choices = o.choices ?? o.options;
  let correct = o.correct_answer ?? o.correctKey ?? o.correctAnswer;

  const normalized: Record<string, unknown> = { ...o };

  if (Array.isArray(choices)) {
    const mapped = choices.map((c: unknown, i: number) => {
      if (typeof c === "string") return { key: String.fromCharCode(65 + i), text: c };
      const cc = c as Record<string, unknown>;
      const key = String(cc.key ?? cc.letter ?? String.fromCharCode(65 + i)).slice(0, 1).toUpperCase() || "A";
      const text = String(cc.text ?? cc.option ?? "");
      const isCorrect = Boolean(cc.isCorrect ?? cc.is_correct);
      if (isCorrect && !correct) correct = key;
      return { key, text };
    });
    normalized.choices = mapped;
  }
  if (correct !== undefined) normalized.correct_answer = String(correct).slice(0, 1).toUpperCase() || "A";

  return normalized;
}

/** Normalize flashcard raw (cards vs flashcards, front/back) */
export function normalizeFlashcardRaw(obj: unknown): unknown {
  if (!obj || typeof obj !== "object") return obj;
  const o = obj as Record<string, unknown>;
  const arr = o.cards ?? o.flashcards ?? (Array.isArray(o) ? o : null);
  if (Array.isArray(arr)) {
    return {
      mode: "flashcard_set",
      cards: arr.map((c: unknown) => {
        if (!c || typeof c !== "object") return { front: "", back: "" };
        const cc = c as Record<string, unknown>;
        return {
          front: String(cc.front ?? cc.frontText ?? cc.question ?? ""),
          back: String(cc.back ?? cc.backText ?? cc.answer ?? ""),
        };
      }).filter((c) => c.front && c.back),
    };
  }
  return obj;
}
