"use client";

import { Card } from "@/components/ui/Card";
import { Icons } from "@/components/ui/icons";
import type { PerformanceTrendPoint } from "@/lib/dashboard/loaders";

export interface PerformanceTrendCardProps {
  points: PerformanceTrendPoint[];
  emptyMessage?: string;
}

export function PerformanceTrendCard({ points, emptyMessage = "No activity yet" }: PerformanceTrendCardProps) {
  const hasData = points.some((p) => p.questionsAnswered > 0);

  if (!hasData) {
    return (
      <Card variant="elevated" padding="none" className="overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 rounded-t-card" />
        <div className="p-6">
          <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
            Recent Performance
          </h2>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 dark:bg-cyan-400/10 flex items-center justify-center mb-3 text-cyan-600 dark:text-cyan-400 [&>svg]:w-6 [&>svg]:h-6">
              {Icons["trending-up"]}
            </div>
            <p className="text-slate-600 dark:text-slate-400">{emptyMessage}</p>
            <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
              Answer questions to see your daily trend.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const maxAnswered = Math.max(1, ...points.map((p) => p.questionsAnswered));
  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  return (
    <Card variant="elevated" padding="none" className="overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 rounded-t-card" />
      <div className="p-6">
        <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
          Recent Performance
        </h2>
        <div className="space-y-4">
          {points.map((p) => (
            <div key={p.date} className="flex items-center gap-3">
              <span className="text-sm text-slate-500 dark:text-slate-400 w-28 shrink-0">
                {formatDate(p.date)}
              </span>
              <div className="flex-1 min-w-0 h-7 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-violet-500 h-full rounded-l-full transition-all duration-500"
                  style={{ width: `${(p.questionsAnswered / maxAnswered) * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium w-20 text-right tabular-nums">
                {p.questionsAnswered > 0
                  ? `${p.questionsCorrect}/${p.questionsAnswered} (${Math.round(p.scorePct)}%)`
                  : "—"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
