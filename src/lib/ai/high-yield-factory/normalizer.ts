/**
 * High-Yield Factory - enum-safe normalizer for AI output.
 * Ensures AI output maps to valid high_yield_content enum values.
 */

import type {
  HighYieldContentType,
  ConfusionFrequency,
  HighYieldSummaryPayload,
  CommonConfusionPayload,
  BoardTrapPayload,
  CompareContrastPayload,
} from "./types";
import { VALID_CONTENT_TYPES, VALID_CONFUSION_FREQUENCIES } from "./types";

/** Normalize content_type - AI may emit variations */
export function normalizeContentType(raw: unknown): HighYieldContentType {
  const s = String(raw ?? "").trim().toLowerCase().replace(/\s+/g, "_");
  const map: Record<string, HighYieldContentType> = {
    high_yield_summary: "high_yield_summary",
    "high-yield_summary": "high_yield_summary",
    highyield_summary: "high_yield_summary",
    common_confusion: "common_confusion",
    "common-confusion": "common_confusion",
    board_trap: "board_trap",
    "board-trap": "board_trap",
    compare_contrast_summary: "compare_contrast_summary",
    compare_contrast: "compare_contrast_summary",
    "compare-contrast_summary": "compare_contrast_summary",
  };
  return map[s] ?? (VALID_CONTENT_TYPES.includes(s as HighYieldContentType) ? (s as HighYieldContentType) : "high_yield_summary");
}

/** Normalize confusion_frequency - AI may emit variations */
export function normalizeConfusionFrequency(raw: unknown): ConfusionFrequency | null {
  const s = String(raw ?? "").trim().toLowerCase().replace(/\s+/g, "_");
  const map: Record<string, ConfusionFrequency> = {
    common: "common",
    very_common: "very_common",
    "very-common": "very_common",
    extremely_common: "extremely_common",
    "extremely-common": "extremely_common",
  };
  const out = map[s] ?? (VALID_CONFUSION_FREQUENCIES.includes(s as ConfusionFrequency) ? (s as ConfusionFrequency) : null);
  return out;
}

/** Clamp high_yield_score 0-100 */
export function normalizeHighYieldScore(raw: unknown): number | null {
  const n = Number(raw);
  if (Number.isNaN(n)) return null;
  const clamped = Math.min(100, Math.max(0, Math.round(n)));
  return clamped;
}

/** Clamp trap_severity 1-5 */
export function normalizeTrapSeverity(raw: unknown): number | null {
  const n = Number(raw);
  if (Number.isNaN(n)) return null;
  const clamped = Math.min(5, Math.max(1, Math.round(n)));
  return clamped;
}

/** Placeholder for suggested links - AI may emit empty or invalid */
export function normalizeSuggestedLink(raw: unknown): string | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  if (s === "placeholder" || s === "—" || s === "TBD" || s.toLowerCase() === "null") return null;
  return s.slice(0, 512);
}

/** Normalize high_yield_summary payload */
export function normalizeHighYieldSummary(d: Record<string, unknown>): HighYieldSummaryPayload {
  return {
    title: String(d.title ?? "").trim(),
    explanation: String(d.explanation ?? "").trim(),
    whyHighYield: d.whyHighYield ? String(d.whyHighYield).trim() : undefined,
    commonConfusion: d.commonConfusion ? String(d.commonConfusion).trim() : undefined,
    suggestedPracticeLink: normalizeSuggestedLink(d.suggestedPracticeLink ?? d.suggested_practice_link) ?? undefined,
    suggestedGuideLink: normalizeSuggestedLink(d.suggestedGuideLink ?? d.suggested_guide_link) ?? undefined,
    highYieldScore: normalizeHighYieldScore(d.highYieldScore ?? d.high_yield_score) ?? undefined,
  };
}

/** Normalize common_confusion payload */
export function normalizeCommonConfusion(d: Record<string, unknown>): CommonConfusionPayload {
  const freq = normalizeConfusionFrequency(d.confusionFrequency ?? d.confusion_frequency);
  return {
    title: String(d.title ?? "").trim(),
    explanation: String(d.explanation ?? "").trim(),
    conceptA: d.conceptA ? String(d.conceptA).trim() : undefined,
    conceptB: d.conceptB ? String(d.conceptB).trim() : undefined,
    keyDifference: d.keyDifference ? String(d.keyDifference).trim() : undefined,
    commonConfusion: d.commonConfusion ? String(d.commonConfusion).trim() : undefined,
    suggestedPracticeLink: normalizeSuggestedLink(d.suggestedPracticeLink ?? d.suggested_practice_link) ?? undefined,
    suggestedGuideLink: normalizeSuggestedLink(d.suggestedGuideLink ?? d.suggested_guide_link) ?? undefined,
    confusionFrequency: freq ?? undefined,
  };
}

/** Normalize board_trap payload */
export function normalizeBoardTrap(d: Record<string, unknown>): BoardTrapPayload {
  const severity = normalizeTrapSeverity(d.severity ?? d.trapSeverity ?? d.trap_severity);
  return {
    title: String(d.title ?? "").trim(),
    trapDescription: String(d.trapDescription ?? d.trap_description ?? "").trim(),
    correctApproach: String(d.correctApproach ?? d.correct_approach ?? "").trim(),
    severity: severity ?? undefined,
    whyHighYield: d.whyHighYield ? String(d.whyHighYield).trim() : undefined,
    suggestedPracticeLink: normalizeSuggestedLink(d.suggestedPracticeLink ?? d.suggested_practice_link) ?? undefined,
    suggestedGuideLink: normalizeSuggestedLink(d.suggestedGuideLink ?? d.suggested_guide_link) ?? undefined,
    trapSeverity: severity ?? undefined,
  };
}

/** Normalize compare_contrast payload */
export function normalizeCompareContrast(d: Record<string, unknown>): CompareContrastPayload {
  return {
    title: String(d.title ?? "").trim(),
    conceptA: String(d.conceptA ?? "").trim(),
    conceptB: String(d.conceptB ?? "").trim(),
    keyDifference: String(d.keyDifference ?? "").trim(),
    explanation: d.explanation ? String(d.explanation).trim() : undefined,
    suggestedPracticeLink: normalizeSuggestedLink(d.suggestedPracticeLink ?? d.suggested_practice_link) ?? undefined,
    suggestedGuideLink: normalizeSuggestedLink(d.suggestedGuideLink ?? d.suggested_guide_link) ?? undefined,
  };
}
