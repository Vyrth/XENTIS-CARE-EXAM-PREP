import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { getSessionUser } from "@/lib/auth/session";
import { getPrimaryTrack } from "@/lib/auth/track";
import { loadQuestionCounts, loadDomains } from "@/lib/questions";
import { Icons } from "@/components/ui/icons";

type Props = { params: Promise<{ slug: string }> };

export default async function QuestionsByDomainPage({ params }: Props) {
  const { slug } = await params;
  const user = await getSessionUser();
  const primary = await getPrimaryTrack(user?.id ?? null);
  const track = primary?.trackSlug ?? "rn";
  const trackId = primary?.trackId ?? null;

  const [counts, domains] = await Promise.all([
    loadQuestionCounts(trackId),
    loadDomains(),
  ]);

  const domain = domains.find((d) => d.slug === slug);
  const domainCount = counts.byDomain.find((d) => d.domainSlug === slug)?.count ?? 0;

  if (!domain) {
    return (
      <div className="p-6">
        <p className="text-slate-500">Domain not found.</p>
        <Link href="/questions" className="text-indigo-600 mt-4 inline-block">
          Back to Question Bank
        </Link>
      </div>
    );
  }

  const canStart = domainCount >= 10;

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
        {domain.name} — Practice
      </h1>
      <p className="text-slate-600 dark:text-slate-400">
        {domainCount} question{domainCount === 1 ? "" : "s"} available for {track.toUpperCase()}.
        Domain questions span multiple systems.
      </p>

      <Card>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <p className="font-medium text-slate-900 dark:text-white">
              Domain practice: {domainCount} questions
            </p>
            <p className="text-sm text-slate-500 mt-0.5">
              Mixed system questions.
            </p>
          </div>
          <Link
            href={canStart ? `/questions?domain=${slug}` : "#"}
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

      {domainCount === 0 && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
          <p className="text-slate-600 dark:text-slate-400 text-center py-6">
            No questions in this domain yet. Check back later or try another domain.
          </p>
        </Card>
      )}
    </div>
  );
}
