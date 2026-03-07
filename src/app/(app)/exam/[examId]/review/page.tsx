"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useExam } from "@/hooks/useExam";
import { Card } from "@/components/ui/Card";
import { Icons } from "@/components/ui/icons";
import {
  MOCK_QUESTIONS,
  MOCK_IMAGE_QUESTION,
  MOCK_CASE_STUDY_QUESTION,
} from "@/data/mock/questions";

const ALL_QUESTIONS = [
  ...MOCK_QUESTIONS,
  MOCK_IMAGE_QUESTION,
  MOCK_CASE_STUDY_QUESTION,
];

export default function ExamReviewNavigatorPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;
  const questionIds = ALL_QUESTIONS.map((q) => q.id);
  const { questions, currentIndex, goToQuestion } = useExam(questionIds);

  const handleSubmit = () => {
    router.push(`/exam/${examId}/results`);
  };

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
          {questions.map((q, i) => {
            const isCurrent = i === currentIndex;
            const isAnswered = q.isAnswered;
            const isFlagged = q.isFlagged;
            return (
              <button
                key={q.questionId}
                type="button"
                onClick={() => goToQuestion(i)}
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
        <Link
          href={`/exam/${examId}`}
          className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          Back to Exam
        </Link>
        <button
          type="button"
          onClick={handleSubmit}
          className="px-6 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700"
        >
          Submit Exam
        </button>
      </div>
    </div>
  );
}
