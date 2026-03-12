/**
 * Jade Tutor - Server-side validators/parsers for AI outputs
 *
 * Ensures structured output for reliable UI rendering.
 */

import type { LearnerQuestion, LearnerFlashcard } from "./schemas";

function extractJson<T = unknown>(text: string): T | null {
  if (!text?.trim()) return null;
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]) as T;
    } catch {
      // fall through
    }
  }
  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      return JSON.parse(objectMatch[0]) as T;
    } catch {
      // fall through
    }
  }
  return null;
}

/** Parse and validate learner question set from AI output */
export function parseQuestionSet(raw: string): LearnerQuestion[] | null {
  const parsed = extractJson<unknown[]>(raw);
  if (!Array.isArray(parsed) || parsed.length === 0) return null;

  const questions: LearnerQuestion[] = [];
  for (const q of parsed) {
    if (!q || typeof q !== "object") continue;
    const obj = q as Record<string, unknown>;
    const stem = String(obj.stem ?? "").trim();
    if (!stem) continue;

    const opts = Array.isArray(obj.options) ? obj.options : [];
    const options: { key: string; text: string; isCorrect: boolean }[] = [];
    let correctKey = "A";
    for (const o of opts) {
      if (!o || typeof o !== "object") continue;
      const oo = o as Record<string, unknown>;
      const key = String(oo.key ?? "A").trim().slice(0, 1).toUpperCase() || "A";
      const text = String(oo.text ?? "").trim();
      const isCorrect = Boolean(oo.isCorrect ?? oo.is_correct);
      if (text) {
        options.push({ key, text, isCorrect });
        if (isCorrect) correctKey = key;
      }
    }
    if (options.length < 2) continue;

    const hasCorrect = options.some((x) => x.isCorrect);
    if (!hasCorrect && options.length > 0) options[0].isCorrect = true;

    const rationale = String(obj.rationale ?? "").trim() || "Review the key concepts.";

    questions.push({
      stem,
      options,
      rationale,
      correctKey: options.find((x) => x.isCorrect)?.key ?? "A",
    });
  }
  return questions.length > 0 ? questions : null;
}

/** Parse and validate flashcard set from AI output */
export function parseFlashcardSet(raw: string): LearnerFlashcard[] | null {
  const parsed = extractJson<unknown[]>(raw);
  if (!Array.isArray(parsed) || parsed.length === 0) return null;

  const cards: LearnerFlashcard[] = [];
  for (const c of parsed) {
    if (!c || typeof c !== "object") continue;
    const obj = c as Record<string, unknown>;
    const front = String(obj.front ?? obj.frontText ?? "").trim();
    const back = String(obj.back ?? obj.backText ?? "").trim();
    if (front && back) cards.push({ front, back });
  }
  return cards.length > 0 ? cards : null;
}
