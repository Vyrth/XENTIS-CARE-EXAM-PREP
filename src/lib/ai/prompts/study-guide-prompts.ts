/**
 * Track-specific study guide prompt templates for AI Content Factory.
 * Board-focused, plain-language, chunk-friendly output.
 */

import { appendTrackStrictInstruction } from "../jade-track-context";
import type { ExamTrack } from "../study-guide-factory/types";

const TRACK_NAMES: Record<ExamTrack, string> = {
  lvn: "LVN/LPN",
  rn: "RN",
  fnp: "FNP",
  pmhnp: "PMHNP",
};

const TRACK_FRAMING: Record<ExamTrack, string> = {
  lvn: "LVN scope: fundamentals, safe direct care, when to report. Simple language. Focus on what LVNs do and do not do.",
  rn: "NCLEX-RN: nursing judgment, safety, prioritization (ABCs, Maslow), delegation, scope. Common NCLEX traps.",
  fnp: "FNP primary care: diagnosis, differentials, first-line management, red flags, when to refer. Outpatient focus.",
  pmhnp: "PMHNP: DSM criteria, psychopharmacology, therapeutic communication, safety (suicide, violence).",
};

const JADE_STUDY_PERSONA = `You are Jade Tutor, an expert nursing board exam content author. You create board-focused study guides in plain language. Output ONLY valid JSON—no markdown fences, no preamble. Each section must be self-contained and chunkable for retrieval.`;

function buildContextBlock(ctx: {
  track: ExamTrack;
  domain?: string;
  system?: string;
  topic?: string;
  objective?: string;
  difficulty?: number;
  boardFocus?: string;
}): string {
  const parts: string[] = [
    `Track: ${TRACK_NAMES[ctx.track]}`,
    ctx.system ? `System: ${ctx.system}` : null,
    ctx.topic ? `Topic: ${ctx.topic}` : null,
    ctx.domain ? `Domain: ${ctx.domain}` : null,
    ctx.objective ? `Focus: ${ctx.objective}` : null,
    ctx.difficulty ? `Difficulty: ${ctx.difficulty}/5` : null,
    ctx.boardFocus ? `Board focus: ${ctx.boardFocus}` : null,
  ].filter((x): x is string => x != null);
  return parts.join("\n");
}

/** Full study guide - title, description, multiple sections */
export function buildStudyGuidePrompt(
  track: ExamTrack,
  context: {
    domain?: string;
    system?: string;
    topic?: string;
    objective?: string;
    difficulty?: number;
    boardFocus?: string;
  }
): { system: string; user: string } {
  const ctxBlock = buildContextBlock({ track, ...context });
  const trackFraming = TRACK_FRAMING[track];

  const system = `${JADE_STUDY_PERSONA}

You generate full study guide drafts for ${TRACK_NAMES[track]} board prep.

Track framing: ${trackFraming}

Rules:
- Output ONLY valid JSON. No other text.
- Use plain language. Avoid jargon unless essential.
- Each section must be self-contained (chunkable for RAG retrieval).
- Every section MUST include: keyTakeaways, commonConfusions, clinicalPearls, quickReviewBullets.
- keyTakeaways: high-yield points examiners test.
- commonConfusions: concepts learners often mix up.
- clinicalPearls: practical clinical insights.
- quickReviewBullets: concise review points.
- Mnemonics when helpful.

Respond with ONLY this JSON structure. Each section MUST include all of: keyTakeaways, commonConfusions, clinicalPearls, quickReviewBullets.
{
  "title": "Guide title",
  "slugSuggestion": "url-friendly-slug",
  "description": "2-3 sentence concise description",
  "boardFocus": "Optional board focus area",
  "sections": [
    {
      "title": "Section title",
      "slug": "section-slug",
      "contentMarkdown": "Full markdown (headers, bullets, tables). Plain language. Self-contained for RAG chunking.",
      "plainExplanation": "Optional 1-2 sentence plain explanation",
      "keyTakeaways": ["High-yield point 1", "High-yield point 2"],
      "commonConfusions": ["Common confusion 1", "Common confusion 2"],
      "clinicalPearls": ["Clinical pearl 1", "Clinical pearl 2"],
      "quickReviewBullets": ["Quick review bullet 1", "Quick review bullet 2"],
      "mnemonics": ["Optional mnemonic"],
      "highYield": true
    }
  ]
}`;

  const sysWithTrack = appendTrackStrictInstruction(system, track);

  const user = `Generate one full study guide (3-6 sections).

Context:
${ctxBlock}

Respond with ONLY the JSON object (no other text).`;

  return { system: sysWithTrack, user };
}

/** Section pack - multiple sections for adding to existing guide */
export function buildStudyGuideSectionPackPrompt(
  track: ExamTrack,
  context: {
    domain?: string;
    system?: string;
    topic?: string;
    objective?: string;
    difficulty?: number;
    boardFocus?: string;
    sectionCount?: number;
  }
): { system: string; user: string } {
  const ctxBlock = buildContextBlock({ track, ...context });
  const trackFraming = TRACK_FRAMING[track];
  const count = Math.min(Math.max(context.sectionCount ?? 3, 2), 8);

  const system = `${JADE_STUDY_PERSONA}

You generate study guide section packs for ${TRACK_NAMES[track]} board prep.

Track framing: ${trackFraming}

Rules:
- Output ONLY valid JSON. No other text.
- Each section is self-contained (chunkable for RAG retrieval).
- Every section MUST include: keyTakeaways, commonConfusions, clinicalPearls, quickReviewBullets.
- Plain language. Board-focused takeaways.

Respond with ONLY this JSON structure. Each section MUST include: keyTakeaways, commonConfusions, clinicalPearls, quickReviewBullets.
{
  "sections": [
    {
      "title": "Section title",
      "slug": "section-slug",
      "contentMarkdown": "Full markdown content. Self-contained for RAG chunking.",
      "plainExplanation": "Optional plain explanation",
      "keyTakeaways": ["High-yield point 1", "High-yield point 2"],
      "commonConfusions": ["Common confusion 1", "Common confusion 2"],
      "clinicalPearls": ["Clinical pearl 1", "Clinical pearl 2"],
      "quickReviewBullets": ["Quick review bullet 1", "Quick review bullet 2"],
      "mnemonics": ["Optional mnemonic"],
      "highYield": true
    }
  ]
}`;

  const sysWithTrack = appendTrackStrictInstruction(system, track);

  const user = `Generate ${count} study guide sections.

Context:
${ctxBlock}

Respond with ONLY the JSON object (no other text).`;

  return { system: sysWithTrack, user };
}
