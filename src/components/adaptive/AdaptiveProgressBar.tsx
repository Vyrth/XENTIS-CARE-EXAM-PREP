"use client";

import { memo } from "react";

export interface AdaptiveProgressBarProps {
  questionsAnswered: number;
  minQuestions: number;
  maxQuestions: number;
  readinessScore: number | null;
  confidenceBand: string | null;
}

const BAND_COLORS: Record<string, string> = {
  at_risk: "text-red-600 dark:text-red-400",
  borderline: "text-amber-600 dark:text-amber-400",
  likely_pass: "text-emerald-600 dark:text-emerald-400",
  strong_pass: "text-green-600 dark:text-green-400",
};

function formatBand(band: string | null): string {
  if (!band) return "—";
  return band.replace(/_/g, " ");
}

export const AdaptiveProgressBar = memo(function AdaptiveProgressBar({
  questionsAnswered,
  minQuestions,
  maxQuestions,
  readinessScore,
  confidenceBand,
}: AdaptiveProgressBarProps) {
  const progressPct = maxQuestions > 0 ? Math.min(100, (questionsAnswered / maxQuestions) * 100) : 0;
  const bandColor = confidenceBand ? BAND_COLORS[confidenceBand] ?? "text-slate-600" : "text-slate-500";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-300">
          Question {questionsAnswered} of {maxQuestions}
        </span>
        {readinessScore != null && (
          <span className={bandColor}>
            Readiness: {readinessScore}% · {formatBand(confidenceBand)}
          </span>
        )}
      </div>
      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </div>
  );
});
