"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { getQuestionIdsForExam } from "@/lib/exam/question-bank";
import { READINESS_CONFIG } from "@/types/exam";
import { EXAM_TRACKS } from "@/config/auth";

export default function ReadinessExamStartPage() {
  const router = useRouter();

  const handleStart = (track: string) => {
    const seed = Date.now() % 100000;
    router.push(`/exam/readiness-${track}-${seed}`);
  };

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto space-y-8">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        Readiness Exam
      </h1>
      <p className="text-slate-600 dark:text-slate-400">
        Short diagnostic: {READINESS_CONFIG.questionCount} questions, {READINESS_CONFIG.timeLimitMinutes} minutes.
      </p>

      <Card>
        <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
          Select Track
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {EXAM_TRACKS.map((t) => (
            <button
              key={t.slug}
              type="button"
              onClick={() => handleStart(t.slug)}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-left"
            >
              <p className="font-medium text-slate-900 dark:text-white">{t.name}</p>
              <p className="text-sm text-slate-500 mt-1">
                {READINESS_CONFIG.questionCount} questions · {READINESS_CONFIG.timeLimitMinutes} min
              </p>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
