/**
 * Prompt builder for Mnemonic Generator - track-specific, style-aware.
 * Structures output for parsing into MnemonicResponse.
 * Supports adaptive context for readiness-aware mnemonics.
 */

import type { AdaptiveContextOutput } from "@/lib/readiness/adaptive-context";
import {
  injectAdaptiveSystemPrompt,
  injectAdaptiveUserContext,
} from "@/lib/ai/adaptive";
import { appendTrackStrictInstruction } from "@/lib/ai/jade-track-context";
import type { ExamTrack, MnemonicStyle } from "./types";

const TRACK_NAMES: Record<ExamTrack, string> = {
  lvn: "LVN/LPN",
  rn: "RN",
  fnp: "FNP",
  pmhnp: "PMHNP",
};

const TRACK_BEHAVIOR: Record<ExamTrack, string> = {
  lvn:
    "Keep mnemonics very simple and foundational. Focus on basic nursing concepts, safety, and fundamental skills.",
  rn:
    "Prioritize safety, priorities (ABCs, Maslow), delegation, scope of practice, and common board traps. Emphasize what RNs must know vs delegate.",
  fnp:
    "Focus on diagnosis, management, red flags, first-line thinking, and differentials. Emphasize clinical decision-making and when to refer.",
  pmhnp:
    "Emphasize DSM-style distinctions, psychopharmacology, safety (suicide, violence), therapeutic communication, and psychiatric emergencies.",
};

const STYLE_INSTRUCTIONS: Record<MnemonicStyle, string> = {
  acronym:
    "Create an acronym where each letter stands for a key term (e.g., MONA for MI drugs). List what each letter means.",
  phrase:
    "Create a short, catchy phrase, rhyme, or saying that encodes the key facts. Make it easy to recall under exam pressure.",
  story:
    "Create a brief narrative or scenario that encodes the key facts. The story should be memorable and easy to retell.",
  visual_hook:
    "Describe a vivid mental image the student can picture to recall the concept. Be specific and sensory.",
  compare_contrast:
    "Create a memory cue that contrasts this concept with a similar one to avoid confusion. Highlight key distinctions.",
};

const DEFAULT_STYLE: MnemonicStyle = "phrase";

/** Build system prompt for track-specific mnemonic tutor */
export function buildMnemonicSystemPrompt(
  track: ExamTrack,
  adaptive?: AdaptiveContextOutput | null
): string {
  const trackName = TRACK_NAMES[track];
  const behavior = TRACK_BEHAVIOR[track];
  const base = `You are a nursing board exam tutor specializing in ${trackName} preparation. Your role is to create simple, memorable mnemonics that help students retain difficult board-focused concepts.

Guidelines:
- ${behavior}
- Keep responses simple and memorable
- Use clear, educational language appropriate for nursing students
- Never provide specific medical advice, diagnoses, or treatment recommendations
- Mnemonics must be accurate and aligned with exam content
- Rapid recall version should be 1-2 short phrases for last-minute review`;
  const withAdaptive = injectAdaptiveSystemPrompt(base, adaptive ?? null);
  return appendTrackStrictInstruction(withAdaptive, track);
}

/** Build user prompt with selected text, style, and optional context */
export function buildMnemonicUserPrompt(
  selectedText: string,
  track: ExamTrack,
  style: MnemonicStyle,
  context?: {
    conceptTitle?: string;
    topicId?: string;
    systemId?: string;
    sourceType?: string;
    sourceId?: string;
    retrievedContext?: string;
    adaptiveContext?: AdaptiveContextOutput | null;
  }
): string {
  const trackName = TRACK_NAMES[track];
  const styleInstruction = STYLE_INSTRUCTIONS[style];

  let prompt = `The student wants a ${style} mnemonic for this concept from their ${trackName} study materials:

---
"${selectedText}"
---`;

  if (context?.conceptTitle?.trim()) {
    prompt += `

Concept title: ${context.conceptTitle}`;
  }

  prompt += `

${styleInstruction}

Respond in valid JSON with exactly these keys (all strings):
{
  "conceptSummary": "2-3 sentence summary of the concept",
  "mnemonic": "The mnemonic itself (acronym with expansion, phrase, story summary, visual description, or compare/contrast cue)",
  "whyItWorks": "1-2 sentences on why this mnemonic helps memory",
  "rapidRecallVersion": "1-2 short phrases for last-minute exam review",
  "boardTip": "1-2 sentences on how this appears on the exam, common question types, or key distractors"
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
