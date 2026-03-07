/**
 * Confidence calibration - compare confidence to actual accuracy
 */

import { CONFIDENCE_CALIBRATION_TOLERANCE } from "@/config/readiness";
import type { ConfidenceBucket } from "@/types/readiness";

/** Parse range like "0-25%" to midpoint (12.5) */
function rangeToMidpoint(range: string): number {
  const match = range.match(/(\d+)\s*-\s*(\d+)/);
  if (!match) return 50;
  const low = parseInt(match[1], 10);
  const high = parseInt(match[2], 10);
  return (low + high) / 2;
}

/** Determine if a bucket is calibrated (accuracy within tolerance of confidence) */
export function isCalibrated(
  actualPercent: number,
  expectedMidpoint: number,
  tolerance = CONFIDENCE_CALIBRATION_TOLERANCE
): boolean {
  return Math.abs(actualPercent - expectedMidpoint) <= tolerance;
}

/** Build confidence buckets from raw data */
export function buildConfidenceBuckets(
  raw: { range: string; correct: number; total: number }[]
): ConfidenceBucket[] {
  return raw.map((r) => {
    const actualPercent = r.total > 0 ? (r.correct / r.total) * 100 : 0;
    const expectedMidpoint = rangeToMidpoint(r.range);
    const calibrated = isCalibrated(actualPercent, expectedMidpoint);
    return {
      range: r.range,
      correct: r.correct,
      total: r.total,
      actualPercent,
      expectedMidpoint,
      calibrated,
    };
  });
}

/** Overall calibration score (0-100): % of buckets that are calibrated, weighted by volume */
export function computeCalibrationScore(buckets: ConfidenceBucket[]): number {
  if (buckets.length === 0) return 100;
  let weighted = 0;
  let total = 0;
  for (const b of buckets) {
    weighted += b.total * (b.calibrated ? 100 : 0);
    total += b.total;
  }
  return total > 0 ? Math.round((weighted / total)) : 100;
}
