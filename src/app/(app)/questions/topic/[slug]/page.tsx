import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { getSessionUser } from "@/lib/auth/session";
import { getPrimaryTrack } from "@/lib/auth/track";
import { loadQuestionCounts, loadTopicsForTrack } from "@/lib/questions";
import { Icons } from "@/components/ui/icons";

type Props = { params: Promise<{ slug: string }> };

export default async function QuestionsByTopicPage({ params }: Props) {
  const { slug } = await params;
  const user = await getSessionUser();
  const primary = await getPrimaryTrack(user?.id ?? null);
  const track = primary?.trackSlug ?? "rn";
  const trackId = primary?.trackId ?? null;

  const [counts, topics] = await Promise.all([
    loadQuestionCounts(trackId),
    loadTopicsForTrack(trackId),
  ]);

  const topic = topics.find((t) => t.slug === slug);
  const topicCount = counts.byTopic.find((t) => t.topicSlug === slug)?.count ?? 0;

  if (!topic) {
    return (
      <div className="p-6">
        <p className="text-slate-500">Topic not found.</p>
        <Link href="/questions" className="text-indigo-600 mt-4 inline-block">
          Back to Question Bank
        </Link>
      </div>
    );
  }

  const canStart = topicCount >= 5;

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
        {topic.name} — Practice
      </h1>
      <p className="text-slate-600 dark:text-slate-400">
        {topicCount} question{topicCount === 1 ? "" : "s"} available for {track.toUpperCase()}.
        {topic.systemName && ` Part of ${topic.systemName}.`}
      </p>

      <Card>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <p className="font-medium text-slate-900 dark:text-white">
              Topic practice: {topicCount} questions
            </p>
            <p className="text-sm text-slate-500 mt-0.5">
              Focused topic practice.
            </p>
          </div>
          <Link
            href={canStart ? `/questions?topic=${slug}` : "#"}
            className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium ${
              canStart
                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                : "bg-slate-200 dark:bg-slate-700 text-slate-500 cursor-not-allowed"
            }`}
            aria-disabled={!canStart}
          >
            Browse Questions
            {Icons.chevronRight}
          </Link>
        </div>
      </Card>

      {topicCount === 0 && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
          <p className="text-slate-600 dark:text-slate-400 text-center py-6">
            No questions in this topic yet. Check back later or try another topic.
          </p>
        </Card>
      )}
    </div>
  );
}
