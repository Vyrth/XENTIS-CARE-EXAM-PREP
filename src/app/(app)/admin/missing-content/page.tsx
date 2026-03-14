import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Icons } from "@/components/ui/icons";
import { loadMissingContentByTrack } from "@/lib/admin/track-inventory";
import { buildAIFactoryUrl } from "@/lib/admin/ai-factory-gap-links";

export default async function MissingContentPage() {
  const missing = await loadMissingContentByTrack();

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
          Missing Content by Track
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Production planning report: systems without questions, guides, videos, decks, or bundles. Pre-practice template status.
        </p>
      </div>

      <div className="space-y-8">
        {missing.length === 0 ? (
          <Card>
            <p className="text-slate-500 text-center py-8">
              No tracks found. Ensure exam_tracks and systems are seeded.
            </p>
          </Card>
        ) : (
          missing.map((row) => (
            <Card key={row.trackId}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-heading text-lg font-semibold text-slate-900 dark:text-white">
                  {row.trackName}
                </h2>
                <Badge track={row.trackSlug as "lvn" | "rn" | "fnp" | "pmhnp"}>
                  {row.trackSlug.toUpperCase()}
                </Badge>
              </div>

              <div className="flex items-center gap-2 mb-4">
                {row.hasPrePracticeTemplate ? (
                  <span className="text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-1">
                    {Icons.check} Pre-practice template configured
                  </span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400 text-sm flex items-center gap-1">
                    {Icons["help-circle"]} No pre-practice template
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {row.systemsWithoutQuestions.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                      Systems without questions
                    </h3>
                    <ul className="list-disc list-inside text-sm text-slate-700 dark:text-slate-300 space-y-1">
                      {row.systemsWithoutQuestions.map((s) => (
                        <li key={s.systemId} className="flex items-center justify-between gap-2">
                          <span>{s.systemName}</span>
                          <Link
                            href={buildAIFactoryUrl({ tab: "questions", trackId: row.trackId, systemId: s.systemId })}
                            className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline text-xs font-medium shrink-0"
                          >
                            {Icons.sparkles} Generate
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {row.systemsWithoutGuides.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                      Systems without study guides
                    </h3>
                    <ul className="list-disc list-inside text-sm text-slate-700 dark:text-slate-300 space-y-1">
                      {row.systemsWithoutGuides.map((s) => (
                        <li key={s.systemId} className="flex items-center justify-between gap-2">
                          <span>{s.systemName}</span>
                          <Link
                            href={buildAIFactoryUrl({ tab: "study-guides", trackId: row.trackId, systemId: s.systemId })}
                            className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline text-xs font-medium shrink-0"
                          >
                            {Icons.sparkles} Generate
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {row.systemsWithoutVideos.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                      Systems without videos
                    </h3>
                    <ul className="list-disc list-inside text-sm text-slate-700 dark:text-slate-300 space-y-1">
                      {row.systemsWithoutVideos.map((s) => (
                        <li key={s.systemId}>{s.systemName}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {row.systemsWithoutDecks.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                      Systems without flashcard decks
                    </h3>
                    <ul className="list-disc list-inside text-sm text-slate-700 dark:text-slate-300 space-y-1">
                      {row.systemsWithoutDecks.map((s) => (
                        <li key={s.systemId} className="flex items-center justify-between gap-2">
                          <span>{s.systemName}</span>
                          <Link
                            href={buildAIFactoryUrl({ tab: "flashcards", trackId: row.trackId, systemId: s.systemId })}
                            className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline text-xs font-medium shrink-0"
                          >
                            {Icons.sparkles} Generate
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {row.systemsWithoutBundles.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                      Systems without bundles
                    </h3>
                    <ul className="list-disc list-inside text-sm text-slate-700 dark:text-slate-300 space-y-1">
                      {row.systemsWithoutBundles.map((s) => (
                        <li key={s.systemId}>{s.systemName}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {row.systemExamsBelowMin.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                      Systems below ideal for full practice (50 questions)
                    </h3>
                    <ul className="list-disc list-inside text-sm text-slate-700 dark:text-slate-300 space-y-1">
                      {row.systemExamsBelowMin.map((s) => (
                        <li key={s.systemId} className="flex items-center justify-between gap-2">
                          <span>{s.systemName}: {s.count}/{s.minRequired}</span>
                          <Link
                            href={buildAIFactoryUrl({ tab: "questions", trackId: row.trackId, systemId: s.systemId })}
                            className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline text-xs font-medium shrink-0"
                          >
                            {Icons.sparkles} Generate
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {row.systemsWithoutQuestions.length === 0 &&
                row.systemsWithoutGuides.length === 0 &&
                row.systemsWithoutVideos.length === 0 &&
                row.systemsWithoutDecks.length === 0 &&
                row.systemsWithoutBundles.length === 0 &&
                row.systemExamsBelowMin.length === 0 &&
                row.hasPrePracticeTemplate && (
                  <p className="text-emerald-600 dark:text-emerald-400 text-sm mt-4">
                    All systems have content. Pre-practice template configured.
                  </p>
                )}
            </Card>
          ))
        )}
      </div>

      <div className="flex gap-4">
        <Link
          href="/admin/ai-factory"
          className="inline-flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          {Icons.sparkles} AI Content Factory
        </Link>
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:underline"
        >
          ← Back to Admin
        </Link>
      </div>
    </div>
  );
}
