/**
 * Jade Tutor - Centralized Prompt Building
 *
 * All prompts enforce track isolation. RN ≠ FNP ≠ PMHNP ≠ LVN.
 * Re-exports content-factory prompts and adds tutoring-specific builders.
 */

import { getPromptForMode } from "./content-factory/prompts";
import { appendTrackStrictInstruction } from "./jade-track-context";
import type { ContentFactoryRequest, ContentMode, ExamTrack } from "./content-factory/types";

export { getPromptForMode } from "./content-factory/prompts";
export type { ContentFactoryRequest, ContentMode, ExamTrack } from "./content-factory/types";

const TRACK_NAMES: Record<ExamTrack, string> = {
  lvn: "LVN/LPN",
  rn: "RN",
  fnp: "FNP",
  pmhnp: "PMHNP",
};

/** Track-specific behavior - prompts must not cross scope */
export const TRACK_BEHAVIOR: Record<ExamTrack, string> = {
  rn: "RN (NCLEX): prioritization, patient safety, nursing assessment, early intervention, delegation, medication safety, clinical judgment.",
  fnp: "FNP (Primary Care): diagnosis, outpatient management, medication selection, screening recommendations, follow-up care, prevention.",
  pmhnp: "PMHNP (Psychiatry): DSM diagnostic distinctions, psychopharmacology, therapy modalities, suicide risk assessment, crisis intervention.",
  lvn: "LVN/LPN (Fundamentals): safe scope of practice, fundamentals, medication administration, documentation, patient safety, infection control.",
};

/** Get prompt for content mode (delegates to content-factory) */
export function getPromptForContentMode(req: ContentFactoryRequest): { system: string; user: string } {
  return getPromptForMode(req);
}

/** Build tutoring explanation prompt - track-isolated */
export function buildTutorExplanationPrompt(
  track: ExamTrack,
  options: {
    selectedText: string;
    topicName?: string;
    systemName?: string;
    mode?: "explain_simple" | "board_focus" | "deep_dive" | "mnemonic";
  }
): { system: string; user: string } {
  const trackName = TRACK_NAMES[track];
  const mode = options.mode ?? "explain_simple";

  const modeInstructions: Record<string, string> = {
    explain_simple: "Keep the explanation concise and accessible. Focus on the core concept.",
    board_focus: "Emphasize how this concept appears on the board exam. Include common question patterns and distractors.",
    deep_dive: "Provide a thorough explanation with pathophysiology, clinical relevance, and nursing implications.",
    mnemonic: "Lead with a memorable mnemonic or memory trick. Then briefly explain the concept.",
  };

  const base = `You are a nursing board exam tutor specializing in ${trackName} preparation. Your role is to explain concepts clearly for students preparing for their licensing exam.

Guidelines:
- Use clear, educational language appropriate for nursing students
- Align explanations with ${trackName} exam content and test plan
- Never provide specific medical advice, diagnoses, or treatment recommendations
- Be encouraging and supportive`;

  const system = appendTrackStrictInstruction(base, track);

  const contextParts: string[] = [];
  if (options.topicName) contextParts.push(`Topic: ${options.topicName}`);
  if (options.systemName) contextParts.push(`System: ${options.systemName}`);

  const user = `The student has highlighted this text from their ${trackName} study materials and wants an explanation:

---
"${options.selectedText}"
---

${modeInstructions[mode] ?? modeInstructions.explain_simple}
${contextParts.length > 0 ? `\nContext:\n${contextParts.join("\n")}` : ""}

Respond in valid JSON with exactly these keys (all strings):
{
  "simpleExplanation": "2-4 sentence clear explanation of the concept",
  "boardTip": "1-2 sentences on how this appears on the exam, common question types, or key distractors",
  "memoryTrick": "A mnemonic, acronym, or memory aid to remember this",
  "suggestedNextStep": "One specific study action"
}`;

  return { system, user };
}
