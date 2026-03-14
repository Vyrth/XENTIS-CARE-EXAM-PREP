/**
 * High-Yield Factory - JSON parsing with enum-safe normalization.
 */
import {
  normalizeHighYieldSummary,
  normalizeCommonConfusion,
  normalizeBoardTrap,
  normalizeCompareContrast,
} from "./normalizer";
import type {
  HighYieldContentType,
  HighYieldSummaryPayload,
  CommonConfusionPayload,
  BoardTrapPayload,
  CompareContrastPayload,
} from "./types";

function extractJson<T = unknown>(text: string): T | null {
  if (!text || typeof text !== "string") return null;
  const trimmed = text.trim();
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      /* fall through */
    }
  }
  return null;
}

export function parseHighYieldOutput(
  raw: string,
  contentType: HighYieldContentType
):
  | HighYieldSummaryPayload
  | CommonConfusionPayload
  | BoardTrapPayload
  | CompareContrastPayload
  | null {
  const parsed = extractJson<Record<string, unknown>>(raw);
  if (!parsed?.title) return null;

  switch (contentType) {
    case "high_yield_summary": {
      if (!parsed.explanation) return null;
      return normalizeHighYieldSummary(parsed);
    }
    case "common_confusion": {
      if (!parsed.explanation) return null;
      return normalizeCommonConfusion(parsed);
    }
    case "board_trap": {
      const trapDesc = parsed.trapDescription ?? parsed.trap_description;
      const correct = parsed.correctApproach ?? parsed.correct_approach;
      if (!trapDesc || !correct) return null;
      return normalizeBoardTrap(parsed);
    }
    case "compare_contrast_summary": {
      const ca = parsed.conceptA ?? parsed.concept_a;
      const cb = parsed.conceptB ?? parsed.concept_b;
      const kd = parsed.keyDifference ?? parsed.key_difference;
      if (!ca || !cb || !kd) return null;
      return normalizeCompareContrast(parsed);
    }
    default:
      return null;
  }
}
