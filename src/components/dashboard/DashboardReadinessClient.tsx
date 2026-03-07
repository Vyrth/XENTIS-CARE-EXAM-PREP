"use client";

import { useReadiness } from "@/hooks/useReadiness";
import { useMastery } from "@/hooks/useMastery";
import { useRecommendations } from "@/hooks/useRecommendations";
import { ReadinessGauge } from "./ReadinessGauge";
import { WeakAreaCards } from "./WeakAreaCards";
import { AdaptiveRecommendationWidget } from "./AdaptiveRecommendationWidget";
import {
  MOCK_READINESS_INPUTS,
  MOCK_RAW_SYSTEM_PERFORMANCE,
  MOCK_RAW_DOMAIN_PERFORMANCE,
  MOCK_RAW_SKILL_PERFORMANCE,
  MOCK_RAW_ITEM_TYPE_PERFORMANCE,
} from "@/data/mock/readiness";
import { MOCK_SYSTEMS, MOCK_DOMAINS } from "@/data/mock/systems";
import { buildConfidenceBuckets } from "@/lib/readiness/confidence-calibration";
import { MOCK_CONFIDENCE_DATA } from "@/data/mock/performance";

function getSystemSlug(id: string) {
  return MOCK_SYSTEMS.find((s) => s.id === id)?.slug ?? id;
}

function getDomainSlug(id: string) {
  return MOCK_DOMAINS.find((d) => d.id === id)?.slug ?? id;
}

export function DashboardReadinessClient() {
  const readiness = useReadiness(MOCK_READINESS_INPUTS);
  const mastery = useMastery({
    systems: MOCK_RAW_SYSTEM_PERFORMANCE,
    domains: MOCK_RAW_DOMAIN_PERFORMANCE,
    skills: MOCK_RAW_SKILL_PERFORMANCE,
    itemTypes: MOCK_RAW_ITEM_TYPE_PERFORMANCE,
  });
  const confidenceBuckets = buildConfidenceBuckets(
    MOCK_CONFIDENCE_DATA.map((r) => ({ range: r.range, correct: r.correct, total: r.total }))
  );
  const overconfidentRanges = confidenceBuckets
    .filter((b) => !b.calibrated && b.expectedMidpoint < 50)
    .map((b) => b.range);

  const recommendations = useRecommendations(
    mastery
      ? {
          weakSystems: mastery.weakSystems,
          weakDomains: mastery.weakDomains,
          weakSkills: mastery.weakSkills,
          weakItemTypes: mastery.weakItemTypes,
          studyGuideProgress: 40,
          videoProgress: 30,
          lastPrePracticeDate: "2025-02-28",
          overconfidentRanges: overconfidentRanges.length > 0 ? overconfidentRanges : undefined,
          getSystemSlug,
          getDomainSlug,
        }
      : null
  );

  return (
    <>
      <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
        Readiness & Recommendations
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {readiness && (
            <ReadinessGauge
            score={readiness.score}
            band={readiness.label}
            color={readiness.color as "red" | "amber" | "emerald" | "green"}
            target={readiness.target}
          />
        )}
        {mastery && (
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
        )}
      </div>
      <div>
        <AdaptiveRecommendationWidget recommendations={recommendations} />
      </div>
    </div>
    </>
  );
}
