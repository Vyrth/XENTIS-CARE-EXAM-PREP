/**
 * Prompt builder for Weak Area Coach - board-prep coaching tone, mode-aware.
 * Supports adaptive context for readiness-aware coaching.
 */

import type { AdaptiveContextOutput } from "@/lib/readiness/adaptive-context";
import {
  injectAdaptiveSystemPrompt,
  injectAdaptiveUserContext,
  appendAdaptiveNextStepInstruction,
} from "@/lib/ai/adaptive";
import { appendTrackStrictInstruction } from "@/lib/ai/jade-track-context";
import type { ExamTrack, CoachingMode } from "./types";

const TRACK_NAMES: Record<ExamTrack, string> = {
  lvn: "LVN/LPN",
  rn: "RN",
  fnp: "FNP",
  pmhnp: "PMHNP",
};

const MODE_INSTRUCTIONS: Record<CoachingMode, string> = {
  explain_weakness:
    "Explain why these areas are weak and what the learner is likely missing. Be specific and board-focused.",
  remediation_plan:
    "Create a concrete remediation plan: what to study, how many questions, in what order. Actionable steps.",
  teach_from_zero:
    "Assume the learner needs to build from scratch in these areas. Provide foundational guidance and a clear learning path.",
  exam_readiness:
    "Assess exam readiness given these weak areas. What must improve before exam day? Realistic timeline.",
  mnemonic:
    "Provide a memorable mnemonic or memory trick for the weakest area. Lead with the mnemonic, then briefly explain why it works and how to use it for board prep.",
  follow_up_questions:
    "Generate exactly 5 practice question stems or prompts the learner should work through to strengthen these weak areas. Each should be board-relevant and target the knowledge gaps. Format as a JSON array of strings.",
};

/** Build system prompt for board-prep coaching (not generic life coaching) */
export function buildWeakAreaCoachSystemPrompt(
  track: ExamTrack,
  adaptive?: AdaptiveContextOutput | null
): string {
  const trackName = TRACK_NAMES[track];
  const base = `You are a nursing board exam coach specializing in ${trackName} preparation. Your role is to explain weaknesses and recommend what to do next based on learner analytics.

Guidelines:
- Use a board-prep coaching tone: specific, actionable, exam-focused. Not generic life coaching.
- Explain likely causes of mistakes and what the learner is probably confusing
- Recommend concrete content to review and question volume
- Suggest one clear next step
- Be encouraging but direct. Avoid vague advice.
- Never provide specific medical advice or diagnoses`;
  const withAdaptive = injectAdaptiveSystemPrompt(base, adaptive ?? null);
  return appendTrackStrictInstruction(withAdaptive, track);
}

/** Build user prompt with analytics context and mode */
export function buildWeakAreaCoachUserPrompt(
  analyticsContext: string,
  track: ExamTrack,
  mode: CoachingMode,
  context?: { retrievedContext?: string; adaptiveContext?: AdaptiveContextOutput | null }
): string {
  const trackName = TRACK_NAMES[track];
  const modeInstruction = MODE_INSTRUCTIONS[mode];

  let prompt = `A ${trackName} exam prep learner has the following analytics. ${modeInstruction}

---
${analyticsContext}
---

Respond in valid JSON. Base keys (all strings):
{
  "summaryOfWeakAreas": "2-3 sentence summary of the weak areas",
  "likelyCausesOfMistakes": "2-4 sentences on likely causes (knowledge gaps, confusion, test-taking)",
  "whatLearnerProbablyConfusing": "2-3 sentences on what they're probably confusing or mixing up",
  "recommendedContentToReview": "Specific content: study guides, videos, topics. Be concrete.",
  "recommendedQuestionVolume": "How many questions to practice, per area or total. Be specific.",
  "suggestedNextStep": "One clear, actionable next step (e.g., 'Start with 15 Cardiovascular questions today')",
  "mnemonicSuggestion": "Optional: a brief mnemonic or memory trick for the weakest area, or empty string"
}
${mode === "follow_up_questions" ? `
Additionally include: "followUpQuestions": ["question stem 1", "question stem 2", "question stem 3", "question stem 4", "question stem 5"]` : ""}`;

  if (context?.retrievedContext?.trim()) {
    prompt += `

Platform context (use to enrich recommendations when relevant):
---
${context.retrievedContext}
---`;
  }

  let finalPrompt = injectAdaptiveUserContext(prompt, context?.adaptiveContext ?? null, {
    position: "before",
  });
  finalPrompt = appendAdaptiveNextStepInstruction(finalPrompt, context?.adaptiveContext ?? null);
  return finalPrompt;
}
