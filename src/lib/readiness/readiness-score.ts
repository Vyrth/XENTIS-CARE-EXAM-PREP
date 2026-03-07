/**
 * Readiness score service - computes composite readiness from configurable inputs
 */

import {
  READINESS_BANDS,
  READINESS_WEIGHTS,
  TARGET_READINESS,
} from "@/config/readiness";
import type { ReadinessInputs, ReadinessBand } from "@/types/readiness";

/** Compute weighted readiness score (0-100) */
export function computeReadinessScore(inputs: ReadinessInputs): number {
  const w = READINESS_WEIGHTS;
  const score =
    inputs.questionAccuracy * w.questionAccuracy +
    inputs.domainPerformance * w.domainPerformance +
    inputs.systemPerformance * w.systemPerformance +
    inputs.skillPerformance * w.skillPerformance +
    inputs.systemExamPerformance * w.systemExamPerformance +
    inputs.prePracticeExamPerformance * w.prePracticeExamPerformance +
    inputs.studyGuideCompletion * w.studyGuideCompletion +
    inputs.videoCompletion * w.videoCompletion +
    inputs.confidenceCalibration * w.confidenceCalibration +
    inputs.consistencyOverTime * w.consistencyOverTime;
  return Math.round(Math.min(100, Math.max(0, score)));
}

/** Map score to readiness band */
export function getReadinessBand(score: number): ReadinessBand {
  for (const [band, config] of Object.entries(READINESS_BANDS)) {
    if (score >= config.min && score <= config.max) {
      return band as ReadinessBand;
    }
  }
  return score < 50 ? "not_ready" : "exam_ready";
}

/** Get band label and color for UI */
export function getReadinessBandInfo(score: number) {
  const band = getReadinessBand(score);
  const config = READINESS_BANDS[band];
  return {
    band,
    label: config.label,
    color: config.color,
    score,
    target: TARGET_READINESS,
    gap: TARGET_READINESS - score,
  };
}
