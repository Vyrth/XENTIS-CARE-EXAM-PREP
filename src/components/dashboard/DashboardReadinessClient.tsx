"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { logDashboardMount, logDashboardUnmount } from "@/lib/debug/dashboard-logger";
import { Card } from "@/components/ui/Card";
import { useMastery } from "@/hooks/useMastery";
import { useRecommendations } from "@/hooks/useRecommendations";
import { ReadinessGauge } from "./ReadinessGauge";
import { WeakAreaCards } from "./WeakAreaCards";
import { AdaptiveRecommendationWidget } from "./AdaptiveRecommendationWidget";
import type { RawPerformanceRecord } from "@/lib/readiness/mastery-rollups";

export interface DashboardReadinessClientProps {
  readinessScore: number;
  readinessBand: string;
  readinessColor: "red" | "amber" | "emerald" | "green";
  masteryData: {
    systems: RawPerformanceRecord[];
    domains: RawPerformanceRecord[];
    skills: RawPerformanceRecord[];
    itemTypes: RawPerformanceRecord[];
    systemSlugMap: Record<string, string>;
    domainSlugMap: Record<string, string>;
    itemTypeSlugMap?: Record<string, string>;
  };
  /** Track slug for track-specific pre-practice links */
  trackSlug?: string;
  /** Last pre-practice exam date (YYYY-MM-DD) for recommendation logic */
  lastPrePracticeDate?: string | null;
  /** True when user has answered at least one question (differentiates "no data" from "all at target") */
  hasActivity?: boolean;
}

export function DashboardReadinessClient({
  readinessScore,
  readinessBand,
  readinessColor,
  masteryData,
  trackSlug,
  lastPrePracticeDate,
  hasActivity = true,
}: DashboardReadinessClientProps) {
  const mastery = useMastery(masteryData);

  // Refs keep slug maps current without changing callback identity (avoids useRecommendations churn)
  const systemSlugRef = useRef(masteryData.systemSlugMap);
  const domainSlugRef = useRef(masteryData.domainSlugMap);
  const itemTypeSlugRef = useRef(masteryData.itemTypeSlugMap);
  systemSlugRef.current = masteryData.systemSlugMap;
  domainSlugRef.current = masteryData.domainSlugMap;
  itemTypeSlugRef.current = masteryData.itemTypeSlugMap;

  const getSystemSlug = useCallback((id: string) => systemSlugRef.current[id] ?? id, []);
  const getDomainSlug = useCallback((id: string) => domainSlugRef.current[id] ?? id, []);
  const getItemTypeSlug = useCallback(
    (id: string) => itemTypeSlugRef.current?.[id] ?? id,
    []
  );

  const recommendationInputs = useMemo(
    () =>
      mastery
        ? {
            weakSystems: mastery.weakSystems,
            weakDomains: mastery.weakDomains,
            weakSkills: mastery.weakSkills,
            weakItemTypes: mastery.weakItemTypes,
            studyGuideProgress: undefined,
            videoProgress: undefined,
            lastPrePracticeDate: lastPrePracticeDate ?? undefined,
            trackSlug,
            getSystemSlug,
            getDomainSlug,
            getItemTypeSlug,
            hasActivity,
          }
        : null,
    [
      mastery,
      lastPrePracticeDate,
      trackSlug,
      hasActivity,
      getSystemSlug,
      getDomainSlug,
      getItemTypeSlug,
    ]
  );
  const recommendations = useRecommendations(recommendationInputs);

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("[dashboard] mounted: DashboardReadinessClient", { trackSlug });
    }
    logDashboardMount("DashboardReadinessClient");
    return () => logDashboardUnmount("DashboardReadinessClient");
  }, [trackSlug]);

  return (
    <>
      <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
        Readiness & Recommendations
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ReadinessGauge
            score={readinessScore}
            band={readinessBand}
            color={readinessColor}
            target={80}
            hasActivity={hasActivity}
          />
          {!hasActivity ? (
            <Card>
              <div className="text-center py-6">
                <p className="text-slate-500 dark:text-slate-400">
                  No activity yet. Answer questions to build your readiness score and see focus areas.
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  Start with practice questions or a pre-practice exam.
                </p>
              </div>
            </Card>
          ) : mastery ? (
            <WeakAreaCards
              weakAreas={[...mastery.weakSystems, ...mastery.weakDomains].slice(0, 4)}
              getPracticeHref={(id, type) =>
                type === "system"
                  ? `/questions/system/${getSystemSlug(id)}`
                  : `/questions?domain=${getDomainSlug(id)}`
              }
              getStudyHref={(id) => `/study-guides?system=${id}`}
              maxCards={3}
            />
          ) : null}
        </div>
        <div>
          <AdaptiveRecommendationWidget recommendations={recommendations} />
        </div>
      </div>
    </>
  );
}
