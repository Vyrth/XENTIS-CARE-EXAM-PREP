"use client";

import { Card } from "@/components/ui/Card";

export interface ExamReviewNavigatorProps {
  questionIds: string[];
  currentIndex: number;
  responses: Record<string, unknown>;
  flaggedIds: string[];
  onSelectQuestion: (index: number) => void;
  onSubmit: () => void;
}

export function ExamReviewNavigator({
  questionIds,
  currentIndex,
  responses,
  flaggedIds,
  onSelectQuestion,
  onSubmit,
}: ExamReviewNavigatorProps) {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        Exam Review
      </h1>
      <p className="text-slate-600 dark:text-slate-400">
        Jump to any question. Submit when ready.
      </p>

      <Card>
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
          {questionIds.map((qId, i) => {
            const isCurrent = i === currentIndex;
            const isAnswered = !!responses[qId];
            const isFlagged = flaggedIds.includes(qId);
            return (
              <button
                key={qId}
                type="button"
                onClick={() => onSelectQuestion(i)}
                className={`
                  relative aspect-square rounded-lg font-medium text-sm transition-colors
                  flex items-center justify-center
                  ${isCurrent ? "ring-2 ring-indigo-500 ring-offset-2 bg-indigo-50 dark:bg-indigo-950/50" : ""}
                  ${isAnswered ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"}
                  ${isFlagged ? "border-2 border-amber-400" : ""}
                  hover:bg-slate-200 dark:hover:bg-slate-700
                `}
              >
                {i + 1}
                {isFlagged && (
                  <span className="absolute top-0.5 right-0.5 text-amber-500 text-xs">★</span>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      <div className="flex flex-wrap gap-4">
        <span className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <span className="w-4 h-4 rounded bg-emerald-100 dark:bg-emerald-900/30" />
          Answered
        </span>
        <span className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <span className="w-4 h-4 rounded border-2 border-amber-400" />
          Flagged
        </span>
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => onSelectQuestion(Math.max(0, currentIndex - 1))}
          className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          Back to Exam
        </button>
        <button
          type="button"
          onClick={onSubmit}
          className="px-6 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700"
        >
          Submit Exam
        </button>
      </div>
    </div>
  );
}
