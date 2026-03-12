"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";

interface SystemExamStartClientProps {
  systemId: string;
  systemName: string;
  examName: string;
  questionCount: number;
  canStart: boolean;
  minRequired: number;
}

export function SystemExamStartClient({
  systemId,
  examName,
  questionCount,
  canStart,
  minRequired,
}: SystemExamStartClientProps) {
  const router = useRouter();

  const handleStart = () => {
    const seed = Date.now() % 100000;
    router.push(`/exam/system-${systemId}-${seed}`);
  };

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto space-y-8">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        {examName}
      </h1>
      <p className="text-slate-600 dark:text-slate-400">
        {questionCount} questions available. Minimum {minRequired} required.
      </p>

      <Card>
        <p className="text-slate-700 dark:text-slate-300">
          System exams focus on a single body system. No time limit for practice mode.
        </p>
      </Card>

      <div className="flex gap-4">
        <Link
          href="/practice"
          className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          Cancel
        </Link>
        <button
          type="button"
          onClick={handleStart}
          disabled={!canStart}
          className="px-6 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Start Exam
        </button>
      </div>
    </div>
  );
}
