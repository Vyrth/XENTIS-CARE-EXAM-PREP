"use client";

import { Card } from "@/components/ui/Card";
import type { CompositionStats, BlueprintWarning } from "@/lib/admin/exam-assembly-pool";
import { Icons } from "@/components/ui/icons";

export interface ExamCompositionPreviewProps {
  composition: CompositionStats;
  warnings: BlueprintWarning[];
  expectedTotal?: number;
  isPrePractice?: boolean;
}

export function ExamCompositionPreview({
  composition,
  warnings,
  expectedTotal,
  isPrePractice,
}: ExamCompositionPreviewProps) {
  const total = composition.total;
  const meetsPrePractice = isPrePractice ? total >= 150 : true;
  const meetsExpected = expectedTotal ? total >= expectedTotal : true;

  return (
    <Card className="space-y-4">
      <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
        {Icons["bar-chart"]} Composition Preview
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide">Total</p>
          <p className={`text-lg font-semibold ${meetsExpected ? "text-emerald-600" : "text-amber-600"}`}>
            {total}
            {expectedTotal && (
              <span className="text-sm font-normal text-slate-500 ml-1">/ {expectedTotal}</span>
            )}
          </p>
        </div>
        {isPrePractice && (
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Pre-Practice Rule</p>
            <p className={`text-lg font-semibold ${meetsPrePractice ? "text-emerald-600" : "text-amber-600"}`}>
              {meetsPrePractice ? "150+ ✓" : `< 150`}
            </p>
          </div>
        )}
      </div>

      {composition.bySystem.length > 0 && (
        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">By System</p>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {composition.bySystem.map((s) => {
              const pct = total > 0 ? ((s.count / total) * 100).toFixed(1) : "0";
              return (
                <div key={s.systemId} className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400 truncate">{s.systemName}</span>
                  <span className="font-medium shrink-0 ml-2">{s.count} ({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {composition.byItemType.length > 0 && (
        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">By Item Type</p>
          <div className="flex flex-wrap gap-2">
            {composition.byItemType.map((t) => (
              <span
                key={t.slug}
                className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs"
              >
                {t.name}: {t.count}
              </span>
            ))}
          </div>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-1">
            {Icons.alertTriangle} Warnings
          </p>
          <ul className="space-y-1 text-sm text-amber-800 dark:text-amber-300">
            {warnings.map((w, i) => (
              <li key={i}>{w.message}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
