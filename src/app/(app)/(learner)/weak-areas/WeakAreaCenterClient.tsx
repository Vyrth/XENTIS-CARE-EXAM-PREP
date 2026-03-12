"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Icons } from "@/components/ui/icons";
import { JadeTutorWeakAreaPanel } from "@/components/study/JadeTutorWeakAreaPanel";
import type { MasteryRollup } from "@/types/readiness";
import type { RemediationItem } from "@/types/readiness";
import { toRemediationPlanData } from "@/lib/readiness/remediation-plan";

interface WeakAreaCenterClientProps {
  weakAreas: MasteryRollup[];
  remediationPlan: RemediationItem[];
  mastery: {
    systemSlugMap: Record<string, string>;
    domainSlugMap: Record<string, string>;
    itemTypeSlugMap?: Record<string, string>;
  };
  userId: string;
  track: string;
  trackId: string;
  readinessBand?: string;
  readinessScore?: number;
  recentMistakes?: string[];
}

function toWeakAreaInput(areas: MasteryRollup[]) {
  return areas.map((a) => ({
    name: a.name,
    percent: a.percent,
    targetPercent: a.targetPercent ?? 80,
    correct: a.correct ?? 0,
    total: a.total ?? 0,
  }));
}

function byType(areas: MasteryRollup[]) {
  const systems = areas.filter((a) => a.type === "system");
  const domains = areas.filter((a) => a.type === "domain");
  const skills = areas.filter((a) => a.type === "skill");
  const itemTypes = areas.filter((a) => a.type === "item_type");
  return { systems, domains, skills, itemTypes };
}

export function WeakAreaCenterClient({
  weakAreas,
  remediationPlan,
  mastery,
  userId,
  track,
  trackId,
  readinessBand,
  readinessScore,
  recentMistakes,
}: WeakAreaCenterClientProps) {
  const [panelArea, setPanelArea] = useState<MasteryRollup | "all" | null>(null);

  const { systems, domains, skills, itemTypes } = byType(weakAreas);
  const payload = {
    userId,
    examTrack: track,
    weakSystems: toWeakAreaInput(systems),
    weakDomains: toWeakAreaInput(domains),
    weakSkills: toWeakAreaInput(skills),
    weakItemTypes: toWeakAreaInput(itemTypes),
    readinessBand,
    readinessScore,
    recentMistakes,
  };

  const getPracticeHref = (type: string, entityId: string) => {
    if (type === "system") return `/questions/system/${mastery.systemSlugMap[entityId] ?? entityId}`;
    if (type === "domain") return `/questions?domain=${mastery.domainSlugMap[entityId] ?? entityId}`;
    if (type === "item_type") {
      const slug = mastery.itemTypeSlugMap?.[entityId] ?? entityId;
      return `/questions?itemType=${slug}`;
    }
    return "/questions";
  };

  const getDrillHref = (area: MasteryRollup | "all") => {
    if (area === "all" && weakAreas.length > 0) {
      const first = weakAreas[0];
      const entityId = first.id.replace(`${first.type}-`, "");
      return getPracticeHref(first.type, entityId);
    }
    if (area && area !== "all") {
      const entityId = area.id.replace(`${area.type}-`, "");
      return getPracticeHref(area.type, entityId);
    }
    return "/questions";
  };

  const handleSaveToNotebook = useCallback(async (content: string) => {
    await fetch("/api/ai/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "notebook",
        content,
        source_content_type: "weak_area_coaching",
      }),
    });
  }, []);

  const handleSaveRemediationPlan = useCallback(
    async (planData: Record<string, unknown>) => {
      const planPayload = toRemediationPlanData(remediationPlan, {
        suggestedNextStep: planData.suggestedNextStep as string,
        summary: planData.summary as string,
      });
      await fetch("/api/remediation/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Jade Tutor Remediation Plan",
          targetType: "weak_areas",
          targetId: "all",
          planData: { ...planPayload, ...planData },
          examTrackId: trackId,
        }),
      });
    },
    [remediationPlan, trackId]
  );

  const focusArea = panelArea === "all" ? null : panelArea;
  const drillHref = getDrillHref(panelArea ?? "all");

  return (
    <div className="space-y-8">
      <div className="space-y-6">
        {weakAreas.map((area) => {
          const entityId = area.id.replace(`${area.type}-`, "");
          const isSystem = area.type === "system";
          const isDomain = area.type === "domain";
          return (
            <Card key={area.id}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-heading font-semibold text-slate-900 dark:text-white">
                    {area.name}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {area.percent}% — Target: {area.targetPercent}% ({area.correct}/{area.total} correct)
                  </p>
                  <ProgressBar value={area.percent} size="sm" className="mt-2 max-w-xs" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setPanelArea(area)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
                  >
                    Remediate with Jade Tutor
                  </button>
                  <Link
                    href={getPracticeHref(area.type, entityId)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Practice Questions
                    {Icons.chevronRight}
                  </Link>
                  {(isSystem || isDomain) && (
                    <Link
                      href={
                        isSystem
                          ? `/study-guides?system=${mastery.systemSlugMap[entityId] ?? entityId}`
                          : "/study-guides"
                      }
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      Study Guide
                    </Link>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {remediationPlan.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-heading font-semibold text-slate-900 dark:text-white">
                Remediation Plan
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Suggested actions to close gaps. Estimated questions to reach target.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPanelArea("all")}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
            >
              Remediate with Jade Tutor
            </button>
          </div>
          <div className="space-y-4">
            {remediationPlan.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50"
              >
                <div className="flex justify-between items-start">
                  <h3 className="font-medium text-slate-900 dark:text-white">
                    {item.name}
                  </h3>
                  <span className="text-sm text-slate-500">
                    {item.currentPercent}% → {item.targetPercent}% (gap: {item.gap}%)
                  </span>
                </div>
                <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-400">
                  {item.suggestedActions.map((action) => (
                    <li key={action}>• {action}</li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-slate-500">
                  ~{item.estimatedQuestions} questions recommended
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {panelArea !== null && (
        <JadeTutorWeakAreaPanel
          focusArea={panelArea === "all" ? null : panelArea}
          payload={payload}
          drillHref={drillHref}
          onSaveToNotebook={handleSaveToNotebook}
          onSaveRemediationPlan={handleSaveRemediationPlan}
          onClose={() => setPanelArea(null)}
        />
      )}
    </div>
  );
}
