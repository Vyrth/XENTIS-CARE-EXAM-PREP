/**
 * Response formatter - parse AI output into structured MnemonicResponse.
 * Handles malformed JSON and provides safe fallbacks.
 */

import type { MnemonicResponse } from "./types";

/** Parse and validate AI response. Returns null if invalid. */
export function formatMnemonicResponse(
  rawContent: string
): MnemonicResponse | null {
  const trimmed = rawContent.trim();

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

    const conceptSummary = String(parsed.conceptSummary ?? "").trim();
    const mnemonic = String(parsed.mnemonic ?? "").trim();
    const whyItWorks = String(parsed.whyItWorks ?? "").trim();
    const rapidRecallVersion = String(parsed.rapidRecallVersion ?? "").trim();
    const boardTip = String(parsed.boardTip ?? "").trim();

    if (!conceptSummary || !mnemonic) return null;

    return {
      conceptSummary: conceptSummary || "Concept summary unavailable.",
      mnemonic: mnemonic || "Mnemonic unavailable.",
      whyItWorks: whyItWorks || "Memory aid.",
      rapidRecallVersion: rapidRecallVersion || conceptSummary.slice(0, 100),
      boardTip: boardTip || "Review this concept in your study materials.",
    };
  } catch {
    return null;
  }
}

/** Fallback response when parsing fails */
export function getFallbackMnemonicResponse(): MnemonicResponse {
  return {
    conceptSummary:
      "I couldn't parse the mnemonic. Please try again or rephrase your selection.",
    mnemonic: "Try creating your own mnemonic to remember this.",
    whyItWorks: "Personal mnemonics often work best when you create them yourself.",
    rapidRecallVersion: "Review this concept in your study materials.",
    boardTip: "Practice related questions in the question bank.",
  };
}
