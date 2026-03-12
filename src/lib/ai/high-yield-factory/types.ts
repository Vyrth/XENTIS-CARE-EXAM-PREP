/**
 * High-Yield Factory - typed output schema for high-yield content generation.
 * Matches high_yield_content table and enum values.
 */

export type ExamTrack = "lvn" | "rn" | "fnp" | "pmhnp";

/** content_type enum - must match high_yield_content_type */
export type HighYieldContentType =
  | "high_yield_summary"
  | "common_confusion"
  | "board_trap"
  | "compare_contrast_summary";

/** confusion_frequency enum - must match DB */
export type ConfusionFrequency = "common" | "very_common" | "extremely_common";

export const VALID_CONTENT_TYPES: HighYieldContentType[] = [
  "high_yield_summary",
  "common_confusion",
  "board_trap",
  "compare_contrast_summary",
];

export const VALID_CONFUSION_FREQUENCIES: ConfusionFrequency[] = [
  "common",
  "very_common",
  "extremely_common",
];

export interface HighYieldSummaryPayload {
  title: string;
  explanation: string;
  whyHighYield?: string;
  commonConfusion?: string;
  suggestedPracticeLink?: string;
  suggestedGuideLink?: string;
  highYieldScore?: number;
}

export interface CommonConfusionPayload {
  title: string;
  explanation: string;
  conceptA?: string;
  conceptB?: string;
  keyDifference?: string;
  commonConfusion?: string;
  suggestedPracticeLink?: string;
  suggestedGuideLink?: string;
  confusionFrequency?: string;
}

export interface BoardTrapPayload {
  title: string;
  trapDescription: string;
  correctApproach: string;
  severity?: number;
  whyHighYield?: string;
  suggestedPracticeLink?: string;
  suggestedGuideLink?: string;
  trapSeverity?: number;
}

export interface CompareContrastPayload {
  title: string;
  conceptA: string;
  conceptB: string;
  keyDifference: string;
  explanation?: string;
  suggestedPracticeLink?: string;
  suggestedGuideLink?: string;
}

export type HighYieldPayload =
  | HighYieldSummaryPayload
  | CommonConfusionPayload
  | BoardTrapPayload
  | CompareContrastPayload;
