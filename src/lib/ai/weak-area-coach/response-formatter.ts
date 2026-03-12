/**
 * Response formatter - parse AI output into structured WeakAreaCoachResponse.
 */

import type { WeakAreaCoachResponse } from "./types";

/** Parse and validate AI response. Returns null if invalid. */
export function formatWeakAreaCoachResponse(
  rawContent: string
): WeakAreaCoachResponse | null {
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

    const summaryOfWeakAreas = String(parsed.summaryOfWeakAreas ?? "").trim();
    const likelyCausesOfMistakes = String(parsed.likelyCausesOfMistakes ?? "").trim();
    const whatLearnerProbablyConfusing = String(
      parsed.whatLearnerProbablyConfusing ?? ""
    ).trim();
    const recommendedContentToReview = String(
      parsed.recommendedContentToReview ?? ""
    ).trim();
    const recommendedQuestionVolume = String(
      parsed.recommendedQuestionVolume ?? ""
    ).trim();
    const suggestedNextStep = String(parsed.suggestedNextStep ?? "").trim();
    const mnemonicSuggestion = String(parsed.mnemonicSuggestion ?? "").trim();
    const rawFollowUp = parsed.followUpQuestions;
    const followUpQuestions = Array.isArray(rawFollowUp)
      ? rawFollowUp.filter((q): q is string => typeof q === "string").slice(0, 5)
      : undefined;

    if (!summaryOfWeakAreas || !suggestedNextStep) return null;

    return {
      summaryOfWeakAreas,
      likelyCausesOfMistakes: likelyCausesOfMistakes || "Review missed questions to identify patterns.",
      whatLearnerProbablyConfusing:
        whatLearnerProbablyConfusing || "Focus on distinguishing similar concepts.",
      recommendedContentToReview:
        recommendedContentToReview || "Study guides and practice questions in weak areas.",
      recommendedQuestionVolume:
        recommendedQuestionVolume || "15-20 questions daily in weak systems.",
      suggestedNextStep,
      mnemonicSuggestion: mnemonicSuggestion || undefined,
      followUpQuestions,
    };
  } catch {
    return null;
  }
}

/** Fallback when parsing fails */
export function getFallbackWeakAreaCoachResponse(): WeakAreaCoachResponse {
  return {
    summaryOfWeakAreas: "Focus on your weakest systems and domains.",
    likelyCausesOfMistakes: "Review your missed questions to identify patterns.",
    whatLearnerProbablyConfusing: "Pay attention to similar concepts you might be mixing up.",
    recommendedContentToReview: "Study guides and practice questions in weak areas.",
    recommendedQuestionVolume: "15-20 questions daily in weak systems.",
    suggestedNextStep: "Start with 15 questions in your weakest system today.",
  };
}
