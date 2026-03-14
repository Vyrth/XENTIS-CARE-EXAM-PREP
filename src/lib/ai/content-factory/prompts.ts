/**
 * Jade Tutor Content Factory - prompt builders for each content mode.
 * Uses Jade Tutor persona and track-specific context.
 */

import { appendTrackStrictInstruction } from "../jade-track-context";
import { buildQuestionPrompt as buildTrackQuestionPrompt } from "../prompts/question-prompts";
import {
  buildStudyGuidePrompt as buildFullStudyGuidePrompt,
  buildStudyGuideSectionPackPrompt as buildSectionPackPrompt,
} from "../prompts/study-guide-prompts";
import { buildHighYieldPrompt as buildTrackHighYieldPrompt } from "../prompts/high-yield-prompts";
import type { HighYieldContentType } from "../high-yield-factory/types";
import { buildFlashcardDeckPrompt as buildTrackFlashcardDeckPrompt } from "../prompts/flashcard-prompts";
import type { FlashcardDeckMode } from "../flashcard-factory/types";
import { STYLE_TO_DECK_MODE } from "@/lib/admin/flashcard-mass-production-plan";
import type { FlashcardStyle } from "@/lib/admin/flashcard-mass-production-plan";
import type { QuestionItemType } from "../question-factory/types";
import type { ContentFactoryRequest, ContentMode, ExamTrack } from "./types";

const VALID_QUESTION_ITEM_TYPES: QuestionItemType[] = [
  "single_best_answer",
  "multiple_response",
  "select_n",
  "image_based",
  "chart_table_exhibit",
  "ordered_response",
  "hotspot",
  "case_study",
  "dosage_calc",
];

const TRACK_NAMES: Record<ExamTrack, string> = {
  lvn: "LVN/LPN",
  rn: "RN",
  fnp: "FNP",
  pmhnp: "PMHNP",
};

/** Track-specific quality rules—generator must change tone and emphasis by track */
const TRACK_BEHAVIOR: Record<ExamTrack, string> = {
  rn: "RN (NCLEX): prioritization, patient safety, nursing assessment, early intervention, delegation, medication safety, clinical judgment. Use nursing process (Assessment → Diagnosis → Planning → Implementation → Evaluation).",
  fnp: "FNP (Primary Care): diagnosis, outpatient management, medication selection, screening recommendations, follow-up care, prevention. Flow: symptoms → identify diagnosis → select best management.",
  pmhnp: "PMHNP (Psychiatry): DSM diagnostic distinctions, psychopharmacology, therapy modalities, suicide risk assessment, crisis intervention, substance use disorders. Test: diagnosis, best medication, therapy selection, risk assessment.",
  lvn: "LVN/LPN (Fundamentals): safe scope of practice, fundamentals, medication administration, documentation, patient safety, infection control. Simple language; focus on what LVNs do and do not do.",
};

const JADE_PERSONA = `You are Jade Tutor, an expert nursing board exam content author. You create high-quality, board-focused educational content for nursing licensure preparation. Your outputs are always structured JSON—never freeform text. Be precise, exam-aligned, and track-appropriate.`;

function buildContextBlock(req: ContentFactoryRequest): string {
  const parts: string[] = [
    `Track: ${TRACK_NAMES[req.track]}`,
    req.domain ? `Domain: ${req.domain}` : null,
    req.system ? `System: ${req.system}` : null,
    req.topic ? `Topic: ${req.topic}` : null,
    req.objective ? `Objective: ${req.objective}` : null,
    req.difficulty ? `Difficulty: ${req.difficulty}/5` : null,
    req.itemType ? `Item type: ${req.itemType}` : null,
    req.style?.emphasis ? `Emphasis: ${req.style.emphasis}` : null,
  ].filter((x): x is string => x != null);
  return parts.join("\n");
}

function getSystemBase(req: ContentFactoryRequest, role: string): string {
  const base = `${JADE_PERSONA}

${role}

Guidelines:
- ${TRACK_BEHAVIOR[req.track]}
- Output ONLY valid JSON. No markdown code fences, no preamble.
- Content must be track-specific and board-focused.
- Never provide specific medical advice. Educational exam prep only.`;
  return appendTrackStrictInstruction(base, req.track);
}

/** Question - uses track-specific prompts when itemType is set */
export function buildQuestionPrompt(req: ContentFactoryRequest): { system: string; user: string } {
  const itemType = (req.itemType ?? "single_best_answer").trim() as QuestionItemType;
  if (VALID_QUESTION_ITEM_TYPES.includes(itemType)) {
    return buildTrackQuestionPrompt(req.track, itemType, {
      domain: req.domain,
      system: req.system,
      topic: req.topic,
      objective: req.objective,
      difficulty: req.difficulty,
      diversificationContext: req.diversificationContext,
    });
  }
  const context = buildContextBlock(req);
  const system = getSystemBase(
    req,
    `You generate Single Best Answer (SBA) question drafts for ${TRACK_NAMES[req.track]} board prep.`
  );
  const user = `Generate one SBA question.

Context:
${context}

Respond with ONLY this JSON (no other text):
{"stem":"Clinical scenario and question (2-4 sentences)","leadIn":"Optional","instructions":"Optional","itemType":"single_best_answer","options":[{"key":"A","text":"Option","isCorrect":false,"distractorRationale":"Why wrong"},{"key":"B","text":"Correct","isCorrect":true},{"key":"C","text":"Distractor","isCorrect":false,"distractorRationale":"Why wrong"},{"key":"D","text":"Distractor","isCorrect":false,"distractorRationale":"Why wrong"}],"rationale":"Why correct; why key distractors wrong","difficulty":3,"domain":"—","system":"—","topic":"—","learningObjective":"—","tags":[]}`;
  return { system, user };
}

/** Full study guide - title, description, multiple sections */
export function buildStudyGuideFullPrompt(req: ContentFactoryRequest): { system: string; user: string } {
  return buildFullStudyGuidePrompt(req.track, {
    domain: req.domain,
    system: req.system,
    topic: req.topic,
    objective: req.objective,
    difficulty: req.difficulty,
    boardFocus: req.boardFocus,
  });
}

/** Section pack - multiple sections for adding to existing guide */
export function buildStudyGuideSectionPackPrompt(req: ContentFactoryRequest): { system: string; user: string } {
  return buildSectionPackPrompt(req.track, {
    domain: req.domain,
    system: req.system,
    topic: req.topic,
    objective: req.objective,
    difficulty: req.difficulty,
    boardFocus: req.boardFocus,
    sectionCount: req.sectionCount ?? req.quantity ?? 3,
  });
}

/** Study guide section (legacy - single section) */
export function buildStudyGuideSectionPrompt(req: ContentFactoryRequest): { system: string; user: string } {
  const context = buildContextBlock(req);
  const system = getSystemBase(
    req,
    `You generate study guide section drafts for ${TRACK_NAMES[req.track]} board prep.`
  );
  const mnemonics = req.style?.includeMnemonics !== false ? ', "mnemonics":["Optional mnemonic"]' : "";
  const user = `Generate one study guide section.

Context:
${context}

Respond with ONLY this JSON (no other text):
{"title":"Section title","contentMarkdown":"Full markdown (headers, bullets, tables)","keyTakeaways":["Takeaway 1","Takeaway 2"]${mnemonics}}`;
  return { system, user };
}

const FLASHCARD_STYLES: FlashcardStyle[] = [
  "rapid_recall",
  "definition",
  "clinical_association",
  "medication_mechanism",
  "diagnostic_criteria",
  "treatment_algorithms",
];

/** Flashcard deck with multiple cards */
export function buildFlashcardDeckPrompt(req: ContentFactoryRequest): { system: string; user: string } {
  const style = req.flashcardStyle?.trim() as FlashcardStyle | undefined;
  const modeFromStyle = style && FLASHCARD_STYLES.includes(style) ? STYLE_TO_DECK_MODE[style] : undefined;
  const mode = (modeFromStyle ?? req.flashcardDeckMode ?? "rapid_recall").trim() as FlashcardDeckMode;
  if (["rapid_recall", "high_yield_clinical"].includes(mode)) {
    return buildTrackFlashcardDeckPrompt(req.track, mode, {
      system: req.system,
      topic: req.topic,
      objective: req.objective,
      difficulty: req.difficulty,
      cardCount: req.quantity ?? 8,
      sourceText: req.sourceText,
      flashcardStyle: style,
    });
  }
  const context = buildContextBlock(req);
  const qty = Math.min(Math.max(req.quantity ?? 5, 1), 20);
  const system = getSystemBase(
    req,
    `You generate flashcard deck drafts for ${TRACK_NAMES[req.track]} board prep.`
  );
  const qtyClamped = Math.max(qty, 3);
  const user = `Generate a flashcard deck with exactly ${qtyClamped} cards (minimum 3 required).

Context:
${context}

Respond with ONLY this JSON (no other text):
{"name":"Deck name","description":"Brief description","deckType":"rapid_recall","cards":[{"frontText":"Question or prompt","backText":"Answer","hint":"Optional","memoryTrick":"Optional"},...]}`;
  return { system, user };
}

/** Single flashcard or batch of cards */
export function buildFlashcardCardsPrompt(req: ContentFactoryRequest): { system: string; user: string } {
  const context = buildContextBlock(req);
  const qty = Math.min(Math.max(req.quantity ?? 1, 1), 10);
  const system = getSystemBase(
    req,
    `You generate flashcard drafts for ${TRACK_NAMES[req.track]} board prep.`
  );
  const user = `Generate ${qty} flashcard(s).

Context:
${context}

Respond with ONLY a JSON array (no other text):
[{"frontText":"Question","backText":"Answer","hint":"Optional","memoryTrick":"Optional"},...]`;
  return { system, user };
}

/** High-yield summary */
export function buildHighYieldSummaryPrompt(req: ContentFactoryRequest): { system: string; user: string } {
  return buildTrackHighYieldPrompt(req.track, "high_yield_summary", {
    system: req.system,
    topic: req.topic,
    objective: req.objective,
  });
}

/** Common confusion */
export function buildCommonConfusionPrompt(req: ContentFactoryRequest): { system: string; user: string } {
  return buildTrackHighYieldPrompt(req.track, "common_confusion", {
    system: req.system,
    topic: req.topic,
    objective: req.objective,
  });
}

/** Board trap */
export function buildBoardTrapPrompt(req: ContentFactoryRequest): { system: string; user: string } {
  return buildTrackHighYieldPrompt(req.track, "board_trap", {
    system: req.system,
    topic: req.topic,
    objective: req.objective,
  });
}

/** Compare/contrast */
export function buildCompareContrastPrompt(req: ContentFactoryRequest): { system: string; user: string } {
  return buildTrackHighYieldPrompt(req.track, "compare_contrast_summary", {
    system: req.system,
    topic: req.topic,
    objective: req.objective,
  });
}

/** Get prompt builder for content mode */
export function getPromptForMode(
  req: ContentFactoryRequest
): { system: string; user: string } {
  switch (req.contentMode) {
    case "question":
      return buildQuestionPrompt(req);
    case "study_guide":
      return buildStudyGuideFullPrompt(req);
    case "study_guide_section_pack":
      return buildStudyGuideSectionPackPrompt(req);
    case "study_guide_section":
      return buildStudyGuideSectionPrompt(req);
    case "flashcard_deck":
      return buildFlashcardDeckPrompt(req);
    case "flashcard_cards":
      return buildFlashcardCardsPrompt(req);
    case "high_yield_summary":
      return buildHighYieldSummaryPrompt(req);
    case "common_confusion":
      return buildCommonConfusionPrompt(req);
    case "board_trap":
      return buildBoardTrapPrompt(req);
    case "compare_contrast":
      return buildCompareContrastPrompt(req);
    default:
      throw new Error(`Unknown content mode: ${(req as { contentMode: string }).contentMode}`);
  }
}
