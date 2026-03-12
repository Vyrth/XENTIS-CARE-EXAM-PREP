"use client";

import { Card } from "@/components/ui/Card";
import type { PerformanceTrendPoint } from "@/lib/dashboard/loaders";

export interface PerformanceTrendCardProps {
  points: PerformanceTrendPoint[];
  emptyMessage?: string;
}

export function PerformanceTrendCard({ points, emptyMessage = "No activity yet" }: PerformanceTrendCardProps) {
  const hasData = points.some((p) => p.questionsAnswered > 0);

  if (!hasData) {
    return (
      <Card>
        <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
          Recent Performance
        </h2>
        <div className="text-center py-6">
          <p className="text-slate-500 dark:text-slate-400">{emptyMessage}</p>
          <p className="text-sm text-slate-400 mt-1">
            Answer questions to see your daily trend.
          </p>
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
    <Card>
      <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
        Recent Performance
      </h2>
      <div className="space-y-3">
        {points.map((p) => (
          <div key={p.date} className="flex items-center gap-2">
            <span className="text-sm text-slate-500 dark:text-slate-400 w-24 shrink-0">
              {formatDate(p.date)}
            </span>
            <div className="flex-1 min-w-0 h-6 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
              <div
                className="bg-indigo-500 h-full rounded-l-full transition-all"
                style={{ width: `${(p.questionsAnswered / maxAnswered) * 100}%` }}
              />
            </div>
            <span className="text-sm font-medium w-16 text-right">
              {p.questionsAnswered > 0
                ? `${p.questionsCorrect}/${p.questionsAnswered} (${Math.round(p.scorePct)}%)`
                : "—"}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
