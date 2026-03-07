/**
 * Response formatter - parse AI output into structured ExplainHighlightResponse.
 * Handles malformed JSON and provides safe fallbacks.
 */

import type { ExplainHighlightResponse } from "./types";

/** Parse and validate AI response. Returns null if invalid. */
export function formatExplainHighlightResponse(
  rawContent: string
): ExplainHighlightResponse | null {
  const trimmed = rawContent.trim();

  // Try to extract JSON (AI might wrap in markdown code block)
  let jsonStr = trimmed;
  const jsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  } else {
    const braceMatch = trimmed.match(/\{[\s\S]*\}/);
    if (braceMatch) {
      jsonStr = braceMatch[0];
    }
  }

  try {
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;

    const simpleExplanation = String(parsed.simpleExplanation ?? "").trim();
    const boardTip = String(parsed.boardTip ?? "").trim();
    const memoryTrick = String(parsed.memoryTrick ?? "").trim();
    const suggestedNextStep = String(parsed.suggestedNextStep ?? "").trim();

    if (!simpleExplanation) return null;

    return {
      simpleExplanation: simpleExplanation || "Explanation unavailable.",
      boardTip: boardTip || "Review this concept in your study materials.",
      memoryTrick: memoryTrick || "Try creating your own mnemonic.",
      suggestedNextStep: suggestedNextStep || "Practice related questions.",
    };
  } catch {
    return null;
  }
}

/** Fallback response when parsing fails */
export function getFallbackResponse(): ExplainHighlightResponse {
  return {
    simpleExplanation:
      "I couldn't parse the explanation. Please try again or rephrase your selection.",
    boardTip: "Review this concept in your study materials.",
    memoryTrick: "Try creating your own mnemonic to remember this.",
    suggestedNextStep: "Practice related questions in the question bank.",
  };
}
