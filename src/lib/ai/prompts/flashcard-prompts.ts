/**
 * Track-specific flashcard prompt templates for AI Content Factory.
 * Modes: rapid_recall (facts, terms) and high_yield_clinical (clinical associations).
 * Styles: rapid_recall, definition, clinical_association, medication_mechanism,
 *         diagnostic_criteria, treatment_algorithms
 */

import { appendTrackStrictInstruction } from "../jade-track-context";
import type { ExamTrack, FlashcardDeckMode } from "../flashcard-factory/types";
import {
  FLASHCARD_STYLE_EMPHASIS,
  STYLE_TO_DECK_MODE,
  type FlashcardStyle,
} from "@/lib/admin/flashcard-mass-production-plan";

const TRACK_NAMES: Record<ExamTrack, string> = {
  lvn: "LVN/LPN",
  rn: "RN",
  fnp: "FNP",
  pmhnp: "PMHNP",
};

const TRACK_FRAMING: Record<ExamTrack, string> = {
  lvn: "LVN scope: fundamentals, safe direct care, when to report. Simple language.",
  rn: "NCLEX-RN: safety, prioritization, delegation, scope. Common NCLEX traps.",
  fnp: "FNP primary care: diagnosis, management, red flags, when to refer.",
  pmhnp: "PMHNP: DSM, psychopharmacology, therapeutic communication, safety.",
};

const MODE_GUIDANCE: Record<FlashcardDeckMode, string> = {
  rapid_recall:
    "Rapid recall: terminology, definitions, key facts, normal ranges, classifications. Front = question/term, back = concise answer. Optimize for quick memorization.",
  high_yield_clinical:
    "High-yield clinical: 'What would you do?', 'What is the priority?', 'What finding requires action?', clinical associations, board-style scenarios. Front = scenario or question, back = correct approach with rationale.",
};

const JADE_FLASHCARD_PERSONA = `You are Jade Tutor, an expert nursing board exam content author. You create board-focused flashcard drafts. Output ONLY valid JSON—no markdown fences, no preamble.`;

function buildContextBlock(ctx: {
  track: ExamTrack;
  system?: string;
  topic?: string;
  subtopic?: string;
  objective?: string;
  difficulty?: number;
  sourceText?: string;
}): string {
  const parts: string[] = [
    `Track: ${TRACK_NAMES[ctx.track]}`,
    ctx.system ? `System: ${ctx.system}` : null,
    ctx.topic ? `Topic: ${ctx.topic}` : null,
    ctx.subtopic ? `Subtopic: ${ctx.subtopic}` : null,
    ctx.objective ? `Focus: ${ctx.objective}` : null,
    ctx.difficulty ? `Difficulty: ${ctx.difficulty}/5` : null,
  ].filter((x): x is string => x != null);
  return parts.join("\n");
}

export function buildFlashcardDeckPrompt(
  track: ExamTrack,
  mode: FlashcardDeckMode,
  context: {
    system?: string;
    topic?: string;
    subtopic?: string;
    objective?: string;
    difficulty?: number;
    cardCount?: number;
    sourceText?: string;
    /** Style-specific emphasis (e.g., definition, medication_mechanism) */
    flashcardStyle?: FlashcardStyle;
  }
): { system: string; user: string } {
  const ctxBlock = buildContextBlock({ track, ...context });
  const trackFraming = TRACK_FRAMING[track];
  const style = context.flashcardStyle ?? "rapid_recall";
  const styleEmphasis = FLASHCARD_STYLE_EMPHASIS[style];
  const modeGuidance = styleEmphasis ?? MODE_GUIDANCE[mode];
  const count = Math.min(Math.max(context.cardCount ?? 8, 3), 25);

  const system = `${JADE_FLASHCARD_PERSONA}

You generate ${mode.replace(/_/g, " ")} flashcard deck drafts for ${TRACK_NAMES[track]} board prep.

Mode: ${modeGuidance}

Track framing: ${trackFraming}

Rules:
- Output ONLY valid JSON. No other text.
- You MUST generate at least 3 cards (minimum required). Generate ${count} cards.
- Each card: frontText (question/term/scenario), backText (answer), hint (optional), memoryTrick (optional).
- Cards must be board-relevant and track-appropriate.`;

  const sysWithTrack = appendTrackStrictInstruction(system, track);

  const schema = `{
  "name": "Deck name",
  "description": "Brief description",
  "deckType": "${mode}",
  "difficulty": "medium",
  "cards": [
    {"frontText": "Question or term", "backText": "Answer", "hint": "Optional", "memoryTrick": "Optional"},
    {"frontText": "Question", "backText": "Answer", "hint": null, "memoryTrick": null}
  ]
}`;

  const sourceBlock = context.sourceText?.trim()
    ? `

Use the following study guide content as your primary source. Extract key concepts and create flashcards from it. Do not invent content that contradicts the source.

--- STUDY GUIDE CONTENT ---
${context.sourceText.slice(0, 8000)}
--- END ---`
    : "";

  const user = `Generate a ${mode.replace(/_/g, " ")} flashcard deck with exactly ${count} cards (minimum 3 required).

Context:
${ctxBlock}
${sourceBlock}

Respond with ONLY this JSON (no other text):
${schema}`;

  return { system: sysWithTrack, user };
}
