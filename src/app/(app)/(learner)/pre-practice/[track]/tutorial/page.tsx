"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Icons } from "@/components/ui/icons";

const TUTORIAL_STEPS = [
  {
    title: "Question Types",
    content:
      "You'll see single best answer, multiple response, image-based, and case study questions. Each type has specific instructions.",
  },
  {
    title: "Tools Available",
    content:
      "Use the Lab Reference for normal ranges, the Calculator for dosage math, and the Whiteboard for notes. All open in side drawers.",
  },
  {
    title: "Flagging & Navigation",
    content:
      "Flag questions to review later. Use the Review Navigator to jump between questions and see your progress at a glance.",
  },
  {
    title: "Time Management",
    content:
      "The timer runs continuously. Plan about 1–2 minutes per question. You can submit early if finished.",
  },
];

export default function PrePracticeTutorialPage() {
  const params = useParams();
  const track = params.track as string;
  const [step, setStep] = useState(0);

  const isLast = step === TUTORIAL_STEPS.length - 1;

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto space-y-8">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        Pre-Practice Tutorial
      </h1>

      <div className="flex gap-2 mb-6">
        {TUTORIAL_STEPS.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setStep(i)}
            className={`h-2 flex-1 rounded-full transition-colors ${
              i === step ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-700"
            }`}
            aria-label={`Step ${i + 1}`}
          />
        ))}
      </div>

      <Card>
        <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
          {TUTORIAL_STEPS[step].title}
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          {TUTORIAL_STEPS[step].content}
        </p>
      </Card>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          Previous
        </button>
        {isLast ? (
          <Link
            href={`/exam/pre_practice-${track}-${Date.now()}`}
            className="px-6 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700"
          >
            Start Exam
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            className="px-6 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
