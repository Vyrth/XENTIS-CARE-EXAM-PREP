"use client";

import { useMemo } from "react";
import {
  computeReadinessScore,
  getReadinessBandInfo,
} from "@/lib/readiness/readiness-score";
import type { ReadinessInputs } from "@/types/readiness";

/** Hook to compute readiness score and band from inputs */
export function useReadiness(inputs: ReadinessInputs | null) {
  return useMemo(() => {
    if (!inputs) return null;
    const score = computeReadinessScore(inputs);
    return getReadinessBandInfo(score);
  }, [inputs]);
}
