"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { logDashboardMount, logDashboardUnmount } from "@/lib/debug/dashboard-logger";
import { Card } from "@/components/ui/Card";
import { Icons } from "@/components/ui/icons";
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
      <h2 className="font-heading text-xl font-semibold text-slate-900 dark:text-white mb-5">
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
            <Card variant="elevated" className="overflow-hidden">
              <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/15 to-violet-500/15 dark:from-indigo-400/20 dark:to-violet-400/20 flex items-center justify-center mb-4 [&>svg]:w-7 [&>svg]:h-7 text-indigo-600 dark:text-indigo-400">
                  {Icons["trending-up"]}
                </div>
                <h3 className="font-heading font-semibold text-slate-900 dark:text-white">
                  No activity yet
                </h3>
                <p className="mt-2 text-slate-600 dark:text-slate-400 max-w-sm">
                  Answer questions to build your readiness score and see focus areas.
                </p>
                <div className="mt-5 flex gap-3">
                  <Link
                    href="/questions"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
                  >
                    Practice questions
                    {Icons.chevronRight}
                  </Link>
                  <Link
                    href="/pre-practice"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    Pre-practice exam
                  </Link>
                </div>
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
