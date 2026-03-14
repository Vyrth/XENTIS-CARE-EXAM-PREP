import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { TrackBadge } from "@/components/admin/TrackBadge";
import { AdminTrackFilter } from "@/components/admin/AdminTrackFilter";
import { Icons } from "@/components/ui/icons";
import {
  loadContentInventoryByTrack,
  loadMissingContentByTrack,
} from "@/lib/admin/track-inventory";
import { loadExamTracks } from "@/lib/admin/loaders";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";
import { buildAIFactoryUrl } from "@/lib/admin/ai-factory-gap-links";
import type { StatusBreakdown } from "@/lib/admin/track-inventory";
import { SYSTEM_EXAM_PRACTICE_IDEAL_QUESTIONS } from "@/config/exam";

const LOW_QUESTION_THRESHOLD = 20;

function StatusPills({ s }: { s: StatusBreakdown }) {
  const parts: string[] = [];
  if (s.approved > 0) parts.push(`${s.approved} approved`);
  if (s.review > 0) parts.push(`${s.review} in review`);
  if (s.draft > 0) parts.push(`${s.draft} draft`);
  if (s.archived > 0) parts.push(`${s.archived} archived`);
  return <span className="text-slate-600 dark:text-slate-400 text-sm">{parts.join(" · ") || "—"}</span>;
}

function InventoryRow({
  label,
  count,
  statusBreakdown,
  isLow,
  isMissing,
  createHref,
  importHref,
  trackId,
  generateTab,
}: {
  label: string;
  count: number;
  statusBreakdown?: StatusBreakdown;
  isLow?: boolean;
  isMissing?: boolean;
  createHref?: string;
  importHref?: string;
  trackId?: string;
  generateTab?: "questions" | "study-guides" | "flashcards" | "high-yield";
}) {
  const href = createHref ? (trackId ? `${createHref}?trackId=${trackId}` : createHref) : null;
  const importUrl = importHref ? (trackId ? `${importHref}?trackId=${trackId}` : importHref) : null;
  const generateHref =
    trackId && generateTab && (isLow || isMissing)
      ? buildAIFactoryUrl({ tab: generateTab, trackId })
      : null;
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-900 dark:text-white">{label}</span>
          {isMissing && (
            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs font-medium">
              {Icons.alertTriangle} Missing
            </span>
          )}
          {isLow && !isMissing && (
            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs font-medium">
              {Icons.alertTriangle} Low coverage
            </span>
          )}
        </div>
        {statusBreakdown && <StatusPills s={statusBreakdown} />}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="font-mono text-slate-700 dark:text-slate-300 tabular-nums">{count}</span>
        {generateHref && (
          <Link
            href={generateHref}
            className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline text-sm font-medium"
          >
            {Icons.sparkles} Generate
          </Link>
        )}
        {href && (
          <Link
            href={href}
            className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm"
          >
            Add
          </Link>
        )}
        {importUrl && (
          <Link
            href={importUrl}
            className="text-slate-600 dark:text-slate-400 hover:underline text-sm"
          >
            Import
          </Link>
        )}
      </div>
    </div>
  );
}

export default async function ContentInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ trackId?: string }>;
}) {
  const params = await searchParams;
  const trackId = params.trackId ?? null;

  const [inventory, missing, tracks] = await Promise.all([
    loadContentInventoryByTrack(),
    loadMissingContentByTrack(),
    loadExamTracks(),
  ]);

  const filteredInventory = trackId
    ? inventory.filter((r) => r.trackId === trackId)
    : inventory;

  const supabaseConfigured = isSupabaseServiceRoleConfigured();
  const allZeros = inventory.length > 0 && inventory.every((r) =>
    r.questions === 0 && r.studyGuides === 0 && r.videos === 0 && r.systems === 0
  );

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
            Content Inventory Dashboard
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            See what content exists and what is missing by track. Published vs draft breakdown.
          </p>
        </div>
        <AdminTrackFilter
          tracks={tracks}
          selectedTrackId={trackId}
          label="Filter by track"
        />
      </div>

      {!supabaseConfigured && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
          <p className="text-amber-800 dark:text-amber-200 text-sm font-medium flex items-center gap-2">
            {Icons.alertTriangle} Developer note: Supabase may not be configured. Set SUPABASE_SERVICE_ROLE_KEY in .env.local. Run seed scripts if tables are empty.
          </p>
        </Card>
      )}

      {allZeros && supabaseConfigured && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
          <p className="text-amber-800 dark:text-amber-200 text-sm font-medium flex items-center gap-2">
            {Icons.alertTriangle} Developer note: Counts are unexpectedly zero. Run seed scripts to populate exam_tracks, systems, and content tables.
          </p>
        </Card>
      )}

      {inventory.length === 0 ? (
        <Card>
          <p className="text-slate-500 text-center py-8">
            No tracks found. Ensure exam_tracks are seeded.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredInventory.map((row) => {
            const miss = missing.find((m) => m.trackId === row.trackId);
            return (
              <Card key={row.trackId} className="overflow-hidden">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-slate-700">
                  <h2 className="font-heading text-lg font-semibold text-slate-900 dark:text-white">
                    {row.trackName}
                  </h2>
                  <TrackBadge slug={row.trackSlug as "lvn" | "rn" | "fnp" | "pmhnp"} />
                </div>

                <div className="space-y-0">
                  <InventoryRow
                    label="Systems"
                    count={row.systems}
                    isMissing={row.systems === 0}
                    createHref="/admin/curriculum"
                    trackId={row.trackId}
                  />
                  <InventoryRow
                    label="Topics"
                    count={row.topics}
                    isMissing={row.topics === 0 && row.systems > 0}
                    createHref="/admin/curriculum"
                    trackId={row.trackId}
                  />
                  <InventoryRow
                    label="Questions"
                    count={row.questions}
                    statusBreakdown={row.questionsByStatus}
                    isLow={row.questionsApproved > 0 && row.questionsApproved < LOW_QUESTION_THRESHOLD}
                    isMissing={row.questions === 0}
                    createHref="/admin/questions/new"
                    importHref="/admin/questions/import"
                    trackId={row.trackId}
                    generateTab="questions"
                  />
                  <InventoryRow
                    label="Study Guides"
                    count={row.studyGuides}
                    statusBreakdown={row.studyGuidesByStatus}
                    isMissing={row.studyGuides === 0}
                    createHref="/admin/study-guides/new"
                    trackId={row.trackId}
                    generateTab="study-guides"
                  />
                  <InventoryRow
                    label="Flashcard Decks"
                    count={row.flashcardDecks}
                    isMissing={row.flashcardDecks === 0}
                    createHref="/admin/flashcards"
                    trackId={row.trackId}
                    generateTab="flashcards"
                  />
                  <InventoryRow
                    label="Flashcards"
                    count={row.flashcardCards}
                    isMissing={row.flashcardDecks > 0 && row.flashcardCards === 0}
                  />
                  <InventoryRow
                    label="Videos"
                    count={row.videos}
                    statusBreakdown={row.videosByStatus}
                    isMissing={row.videos === 0}
                    createHref="/admin/videos/new"
                    trackId={row.trackId}
                  />
                  <InventoryRow
                    label="Topic Summaries"
                    count={row.topicSummaries}
                    isMissing={row.topicSummaries === 0}
                  />
                  <InventoryRow
                    label="Practice Exams (templates)"
                    count={row.examTemplates}
                    isMissing={row.examTemplates === 0}
                  />
                  <InventoryRow
                    label="System Exams"
                    count={row.systemExams}
                    isLow={row.systemExams > 0 && row.questionsApproved > 0 && row.questionsApproved < row.systems * SYSTEM_EXAM_PRACTICE_IDEAL_QUESTIONS}
                    isMissing={row.systemExams === 0 && row.systems > 0}
                  />
                  <InventoryRow
                    label="Pre-practice Question Pool"
                    count={row.prePracticeQuestionPool}
                    isMissing={!row.hasPrePracticeTemplate || row.prePracticeQuestionPool === 0}
                  />
                  <InventoryRow
                    label="High-yield Topics"
                    count={row.highYieldTopics}
                    isMissing={row.highYieldTopics === 0 && row.topics > 0}
                    trackId={row.trackId}
                    generateTab="high-yield"
                  />
                  <InventoryRow
                    label="System Bundles"
                    count={row.bundles}
                    isMissing={row.bundles === 0 && row.systems > 0}
                  />
                </div>

                {miss && (
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                      Missing content
                    </h3>
                    <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                      {miss.systemsWithoutQuestions.length > 0 && (
                        <li className="flex items-center gap-2">
                          <Link href={`/admin/questions?trackId=${row.trackId}`} className="text-indigo-600 hover:underline">
                            {miss.systemsWithoutQuestions.length} system(s) without questions
                          </Link>
                          <Link
                            href={buildAIFactoryUrl({ tab: "questions", trackId: row.trackId })}
                            className="inline-flex items-center gap-1 text-indigo-600 hover:underline font-medium"
                          >
                            {Icons.sparkles} Generate
                          </Link>
                        </li>
                      )}
                      {miss.systemsWithoutGuides.length > 0 && (
                        <li className="flex items-center gap-2">
                          <Link href={`/admin/study-guides?trackId=${row.trackId}`} className="text-indigo-600 hover:underline">
                            {miss.systemsWithoutGuides.length} system(s) without guides
                          </Link>
                          <Link
                            href={buildAIFactoryUrl({ tab: "study-guides", trackId: row.trackId })}
                            className="inline-flex items-center gap-1 text-indigo-600 hover:underline font-medium"
                          >
                            {Icons.sparkles} Generate
                          </Link>
                        </li>
                      )}
                      {miss.systemsWithoutVideos.length > 0 && (
                        <li>
                          <Link href={`/admin/videos?trackId=${row.trackId}`} className="text-indigo-600 hover:underline">
                            {miss.systemsWithoutVideos.length} system(s) without videos
                          </Link>
                        </li>
                      )}
                      {miss.systemsWithoutDecks.length > 0 && (
                        <li className="flex items-center gap-2">
                          <Link href={`/admin/flashcards?trackId=${row.trackId}`} className="text-indigo-600 hover:underline">
                            {miss.systemsWithoutDecks.length} system(s) without decks
                          </Link>
                          <Link
                            href={buildAIFactoryUrl({ tab: "flashcards", trackId: row.trackId })}
                            className="inline-flex items-center gap-1 text-indigo-600 hover:underline font-medium"
                          >
                            {Icons.sparkles} Generate
                          </Link>
                        </li>
                      )}
                      {miss.systemExamsBelowMin.length > 0 && (
                        <li>
                          {miss.systemExamsBelowMin.length} system(s) below {SYSTEM_EXAM_PRACTICE_IDEAL_QUESTIONS} questions
                        </li>
                      )}
                      {!miss.hasPrePracticeTemplate && (
                        <li>No pre-practice template</li>
                      )}
                    </ul>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-4">
        <Link
          href="/admin/missing-content"
          className="inline-flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          View full missing content report →
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
