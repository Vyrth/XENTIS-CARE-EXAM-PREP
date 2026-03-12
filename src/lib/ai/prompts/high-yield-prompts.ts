/**
 * Track-specific high-yield content prompt templates.
 * Output includes enum-compatible fields for high_yield_content.
 */

import { appendTrackStrictInstruction } from "../jade-track-context";
import type { ExamTrack, HighYieldContentType } from "../high-yield-factory/types";

const TRACK_NAMES: Record<ExamTrack, string> = {
  lvn: "LVN/LPN",
  rn: "RN",
  fnp: "FNP",
  pmhnp: "PMHNP",
};

const JADE_HIGH_YIELD_PERSONA = `You are Jade Tutor, an expert nursing board exam content author. You create high-yield learning assets for dashboard and weak-area overlays. Output ONLY valid JSON—no markdown fences, no preamble. Use exact enum values: confusion_frequency must be "common", "very_common", or "extremely_common".`;

function buildContextBlock(ctx: {
  track: ExamTrack;
  system?: string;
  topic?: string;
  objective?: string;
}): string {
  const parts: string[] = [
    `Track: ${TRACK_NAMES[ctx.track]}`,
    ctx.system ? `System: ${ctx.system}` : null,
    ctx.topic ? `Topic: ${ctx.topic}` : null,
    ctx.objective ? `Focus: ${ctx.objective}` : null,
  ].filter((x): x is string => x != null);
  return parts.join("\n");
}

const BASE_REQUIRED = `Every item MUST include: title, explanation, whyHighYield, commonConfusion.
Type-specific: highYieldScore (0-100), trapSeverity (1-5), confusionFrequency ("common"|"very_common"|"extremely_common").`;

export function buildHighYieldPrompt(
  track: ExamTrack,
  contentType: HighYieldContentType,
  context: { system?: string; topic?: string; objective?: string }
): { system: string; user: string } {
  const ctxBlock = buildContextBlock({ track, ...context });

  const system = `${JADE_HIGH_YIELD_PERSONA}

You generate ${contentType.replace(/_/g, " ")} content for ${TRACK_NAMES[track]} board prep.

${BASE_REQUIRED}`;

  const sysWithTrack = appendTrackStrictInstruction(system, track);

  const schemas: Record<HighYieldContentType, string> = {
    high_yield_summary: `{
  "title": "Concise title",
  "explanation": "2-4 paragraph explanation",
  "whyHighYield": "Why this is high-yield for the exam",
  "commonConfusion": "Common mistake learners make",
  "highYieldScore": 75,
  "suggestedPracticeLink": null,
  "suggestedGuideLink": null
}`,
    common_confusion: `{
  "title": "Concise title",
  "explanation": "Explanation of both concepts and why they're confused",
  "whyHighYield": "Why distinguishing these matters for the exam",
  "commonConfusion": "What students typically get wrong",
  "conceptA": "First concept",
  "conceptB": "Second concept",
  "keyDifference": "Key distinction",
  "confusionFrequency": "common",
  "highYieldScore": 70,
  "suggestedPracticeLink": null,
  "suggestedGuideLink": null
}`,
    board_trap: `{
  "title": "Concise title",
  "explanation": "What the trap is and how it appears on the exam",
  "trapDescription": "Detailed trap description",
  "correctApproach": "How to avoid it / correct thinking",
  "whyHighYield": "Why this trap is high-yield",
  "commonConfusion": "What confusion the trap exploits",
  "trapSeverity": 3,
  "severity": 3,
  "highYieldScore": 80,
  "suggestedPracticeLink": null,
  "suggestedGuideLink": null
}`,
    compare_contrast_summary: `{
  "title": "Concise title",
  "explanation": "Fuller explanation of both concepts and key difference",
  "whyHighYield": "Why comparing these matters for the exam",
  "commonConfusion": "What students typically mix up",
  "conceptA": "First concept",
  "conceptB": "Second concept",
  "keyDifference": "Key distinction",
  "highYieldScore": 75,
  "suggestedPracticeLink": null,
  "suggestedGuideLink": null
}`,
  };

  const schema = schemas[contentType];
  const user = `Generate one ${contentType.replace(/_/g, " ")} entry.

Context:
${ctxBlock}

Respond with ONLY this JSON (no other text):
${schema}`;

  return { system: sysWithTrack, user };
}
