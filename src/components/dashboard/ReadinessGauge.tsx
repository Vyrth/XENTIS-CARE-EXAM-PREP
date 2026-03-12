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
    <Card>
      <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
        Readiness Score
      </h2>
      <div className="flex flex-col items-center">
        <div
          className={`text-4xl font-bold ${colorClasses[color]}`}
          aria-label={showNoData ? "Readiness: No data yet" : `Readiness: ${score}%`}
        >
          {showNoData ? "No data yet" : `${score}%`}
        </div>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-1">
          {showNoData ? "Answer questions to build readiness" : band}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">
          {showNoData ? "Target: 80%" : gapText}
        </p>
        <div className="w-full mt-4 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              color === "red"
                ? "bg-red-500"
                : color === "amber"
                  ? "bg-amber-500"
                  : color === "emerald"
                    ? "bg-emerald-500"
                    : "bg-green-500"
            }`}
            style={{ width: `${showNoData ? 0 : Math.min(100, score)}%` }}
          />
        </div>
      </div>
    </Card>
  );
}
