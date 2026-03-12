/**
 * Flashcard Factory - JSON parsing for AI-generated flashcard output.
 */

import type { FlashcardDeckPayload, FlashcardPayload, FlashcardDeckMode } from "./types";

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
  return null;
}

function normalizeCard(c: unknown): FlashcardPayload | null {
  if (!c || typeof c !== "object") return null;
  const obj = c as Record<string, unknown>;
  const front = String(obj.frontText ?? obj.front_text ?? "").trim();
  const back = String(obj.backText ?? obj.back_text ?? "").trim();
  if (!front || !back) return null;

  const result: FlashcardPayload = { frontText: front, backText: back };
  if (obj.hint && String(obj.hint).trim()) result.hint = String(obj.hint).trim();
  if (obj.memoryTrick ?? obj.memory_trick) {
    result.memoryTrick = String(obj.memoryTrick ?? obj.memory_trick).trim();
  }
  if (obj.metadata && typeof obj.metadata === "object") {
    result.metadata = obj.metadata as Record<string, unknown>;
  }
  return result;
}

const VALID_DECK_TYPES: FlashcardDeckMode[] = ["rapid_recall", "high_yield_clinical"];
const VALID_DIFFICULTIES = ["easy", "medium", "hard"] as const;

export function parseFlashcardDeckOutput(raw: string): FlashcardDeckPayload | null {
  const parsed = extractJson<Record<string, unknown>>(raw);
  if (!parsed || !Array.isArray(parsed.cards)) return null;

  const cards = parsed.cards
    .map(normalizeCard)
    .filter((c): c is FlashcardPayload => c != null);
  if (cards.length < 3) return null;

  const deckType = String(parsed.deckType ?? "rapid_recall").trim() as FlashcardDeckMode;
  if (!VALID_DECK_TYPES.includes(deckType)) return null;

  const difficulty = parsed.difficulty
    ? (VALID_DIFFICULTIES.includes(String(parsed.difficulty).trim() as (typeof VALID_DIFFICULTIES)[number])
        ? String(parsed.difficulty).trim()
        : "medium")
    : "medium";

  return {
    name: String(parsed.name ?? "Flashcard Deck").trim(),
    description: parsed.description ? String(parsed.description).trim() : undefined,
    deckType,
    difficulty: difficulty as "easy" | "medium" | "hard",
    cards,
  };
}
