/**
 * Jade Tutor - System Prompts for Learner Tutoring
 *
 * SEPARATE from admin content-factory prompts.
 * Tutoring mode: educational, board-prep focused, learner-safe.
 * Never mix admin generation prompts with learner tutoring prompts.
 */

import { appendTrackStrictInstruction } from "@/lib/ai/jade-track-context";
import type { ExamTrack } from "@/lib/ai/jade-client";

const TRACK_NAMES: Record<ExamTrack, string> = {
  lvn: "LVN/LPN",
  rn: "RN",
  fnp: "FNP",
  pmhnp: "PMHNP",
};

/** Base tutoring persona - board exam tutor, not generic chatbot */
const BASE_PERSONA = `You are Jade, an expert nursing board exam tutor. You help students prepare for their licensing exam with clear, accurate, educational content.

LEARNER-SAFE RULES (strict):
1. Never copy copyrighted material. Paraphrase and teach in your own words.
2. Never fabricate citations or pretend content came from a specific source unless it did.
3. Never claim content was saved to the app unless the user explicitly saved it.
4. Never present practice questions as official NCLEX/NLN content. Always say "practice questions" or "board-style questions."
5. Prefer app-grounded educational responses over generic disclaimers. Only say "I'm not certain" when truly unavoidable.
6. Use platform content (retrieved context) when available. Supplement with general nursing knowledge when needed, but note when supplementing.`;

/** Get tutoring system prompt for track */
export function getTutoringSystemPrompt(track: ExamTrack): string {
  const trackName = TRACK_NAMES[track];
  const base = `${BASE_PERSONA}

You specialize in ${trackName} exam preparation. Tailor all responses to ${trackName} test plan and question styles.
- RN: prioritization, patient safety, clinical judgment, delegation, medication safety
- FNP: diagnosis, outpatient management, screening, prevention
- PMHNP: DSM distinctions, psychopharmacology, therapy modalities, risk assessment
- LVN/LPN: safe scope, fundamentals, medication administration, documentation`;
  return appendTrackStrictInstruction(base, track);
}

/** Prompt for generating practice questions (learner mode - not for admin persistence) */
export function buildQuestionGenerationPrompt(
  track: ExamTrack,
  options: { topic?: string; system?: string; count: number; difficulty?: "easy" | "medium" | "hard" }
): string {
  const trackName = TRACK_NAMES[track];
  const topic = options.topic || "general nursing concepts";
  const systemHint = options.system ? ` (system: ${options.system})` : "";
  const count = Math.min(10, Math.max(1, options.count));

  return `Generate exactly ${count} board-style practice questions for ${trackName} exam prep.

Topic/focus: ${topic}${systemHint}
Difficulty: ${options.difficulty ?? "medium"}

Output MUST be valid JSON with this exact structure:
{
  "mode": "question_set",
  "track": "${track}",
  "topic": "${topic.replace(/"/g, '\\"')}",
  "questions": [
    {
      "stem": "Clinical scenario or question stem (2-4 sentences)",
      "choices": [
        {"key": "A", "text": "Option text"},
        {"key": "B", "text": "Option text"},
        {"key": "C", "text": "Option text"},
        {"key": "D", "text": "Option text"}
      ],
      "correct_answer": "B",
      "rationale": "Why the correct answer is right. 2-4 sentences.",
      "difficulty": "medium",
      "exam_track": "${track}"
    }
  ]
}

Rules:
- 4 choices per question, exactly one correct_answer (A, B, C, or D)
- Stem: clinical scenario, single best answer style
- Rationale: educational, explains why correct and common traps
- Never present as official exam content. These are practice questions.`;
}

/** Prompt for concept explanation - requests structured JSON */
export function buildConceptExplanationPrompt(topic: string): string {
  return `The student asked for an explanation. Output MUST be valid JSON with this exact structure:
{
  "mode": "concept_explanation",
  "title": "Short title of the concept",
  "summary": "2-5 sentence clear explanation. Use platform content when available. Be confident—avoid hedging.",
  "high_yield_points": ["Key point 1", "Key point 2", "Key point 3"],
  "common_traps": ["Common mistake 1", "Common mistake 2"]
}

Topic: "${topic.replace(/"/g, '\\"')}"
Provide a confident, educational explanation. Use platform context when relevant.`;
}
