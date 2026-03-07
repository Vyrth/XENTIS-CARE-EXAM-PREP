"use client";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { ExamScoreResult } from "@/lib/exam/scoring";
import { MOCK_SYSTEMS } from "@/data/mock/systems";

export interface ExamResultSummaryProps {
  result: ExamScoreResult;
  onViewBreakdown: () => void;
  onReviewAnswers: () => void;
}

export function ExamResultSummary({
  result,
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
              const sys = MOCK_SYSTEMS.find((s) => s.id === sysId);
              return (
                <div key={sysId} className="flex items-center justify-between">
                  <span className="font-medium text-slate-900 dark:text-white">
                    {sys?.name ?? sysId}
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
