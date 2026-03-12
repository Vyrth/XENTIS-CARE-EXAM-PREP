/**
 * Prompt builder for Notebook Summary - track-specific, mode-aware.
 * Supports adaptive context for readiness-aware summaries.
 */

import type { AdaptiveContextOutput } from "@/lib/readiness/adaptive-context";
import {
  injectAdaptiveSystemPrompt,
  injectAdaptiveUserContext,
} from "@/lib/ai/adaptive";
import { appendTrackStrictInstruction } from "@/lib/ai/jade-track-context";
import type { ExamTrack, SummaryMode } from "./types";

const TRACK_NAMES: Record<ExamTrack, string> = {
  lvn: "LVN/LPN",
  rn: "RN",
  fnp: "FNP",
  pmhnp: "PMHNP",
};

const TRACK_BEHAVIOR: Record<ExamTrack, string> = {
  lvn:
    "Keep summaries very simple and foundational. Focus on basic nursing concepts and safety.",
  rn:
    "Prioritize safety, priorities, delegation, scope of practice, and common board traps.",
  fnp:
    "Focus on diagnosis, management, red flags, first-line thinking, and differentials.",
  pmhnp:
    "Emphasize DSM distinctions, psychopharmacology, safety, and therapeutic communication.",
};

const MODE_INSTRUCTIONS: Record<SummaryMode, string> = {
  clean_summary:
    "Clean up the messy notes into a clear, organized summary. Preserve key facts while improving clarity and structure.",
  high_yield:
    "Extract and emphasize high-yield facts that commonly appear on board exams. Prioritize what students must know.",
  study_outline:
    "Convert the content into a structured study outline with headings and bullet points for easy review.",
  plain_language:
    "Rewrite in plain, accessible language. Simplify jargon while keeping accuracy. Make it easy to understand.",
  board_focus:
    "Focus on how this content appears on the exam. Highlight common question types, distractors, and board traps.",
};

/** Build system prompt for track-specific notebook summarizer */
export function buildNotebookSummarySystemPrompt(
  track: ExamTrack,
  adaptive?: AdaptiveContextOutput | null
): string {
  const trackName = TRACK_NAMES[track];
  const behavior = TRACK_BEHAVIOR[track];
  const base = `You are a nursing board exam tutor specializing in ${trackName} preparation. Your role is to convert messy notes or study content into clean, board-focused summaries.

Guidelines:
- ${behavior}
- Keep responses simple and memorable
- Use clear, educational language
- Never provide specific medical advice, diagnoses, or treatment recommendations
- Output must be easy to save as study notes
- Mnemonic suggestion is optional - only include if a strong memory aid fits the content`;
  const withAdaptive = injectAdaptiveSystemPrompt(base, adaptive ?? null);
  return appendTrackStrictInstruction(withAdaptive, track);
}

/** Build user prompt with note text, mode, and optional context */
export function buildNotebookSummaryUserPrompt(
  noteText: string,
  track: ExamTrack,
  mode: SummaryMode,
  context?: {
    topicId?: string;
    systemId?: string;
    sourceType?: string;
    sourceId?: string;
    retrievedContext?: string;
    adaptiveContext?: AdaptiveContextOutput | null;
  }
): string {
  const trackName = TRACK_NAMES[track];
  const modeInstruction = MODE_INSTRUCTIONS[mode];

  let prompt = `The student has notes or study content they want summarized for ${trackName} exam prep. ${modeInstruction}

---
"${noteText}"
---

Respond in valid JSON with exactly these keys (all strings):
{
  "cleanedSummary": "The main cleaned/organized summary (2-5 sentences or bullet points)",
  "keyTakeaways": "3-5 bullet points of the most important takeaways",
  "highYieldFacts": "2-4 high-yield facts that commonly appear on board exams",
  "commonConfusion": "1-2 sentences on common confusion points or distractors to avoid",
  "boardTip": "1-2 sentences on how this appears on the exam, question types, or key traps",
  "mnemonicSuggestion": "Optional: a brief mnemonic or memory aid if one fits well, or empty string if not"
}`;

  if (context?.retrievedContext?.trim()) {
    prompt += `

Platform context (use to enrich when relevant):
---
${context.retrievedContext}
---`;
  }

  if (context?.sourceType || context?.topicId || context?.systemId) {
    prompt += `

Additional context: source=${context.sourceType ?? "unknown"}, topicId=${context.topicId ?? "none"}, systemId=${context.systemId ?? "none"}`;
  }

  return injectAdaptiveUserContext(prompt, context?.adaptiveContext ?? null, {
    position: "before",
  });
}
