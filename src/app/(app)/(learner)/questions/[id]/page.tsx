"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { useQuestion } from "@/hooks/useQuestion";
import { getQuestionRenderer } from "@/components/exam/question-renderers";
import { Icons } from "@/components/ui/icons";

export default function QuestionDetailPage() {
  const params = useParams();
  const questionId = params.id as string;
  const { question, loading } = useQuestion(questionId);
  const Renderer = question ? getQuestionRenderer(question.type) : null;

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="p-6">
        <p className="text-slate-500">Question not found.</p>
        <Link href="/questions" className="text-indigo-600 mt-4 inline-block">
          Back to Question Bank
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <Link
        href="/questions"
        className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
      >
        <span className="inline-block rotate-180">{Icons.chevronRight}</span>
        Back to Question Bank
      </Link>

      <Card>
        <div className="prose dark:prose-invert max-w-none">
          <p className="text-slate-900 dark:text-white whitespace-pre-wrap">{question.stem}</p>
        </div>
        {Renderer && (
          <div className="mt-6">
            <Renderer
              question={question}
              onChange={() => {}}
              disabled
            />
          </div>
        )}
      </Card>

      {question.rationale && (
        <Card className="border-emerald-200 dark:border-emerald-800">
          <h3 className="font-heading text-sm font-semibold text-slate-900 dark:text-white mb-2">
            Rationale
          </h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm whitespace-pre-wrap">
            {question.rationale}
          </p>
        </Card>
      )}
    </div>
  );
}
