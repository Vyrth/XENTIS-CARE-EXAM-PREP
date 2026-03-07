"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Icons } from "@/components/ui/icons";
import type { MasteryRollup } from "@/types/readiness";

export interface WeakAreaCardsProps {
  weakAreas: MasteryRollup[];
  getPracticeHref: (entityId: string, type: string) => string;
  getStudyHref?: (entityId: string, type: string) => string;
  maxCards?: number;
}

export function WeakAreaCards({
  weakAreas,
  getPracticeHref,
  getStudyHref,
  maxCards = 3,
}: WeakAreaCardsProps) {
  const display = weakAreas.slice(0, maxCards);

  if (display.length === 0) {
    return (
      <Card>
        <div className="text-center py-6">
          <p className="text-emerald-600 dark:text-emerald-400 font-medium">
            All areas at target!
          </p>
          <p className="text-slate-500 text-sm mt-1">Keep up the great work.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
        Focus Areas
      </h2>
      <div className="space-y-4">
        {display.map((area) => {
          const entityId = area.id.replace(`${area.type}-`, "");
          return (
            <div
              key={area.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-900 dark:text-white truncate">
                  {area.name}
                </p>
                <p className="text-sm text-slate-500">
                  {area.percent}% — Target: {area.targetPercent}%
                </p>
                <ProgressBar value={area.percent} size="sm" className="mt-2 max-w-[200px]" />
              </div>
              <div className="flex gap-2 shrink-0">
                <Link
                  href={getPracticeHref(entityId, area.type)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
                >
                  Practice
                  {Icons.chevronRight}
                </Link>
                {getStudyHref && (
                  <Link
                    href={getStudyHref(entityId, area.type)}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Study
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
