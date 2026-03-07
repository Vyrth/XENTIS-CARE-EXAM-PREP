/**
 * Prompt builder for Explain Highlight - track-specific, mode-aware.
 * Structures output for parsing into ExplainHighlightResponse.
 */

import type { ExamTrack, ExplainMode } from "./types";

const TRACK_NAMES: Record<ExamTrack, string> = {
  lvn: "LVN/LPN",
  rn: "RN",
  fnp: "FNP",
  pmhnp: "PMHNP",
};

const MODE_INSTRUCTIONS: Record<ExplainMode, string> = {
  explain_simple:
    "Keep the explanation concise and accessible. Focus on the core concept.",
  board_focus:
    "Emphasize how this concept appears on the board exam. Include common question patterns and distractors.",
  deep_dive:
    "Provide a thorough explanation with pathophysiology, clinical relevance, and nursing implications.",
  mnemonic:
    "Lead with a memorable mnemonic or memory trick. Then briefly explain the concept.",
};

/** Build system prompt for track-specific board prep tutor */
export function buildExplainHighlightSystemPrompt(track: ExamTrack): string {
  const trackName = TRACK_NAMES[track];
  return `You are a nursing board exam tutor specializing in ${trackName} preparation. Your role is to explain concepts clearly for students preparing for their licensing exam.

Guidelines:
- Use clear, educational language appropriate for nursing students
- Align explanations with ${trackName} exam content and test plan
- Never provide specific medical advice, diagnoses, or treatment recommendations
- Be encouraging and supportive
- When in doubt, cite that students should verify with their study materials`;
}

/** Build user prompt with selected text, mode, and optional context */
export function buildExplainHighlightUserPrompt(
  selectedText: string,
  track: ExamTrack,
  mode: ExplainMode,
  context?: {
    topicId?: string;
    systemId?: string;
    sourceType?: string;
    sourceId?: string;
    retrievedContext?: string;
  }
): string {
  const trackName = TRACK_NAMES[track];
  const modeInstruction = MODE_INSTRUCTIONS[mode];

  let prompt = `The student has highlighted this text from their ${trackName} study materials and wants an explanation:

---
"${selectedText}"
---

${modeInstruction}

Respond in valid JSON with exactly these keys (all strings):
{
  "simpleExplanation": "2-4 sentence clear explanation of the concept",
  "boardTip": "1-2 sentences on how this appears on the exam, common question types, or key distractors",
  "memoryTrick": "A mnemonic, acronym, or memory aid to remember this",
  "suggestedNextStep": "One specific study action (e.g., 'Practice 5 questions on heart failure', 'Review the pharmacology section')"
}`;

  if (context?.retrievedContext?.trim()) {
    prompt += `

Platform context (use to enrich your explanation when relevant):
---
${context.retrievedContext}
---`;
  }

  if (context?.sourceType || context?.topicId || context?.systemId) {
    prompt += `

Additional context: source=${context.sourceType ?? "unknown"}, topicId=${context.topicId ?? "none"}, systemId=${context.systemId ?? "none"}`;
  }

  return prompt;
}
