"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { getQuestionIdsForExam } from "@/lib/exam/question-bank";
import { MOCK_SYSTEMS } from "@/data/mock/systems";
import { SYSTEM_EXAM_MIN_QUESTIONS } from "@/types/exam";

export default function SystemExamStartPage() {
  const params = useParams();
  const router = useRouter();
  const systemId = params.systemId as string;
  const system = MOCK_SYSTEMS.find((s) => s.id === systemId);

  const [ready, setReady] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);

  useEffect(() => {
    const seed = Date.now() % 100000;
    const ids = getQuestionIdsForExam({
      mode: "system",
      systemId,
      seed,
    });
    setQuestionCount(ids.length);
    setReady(ids.length >= SYSTEM_EXAM_MIN_QUESTIONS);
  }, [systemId]);

  const handleStart = () => {
    const seed = Date.now() % 100000;
    router.push(`/exam/system-${systemId}-${seed}`);
  };

  if (!system) {
    return (
      <div className="p-6">
        <p className="text-slate-500">System not found.</p>
        <Link href="/questions" className="text-indigo-600 mt-4 inline-block">Back</Link>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto space-y-8">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        System Exam: {system.name}
      </h1>
      <p className="text-slate-600 dark:text-slate-400">
        {questionCount} questions available. Minimum {SYSTEM_EXAM_MIN_QUESTIONS} required.
      </p>

      <Card>
        <p className="text-slate-700 dark:text-slate-300">
          System exams focus on a single body system. No time limit for practice mode.
        </p>
      </Card>

      <div className="flex gap-4">
        <Link href="/questions" className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600">
          Cancel
        </Link>
        <button
          type="button"
          onClick={handleStart}
          disabled={!ready}
          className="px-6 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Start Exam
        </button>
      </div>
    </div>
  );
}
