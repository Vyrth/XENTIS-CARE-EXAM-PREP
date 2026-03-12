"use client";

import { Card } from "@/components/ui/Card";

export interface ReadinessGaugeProps {
  score: number;
  band: string;
  color: "red" | "amber" | "emerald" | "green";
  target?: number;
  /** When true and score is 0, show "No data yet" instead of "0%" (zero-state truthfulness) */
  hasActivity?: boolean;
}

const colorClasses = {
  red: "text-red-600 dark:text-red-400",
  amber: "text-amber-600 dark:text-amber-400",
  emerald: "text-emerald-600 dark:text-emerald-400",
  green: "text-green-600 dark:text-green-400",
};

export function ReadinessGauge({ score, band, color, target = 80, hasActivity = true }: ReadinessGaugeProps) {
  const gap = target - score;
  const gapText = gap > 0 ? `${gap}% to target` : "At or above target";
  const showNoData = score === 0 && !hasActivity;

  return (
    <Card variant="elevated" padding="none" className="overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-indigo-500/30 via-violet-500/30 to-cyan-500/30 rounded-t-card" />
      <div className="p-6">
        <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
          Readiness Score
        </h2>
        <div className="flex flex-col items-center">
          <div
            className={`text-5xl font-bold tabular-nums ${colorClasses[color]}`}
            aria-label={showNoData ? "Readiness: No data yet" : `Readiness: ${score}%`}
          >
            {showNoData ? "No data yet" : `${score}%`}
          </div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-2">
            {showNoData ? "Answer questions to build readiness" : band}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">
            {showNoData ? "Target: 80%" : gapText}
          </p>
          <div className="w-full mt-5 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                color === "red"
                  ? "bg-gradient-to-r from-rose-500 to-rose-400"
                  : color === "amber"
                    ? "bg-gradient-to-r from-amber-500 to-amber-400"
                    : color === "emerald"
                      ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                      : "bg-gradient-to-r from-green-500 to-emerald-400"
              }`}
              style={{ width: `${showNoData ? 0 : Math.min(100, score)}%` }}
            />
          </div>
          {!showNoData && (
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
              Questions, study guides, mastery, and exams build your readiness.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
