/**
 * Response formatter - parse AI output into structured GenerateFlashcardsResponse.
 */

import type { GeneratedFlashcard, DifficultyLevel } from "./types";

const VALID_DIFFICULTY: DifficultyLevel[] = ["easy", "medium", "hard"];

function normalizeCard(raw: Record<string, unknown>): GeneratedFlashcard | null {
  const front = String(raw.front_text ?? raw.front ?? "").trim();
  const back = String(raw.back_text ?? raw.back ?? "").trim();

  if (!front || !back) return null;

  const hint = String(raw.hint_text ?? raw.hint ?? "").trim();
  const memoryTrick = String(raw.memory_trick ?? raw.memoryTrick ?? "").trim();
  const difficulty = String(raw.difficulty_level ?? raw.difficulty ?? "").trim();

  return {
    front_text: front,
    back_text: back,
    ...(hint && { hint_text: hint }),
    ...(memoryTrick && { memory_trick: memoryTrick }),
    ...(VALID_DIFFICULTY.includes(difficulty as DifficultyLevel) && {
      difficulty_level: difficulty as DifficultyLevel,
    }),
  };
}

/** Parse and validate AI response. Returns null if invalid. */
export function formatFlashcardsResponse(
  rawContent: string
): GeneratedFlashcard[] | null {
  const trimmed = rawContent.trim();

  let jsonStr = trimmed;
  const jsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  } else {
    const arrayMatch = trimmed.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      jsonStr = arrayMatch[0];
    }
  }

  try {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) return null;

    const cards: GeneratedFlashcard[] = [];
    for (const item of parsed) {
      if (item && typeof item === "object") {
        const card = normalizeCard(item as Record<string, unknown>);
        if (card) cards.push(card);
      }
    }

    return cards.length > 0 ? cards : null;
  } catch {
    return null;
  }
}
