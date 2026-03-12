/**
 * Response formatter - parse AI output into structured NotebookSummaryResponse.
 */

import type { NotebookSummaryResponse } from "./types";

/** Parse and validate AI response. Returns null if invalid. */
export function formatNotebookSummaryResponse(
  rawContent: string
): NotebookSummaryResponse | null {
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

    const cleanedSummary = String(parsed.cleanedSummary ?? "").trim();
    const keyTakeaways = String(parsed.keyTakeaways ?? "").trim();
    const highYieldFacts = String(parsed.highYieldFacts ?? "").trim();
    const commonConfusion = String(parsed.commonConfusion ?? "").trim();
    const boardTip = String(parsed.boardTip ?? "").trim();
    const mnemonicSuggestion = String(parsed.mnemonicSuggestion ?? "").trim();

    if (!cleanedSummary) return null;

    return {
      cleanedSummary,
      keyTakeaways: keyTakeaways || "Review key points from your materials.",
      highYieldFacts: highYieldFacts || "Focus on high-yield content for your exam.",
      commonConfusion: commonConfusion || "Be aware of common distractors.",
      boardTip: boardTip || "Practice related questions.",
      mnemonicSuggestion: mnemonicSuggestion || undefined,
    };
  } catch {
    return null;
  }
}

/** Fallback when parsing fails */
export function getFallbackNotebookSummaryResponse(): NotebookSummaryResponse {
  return {
    cleanedSummary:
      "I couldn't parse the summary. Please try again or rephrase your notes.",
    keyTakeaways: "Review key points from your materials.",
    highYieldFacts: "Focus on high-yield content for your exam.",
    commonConfusion: "Be aware of common distractors.",
    boardTip: "Practice related questions.",
  };
}
