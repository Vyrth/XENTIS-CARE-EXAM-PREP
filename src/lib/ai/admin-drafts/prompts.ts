/**
 * Track-specific prompt builders for admin AI draft generation.
 */

import { appendTrackStrictInstruction } from "../jade-track-context";
import type { ExamTrack, AdminDraftParams } from "./types";

const TRACK_NAMES: Record<ExamTrack, string> = {
  lvn: "LVN/LPN",
  rn: "RN",
  fnp: "FNP",
  pmhnp: "PMHNP",
};

const TRACK_BEHAVIOR: Record<ExamTrack, string> = {
  lvn: "Focus on foundational nursing concepts, safety, and basic skills. Keep questions simple and scope-appropriate.",
  rn: "Prioritize safety, delegation, priorities (ABCs, Maslow), scope of practice, and common NCLEX traps.",
  fnp: "Focus on diagnosis, management, red flags, first-line treatments, differentials, and when to refer.",
  pmhnp: "Emphasize DSM distinctions, psychopharmacology, safety (suicide, violence), therapeutic communication.",
};

function buildContextBlock(params: AdminDraftParams): string {
  const parts: string[] = [
    `Track: ${TRACK_NAMES[params.track]}`,
    params.systemName ? `System: ${params.systemName}` : null,
    params.topicName ? `Topic: ${params.topicName}` : null,
    params.objective ? `Learning objective: ${params.objective}` : null,
    params.targetDifficulty ? `Target difficulty: ${params.targetDifficulty}/5` : null,
    params.itemType ? `Item type: ${params.itemType}` : null,
  ].filter((x): x is string => x != null);
  return parts.join("\n");
}

/** Question draft - full SBA question */
export function buildQuestionDraftPrompt(params: AdminDraftParams): { system: string; user: string } {
  const context = buildContextBlock(params);
  const system = `You are a nursing board exam content author specializing in ${TRACK_NAMES[params.track]} preparation. Generate a high-quality Single Best Answer question draft.

Guidelines:
- ${TRACK_BEHAVIOR[params.track]}
- Stem: clear clinical scenario, one focused question. Avoid vague or multi-part stems.
- Options: 4 plausible options, one clearly correct, distractors that reflect common errors.
- Rationale: explain why correct answer is right and why key distractors are wrong.
- Never provide specific medical advice. Content must be accurate and exam-aligned.
- Output valid JSON only.`;
  const user = `Generate a board-style SBA question draft.

Context:
${context}

Respond with a valid JSON object:
{
  "stem": "Clinical scenario and question (2-4 sentences)",
  "leadIn": "Optional scenario intro",
  "instructions": "Optional (e.g. 'Select the best answer')",
  "options": [
    {"key": "A", "text": "Option text", "isCorrect": false, "distractorRationale": "Why this is wrong"},
    {"key": "B", "text": "Correct option", "isCorrect": true},
    {"key": "C", "text": "Distractor", "isCorrect": false, "distractorRationale": "Why wrong"},
    {"key": "D", "text": "Distractor", "isCorrect": false, "distractorRationale": "Why wrong"}
  ],
  "rationale": "Why B is correct; why key distractors are wrong"
}`;
  return {
    system: appendTrackStrictInstruction(system, params.track),
    user,
  };
}

/** Distractor rationale - for one wrong option */
export function buildDistractorRationalePrompt(
  params: AdminDraftParams,
  optionText: string,
  correctOptionText: string,
  stem: string
): { system: string; user: string } {
  const context = buildContextBlock(params);
  const system = `You are a nursing board exam content author. Generate a brief distractor rationale explaining why a wrong option is incorrect.

Guidelines:
- ${TRACK_BEHAVIOR[params.track]}
- 1-3 sentences. Explain the misconception or why this choice is wrong.
- Educational, not punitive. Help learners understand the error.
- Output valid JSON only.`;
  const user = `Generate a distractor rationale.

Context:
${context}

Question stem: ${stem}
Correct answer: ${correctOptionText}
Wrong option (needs rationale): ${optionText}

Respond with valid JSON:
{"distractorRationale": "1-3 sentences explaining why this option is wrong"}`;
  return {
    system: appendTrackStrictInstruction(system, params.track),
    user,
  };
}

/** Study guide section */
export function buildStudySectionPrompt(params: AdminDraftParams): { system: string; user: string } {
  const context = buildContextBlock(params);
  const system = `You are a nursing board exam study guide author for ${TRACK_NAMES[params.track]}. Generate a study section draft.

Guidelines:
- ${TRACK_BEHAVIOR[params.track]}
- Clear, educational markdown. Use headers, bullets, tables when helpful.
- Include key takeaways and mnemonics when appropriate.
- Board-focused: what students need to know for the exam.
- Output valid JSON only.`;
  const user = `Generate a study guide section draft.

Context:
${context}

Respond with valid JSON:
{
  "title": "Section title",
  "contentMarkdown": "Full markdown content (headers, bullets, tables)",
  "keyTakeaways": ["Takeaway 1", "Takeaway 2"],
  "mnemonics": ["Optional mnemonic if helpful"]
}`;
  return {
    system: appendTrackStrictInstruction(system, params.track),
    user,
  };
}

/** Flashcard draft */
export function buildFlashcardDraftPrompt(params: AdminDraftParams): { system: string; user: string } {
  const context = buildContextBlock(params);
  const system = `You are a nursing board exam flashcard author for ${TRACK_NAMES[params.track]}. Generate one high-quality flashcard draft.

Guidelines:
- ${TRACK_BEHAVIOR[params.track]}
- One fact per card. Front: concise question or prompt. Back: clear answer.
- Include hint and memory trick when helpful.
- Output valid JSON only.`;
  const user = `Generate one flashcard draft.

Context:
${context}

Respond with valid JSON:
{
  "frontText": "Concise question or prompt",
  "backText": "Clear answer",
  "hint": "Optional brief hint",
  "memoryTrick": "Optional mnemonic"
}`;
  return {
    system: appendTrackStrictInstruction(system, params.track),
    user,
  };
}

/** Mnemonic draft */
export function buildMnemonicDraftPrompt(
  params: AdminDraftParams,
  conceptOrText: string
): { system: string; user: string } {
  const context = buildContextBlock(params);
  const system = `You are a nursing board exam tutor for ${TRACK_NAMES[params.track]}. Generate a mnemonic to help students remember a concept.

Guidelines:
- ${TRACK_BEHAVIOR[params.track]}
- Memorable phrase, acronym, or visual hook.
- Include why it works and a board tip.
- Output valid JSON only.`;
  const user = `Generate a mnemonic for this concept.

Context:
${context}

Concept: ${conceptOrText}

Respond with valid JSON:
{
  "conceptSummary": "2-3 sentence summary",
  "mnemonic": "The mnemonic (phrase, acronym, or visual)",
  "whyItWorks": "Why this helps memory",
  "rapidRecallVersion": "1-2 phrases for last-minute review",
  "boardTip": "How this appears on the exam"
}`;
  return {
    system: appendTrackStrictInstruction(system, params.track),
    user,
  };
}

/** High-yield summary draft */
export function buildHighYieldSummaryPrompt(params: AdminDraftParams): { system: string; user: string } {
  const context = buildContextBlock(params);
  const system = `You are a nursing board exam content author for ${TRACK_NAMES[params.track]}. Generate a high-yield summary draft.

Guidelines:
- ${TRACK_BEHAVIOR[params.track]}
- Concise, exam-focused. What students must know.
- Include why it's high-yield and common confusions.
- Output valid JSON only.`;
  const user = `Generate a high-yield summary draft.

Context:
${context}

Respond with valid JSON:
{
  "title": "Concise title",
  "explanation": "2-4 paragraph explanation",
  "whyHighYield": "Why this is high-yield for the exam",
  "commonConfusion": "Common mistake or confusion to avoid"
}`;
  return {
    system: appendTrackStrictInstruction(system, params.track),
    user,
  };
}
