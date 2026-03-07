"use client";

import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import Link from "next/link";
import type { MasteryRollup } from "@/types/readiness";

export interface WeakAreaOverlayProps {
  /** Weak areas from mastery (systems/topics below target) */
  weakAreas: MasteryRollup[];
  /** High-yield scores for those areas - overlay shows "weak + high yield = priority" */
  highYieldScores?: Map<string, number>;
  maxItems?: number;
}

/** Overlay that highlights weak areas that are also high-yield (double priority) */
export function WeakAreaOverlay({
  weakAreas,
  highYieldScores = new Map(),
  maxItems = 4,
}: WeakAreaOverlayProps) {
  const scored = weakAreas
    .map((a) => {
      const entityId = a.id.replace(/^(system|topic|domain)-/, "");
      const hyScore = highYieldScores.get(entityId) ?? highYieldScores.get(a.id) ?? 0;
      return { ...a, hyScore };
    })
    .sort((a, b) => b.hyScore - a.hyScore)
    .slice(0, maxItems);

  if (scored.length === 0) return null;

  return (
    <Card className="border-l-4 border-l-amber-500 bg-amber-50/50 dark:bg-amber-900/10">
      <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-2">
        Priority: Weak + High Yield
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        These areas are both below your target and high-yield on the exam. Focus here first.
      </p>
      <div className="space-y-3">
        {scored.map((area) => (
          <div
            key={area.id}
            className="flex items-center justify-between gap-4 p-3 rounded-xl bg-white dark:bg-slate-800/50"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium text-slate-900 dark:text-white truncate">
                {area.name}
              </p>
              <p className="text-sm text-slate-500">
                {area.percent}% — Target: {area.targetPercent}%
                {area.hyScore >= 60 && (
                  <span className="ml-2 text-amber-600 dark:text-amber-400">
                    • High yield
                  </span>
                )}
              </p>
              <ProgressBar value={area.percent} size="sm" className="mt-2 max-w-[200px]" />
            </div>
            <Link
              href={`/questions?system=${area.id.replace(/^(system|topic|domain)-/, "")}`}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
            >
              Practice
            </Link>
          </div>
        ))}
      </div>
    </Card>
  );
}
