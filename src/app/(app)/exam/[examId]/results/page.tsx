"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Icons } from "@/components/ui/icons";
import { MOCK_PERFORMANCE_BY_SYSTEM } from "@/data/mock/performance";

export default function ExamResultsSummaryPage() {
  const params = useParams();
  const examId = params.examId as string;

  const score = 72;
  const totalQuestions = 150;
  const correct = Math.round((score / 100) * totalQuestions);
  const passed = score >= 70;

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-8">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        Exam Results
      </h1>

      <Card className="text-center py-8">
        <p className="text-4xl font-heading font-bold text-slate-900 dark:text-white">
          {score}%
        </p>
        <Badge
          variant={passed ? "success" : "error"}
          className="mt-2"
        >
          {passed ? "Pass" : "Needs Improvement"}
        </Badge>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          {correct} of {totalQuestions} correct
        </p>
      </Card>

      <Card>
        <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
          By System
        </h2>
        <div className="space-y-4">
          {MOCK_PERFORMANCE_BY_SYSTEM.slice(0, 4).map((p) => (
            <div key={p.systemId} className="flex items-center justify-between">
              <span className="font-medium text-slate-900 dark:text-white">
                {p.name}
              </span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full"
                    style={{ width: `${p.score}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-10">{p.score}%</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href={`/results/${examId}/breakdown`}
          className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          View Full Breakdown
          {Icons.chevronRight}
        </Link>
        <Link
          href={`/results/${examId}/rationale/q-1`}
          className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700"
        >
          Review Answers
          {Icons.chevronRight}
        </Link>
      </div>
    </div>
  );
}
