"use client";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { ExamScoreResult } from "@/lib/exam/scoring";

export interface ExamResultSummaryProps {
  result: ExamScoreResult;
  systemNames?: Record<string, string>;
  onViewBreakdown: () => void;
  onReviewAnswers: () => void;
}

export function ExamResultSummary({
  result,
  systemNames = {},
  onViewBreakdown,
  onReviewAnswers,
}: ExamResultSummaryProps) {
  const passed = result.percentCorrect >= 70;

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-8">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        Exam Results
      </h1>

      <Card className="text-center py-8">
        <p className="text-4xl font-heading font-bold text-slate-900 dark:text-white">
          {Math.round(result.percentCorrect)}%
        </p>
        <Badge variant={passed ? "success" : "error"} className="mt-2">
          {passed ? "Pass" : "Needs Improvement"}
        </Badge>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          {result.rawScore} of {result.maxScore} correct
        </p>
        <p className="text-sm text-slate-500 mt-1">
          Time: {Math.floor(result.timeSpentSeconds / 60)} min
          {(result.flaggedCount ?? 0) > 0 && ` · ${result.flaggedCount} flagged`}
        </p>
      </Card>

      <Card>
        <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
          By System
        </h2>
        <div className="space-y-4">
          {Object.entries(result.bySystem)
            .filter(([k]) => k !== "_unknown")
            .map(([sysId, data]) => {
              const name = systemNames[sysId] ?? sysId;
              return (
                <div key={sysId} className="flex items-center justify-between">
                  <span className="font-medium text-slate-900 dark:text-white">
                    {name}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${data.percent}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-10">
                      {Math.round(data.percent)}%
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      </Card>

      {(() => {
        const WEAK_THRESHOLD = 70;
        const weakSystems = Object.entries(result.bySystem)
          .filter(([k]) => k !== "_unknown")
          .filter(([, d]) => d.percent < WEAK_THRESHOLD)
          .sort(([, a], [, b]) => a.percent - b.percent);
        if (weakSystems.length === 0) return null;
        return (
          <Card>
            <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
              Areas to Review
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
              Systems below {WEAK_THRESHOLD}% — consider extra practice.
            </p>
            <div className="flex flex-wrap gap-2">
              {weakSystems.map(([sysId, d]) => (
                <Badge key={sysId} variant="warning" size="sm">
                  {systemNames[sysId] ?? sysId}: {Math.round(d.percent)}%
                </Badge>
              ))}
            </div>
          </Card>
        );
      })()}

      {result.byItemType && Object.keys(result.byItemType).filter((k) => k !== "_unknown").length > 0 && (
        <Card>
          <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
            By Question Type
          </h2>
          <div className="space-y-3">
            {Object.entries(result.byItemType)
              .filter(([k]) => k !== "_unknown")
              .map(([typeKey, data]) => (
                <div key={typeKey} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400 capitalize">
                    {typeKey.replace(/_/g, " ")}
                  </span>
                  <span className="font-medium">
                    {data.correct}/{data.total} ({Math.round(data.percent)}%)
                  </span>
                </div>
              ))}
          </div>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <button
          type="button"
          onClick={onViewBreakdown}
          className="flex-1 px-6 py-3 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          View Full Breakdown
        </button>
        <button
          type="button"
          onClick={onReviewAnswers}
          className="flex-1 px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700"
        >
          Review Answers
        </button>
      </div>
    </div>
  );
}
