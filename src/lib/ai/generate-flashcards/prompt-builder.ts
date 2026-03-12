/**
 * Prompt builder for Generate Flashcards - track-specific, mode-aware.
 * Supports adaptive context for readiness-aware flashcards.
 */

import type { AdaptiveContextOutput } from "@/lib/readiness/adaptive-context";
import {
  injectAdaptiveSystemPrompt,
  injectAdaptiveUserContext,
} from "@/lib/ai/adaptive";
import { appendTrackStrictInstruction } from "@/lib/ai/jade-track-context";
import type { ExamTrack, FlashcardMode } from "./types";

const TRACK_NAMES: Record<ExamTrack, string> = {
  lvn: "LVN/LPN",
  rn: "RN",
  fnp: "FNP",
  pmhnp: "PMHNP",
};

const TRACK_BEHAVIOR: Record<ExamTrack, string> = {
  lvn:
    "Focus on foundational nursing concepts, safety, and basic skills. Keep cards simple.",
  rn:
    "Prioritize safety, delegation, priorities, scope of practice, and common board traps.",
  fnp:
    "Focus on diagnosis, management, red flags, first-line treatments, and differentials.",
  pmhnp:
    "Emphasize DSM distinctions, psychopharmacology, safety, therapeutic communication.",
};

const MODE_INSTRUCTIONS: Record<FlashcardMode, string> = {
  standard:
    "Create balanced flashcards covering key concepts. Mix definition, application, and recall.",
  high_yield:
    "Focus only on high-yield facts that commonly appear on board exams. Prioritize what students must know.",
  rapid_recall:
    "Create short, punchy cards optimized for quick review. One fact per card. Minimal text.",
  compare_contrast:
    "Create cards that contrast similar concepts (e.g., Type 1 vs Type 2 DM, LVN vs RN scope). Include at least 2-3 compare/contrast cards.",
  pharm_focus:
    "Focus on pharmacology: drug classes, indications, contraindications, key side effects, nursing considerations.",
};

/** Build system prompt for track-specific flashcard generation */
export function buildFlashcardSystemPrompt(
  track: ExamTrack,
  adaptive?: AdaptiveContextOutput | null
): string {
  const trackName = TRACK_NAMES[track];
  const behavior = TRACK_BEHAVIOR[track];
  const base = `You are a nursing board exam tutor specializing in ${trackName} preparation. Your role is to generate high-quality, board-focused flashcards from study content.

Guidelines:
- ${behavior}
- One fact or one distinction per card. Avoid vague or multi-part cards.
- Front: concise question or prompt. Back: clear, accurate answer.
- Include compare/contrast cards when the content has similar concepts to distinguish.
- Never provide specific medical advice, diagnoses, or treatment recommendations.
- Cards must be accurate and aligned with exam content.`;
  const withAdaptive = injectAdaptiveSystemPrompt(base, adaptive ?? null);
  return appendTrackStrictInstruction(withAdaptive, track);
}

/** Build user prompt with source text, mode, and optional context */
export function buildFlashcardUserPrompt(
  sourceText: string,
  track: ExamTrack,
  mode: FlashcardMode,
  count: number,
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

  let prompt = `Generate ${count} flashcards for ${trackName} exam prep from this content. ${modeInstruction}

---
"${sourceText}"
---

Respond with a valid JSON array. Each object must have:
- front_text: string (concise question or prompt)
- back_text: string (clear answer)
- hint_text: string (optional, brief hint for recall)
- memory_trick: string (optional, mnemonic or memory aid when helpful)
- difficulty_level: "easy" | "medium" | "hard" (optional)

Example format:
[
  {"front_text": "What does MONA stand for in MI management?", "back_text": "Morphine, Oxygen, Nitroglycerin, Aspirin", "hint_text": "First-line MI drugs", "memory_trick": "My Old Nurse Always", "difficulty_level": "medium"},
  {"front_text": "Nitroglycerin is contraindicated in which type of MI?", "back_text": "Right-sided (inferior) MI - risk of profound hypotension", "difficulty_level": "hard"}
]

Rules: One fact per card. No vague cards. Include compare/contrast when content warrants it.`;

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
