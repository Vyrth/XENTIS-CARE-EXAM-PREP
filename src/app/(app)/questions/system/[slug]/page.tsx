import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { getSessionUser } from "@/lib/auth/session";
import { getPrimaryTrack } from "@/lib/auth/track";
import { loadQuestionCounts, loadSystemsForTrack } from "@/lib/questions";
import { Icons } from "@/components/ui/icons";
import { SYSTEM_EXAM_MIN_QUESTIONS } from "@/types/exam";

type Props = { params: Promise<{ slug: string }> };

export default async function QuestionsBySystemPage({ params }: Props) {
  const { slug } = await params;
  const user = await getSessionUser();
  const primary = await getPrimaryTrack(user?.id ?? null);
  const track = primary?.trackSlug ?? "rn";
  const trackId = primary?.trackId ?? null;

  const [counts, systems] = await Promise.all([
    loadQuestionCounts(trackId),
    loadSystemsForTrack(trackId),
  ]);

  const system = systems.find((s) => s.slug === slug);
  const systemCount = counts.bySystem.find((s) => s.systemSlug === slug)?.count ?? 0;

  if (!system) {
    return (
      <div className="p-6">
        <p className="text-slate-500">System not found.</p>
        <Link href="/questions" className="text-indigo-600 mt-4 inline-block">
          Back to Question Bank
        </Link>
      </div>
    );
  }

  const canStart = systemCount >= SYSTEM_EXAM_MIN_QUESTIONS;
  const seed = Date.now() % 100000;
  const examHref = `/exam/system-${system.id}-${seed}`;

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto space-y-8">
      <Link
        href="/questions"
        className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
      >
        <span className="inline-block rotate-180">{Icons.chevronRight}</span>
        Back to Question Bank
      </Link>

      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        {system.name} — Practice
      </h1>
      <p className="text-slate-600 dark:text-slate-400">
        {systemCount} question{systemCount === 1 ? "" : "s"} available for {track.toUpperCase()}.
        {!canStart && (
          <span className="block mt-2 text-amber-600 dark:text-amber-400">
            Minimum {SYSTEM_EXAM_MIN_QUESTIONS} questions required to start a system exam.
          </span>
        )}
      </p>

      <Card>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <p className="font-medium text-slate-900 dark:text-white">
              System exam: {systemCount} questions
            </p>
            <p className="text-sm text-slate-500 mt-0.5">
              No time limit for practice mode. Focus on your weak areas.
            </p>
          </div>
          <Link
            href={canStart ? examHref : "#"}
            className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium ${
              canStart
                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                : "bg-slate-200 dark:bg-slate-700 text-slate-500 cursor-not-allowed"
            }`}
            aria-disabled={!canStart}
          >
            Start Practice
            {Icons.chevronRight}
          </Link>
        </div>
      </Card>

      {systemCount === 0 && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
          <p className="text-slate-600 dark:text-slate-400 text-center py-6">
            No questions in this system yet. Check back later or try another system.
          </p>
        </Card>
      )}
    </div>
  );
}
