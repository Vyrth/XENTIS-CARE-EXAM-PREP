"use client";

import { useMemo } from "react";
import { generateRecommendations } from "@/lib/readiness/recommendation-engine";
import type { MasteryRollup } from "@/types/readiness";

export interface RecommendationInputs {
  weakSystems: MasteryRollup[];
  weakDomains: MasteryRollup[];
  weakSkills: MasteryRollup[];
  weakItemTypes: MasteryRollup[];
  studyGuideProgress?: number;
  videoProgress?: number;
  lastPrePracticeDate?: string;
  overconfidentRanges?: string[];
  /** Track slug for track-specific pre-practice href */
  trackSlug?: string;
  getSystemSlug: (systemId: string) => string;
  getDomainSlug: (domainId: string) => string;
  getItemTypeSlug?: (questionTypeId: string) => string;
  /** When false, return [] (no synthetic recommendations when no activity) */
  hasActivity?: boolean;
}

/** Hook to generate adaptive recommendations */
export function useRecommendations(inputs: RecommendationInputs | null) {
  return useMemo(() => {
    if (!inputs || inputs.hasActivity === false) return [];
    return generateRecommendations(
      {
        weakSystems: inputs.weakSystems,
        weakDomains: inputs.weakDomains,
        weakSkills: inputs.weakSkills,
        weakItemTypes: inputs.weakItemTypes,
        studyGuideProgress: inputs.studyGuideProgress,
        videoProgress: inputs.videoProgress,
        lastPrePracticeDate: inputs.lastPrePracticeDate,
        overconfidentRanges: inputs.overconfidentRanges,
        trackSlug: inputs.trackSlug,
      },
      inputs.getSystemSlug,
      inputs.getDomainSlug,
      {
        getItemTypeSlug: inputs.getItemTypeSlug,
      }
    );
  }, [inputs]);
}
