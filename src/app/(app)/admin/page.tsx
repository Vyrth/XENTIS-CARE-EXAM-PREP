import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Icons } from "@/components/ui/icons";
import { loadAdminOverviewMetrics } from "@/lib/admin/overview-loaders";
import { ResetContentButton } from "@/components/admin/ResetContentButton";

export default async function AdminOverviewPage() {
  const metrics = await loadAdminOverviewMetrics();

  const tiles = [
    { href: "/admin/ai-factory", label: "AI Content Factory", icon: Icons.sparkles },
    { href: "/admin/autonomous-operations", label: "Autonomous Operations", icon: Icons.layers },
    { href: "/admin/curriculum", label: "Curriculum", icon: Icons.book },
    { href: "/admin/questions", label: "Questions", icon: Icons["help-circle"] },
    { href: "/admin/study-guides", label: "Study Guides", icon: Icons["book-open"] },
    { href: "/admin/videos", label: "Videos", icon: Icons.video },
    { href: "/admin/flashcards", label: "Flashcards", icon: Icons.notebook },
    { href: "/admin/system-bundles", label: "Bundles", icon: Icons.layers },
    {
      href: "/admin/review-queue",
      label: "Review Queue",
      value: metrics.inReviewCount,
      icon: Icons.inbox,
    },
    {
      href: "/admin/publish-queue",
      label: "Publish Queue",
      value: metrics.readyToPublishCount,
      icon: Icons.send,
    },
    { href: "/admin/batch-planner", label: "Batch Planner", icon: Icons["clipboard-list"] },
    { href: "/admin/content-inventory", label: "Content Inventory", icon: Icons["bar-chart"] },
    { href: "/admin/launch-readiness", label: "Launch Readiness", icon: Icons["file-check"] },
    { href: "/admin/blueprint-coverage", label: "Blueprint Coverage", icon: Icons["bar-chart"] },
    { href: "/admin/missing-content", label: "Missing Content", icon: Icons["help-circle"] },
    { href: "/admin/issue-reports", label: "Issue Reports", icon: Icons.inbox },
    { href: "/admin/analytics", label: "Analytics", icon: Icons["bar-chart"] },
  ];

  const bp = metrics.batchPlans;
  const hasBatchActivity = bp.pending + bp.running + bp.completed + bp.failed > 0;
  const hasRecentErrors = metrics.recentErrors.length > 0;
  const hasLowCoverage = metrics.lowestCoverage.some((r) => r.questionCount < 20);

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
            Admin Overview
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Content management, workflow, and platform administration. All metrics are live from Supabase.
          </p>
        </div>
        <ResetContentButton />
      </div>

      {/* Learner metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card padding="sm">
          <p className="text-sm text-slate-500">Total learners</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {metrics.learner.totalLearners}
          </p>
        </Card>
        <Card padding="sm">
          <p className="text-sm text-slate-500">Active (7d)</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {metrics.learner.activeLearners7d}
          </p>
        </Card>
        <Card padding="sm">
          <p className="text-sm text-slate-500">Sessions completed (7d)</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {metrics.learner.completedSessions7d}
          </p>
        </Card>
        <Card padding="sm">
          <p className="text-sm text-slate-500">Questions answered (7d)</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {metrics.learner.questionsAnswered7d}
          </p>
        </Card>
      </div>

      {/* Workflow metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card padding="sm">
          <p className="text-sm text-slate-500">Draft items</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {metrics.draftCount}
          </p>
        </Card>
        <Card padding="sm">
          <p className="text-sm text-slate-500">In review</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {metrics.inReviewCount}
          </p>
        </Card>
        <Card padding="sm">
          <p className="text-sm text-slate-500">Ready to publish</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {metrics.readyToPublishCount}
          </p>
        </Card>
        <Card padding="sm">
          <p className="text-sm text-slate-500">Failed batches</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {bp.failed}
          </p>
        </Card>
      </div>

      {/* Content counts by track */}
      {metrics.inventory.length > 0 && (
        <Card padding="none">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="font-semibold text-slate-900 dark:text-white">
              Content by track
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Approved/published counts per track
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Track</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500">Questions</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500">Guides</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500">Decks</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500">Cards</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500">Videos</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500">High-yield</th>
                </tr>
              </thead>
              <tbody>
                {metrics.inventory.map((row) => (
                  <tr
                    key={row.trackId}
                    className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <td className="p-4 font-medium text-slate-900 dark:text-white">
                      <Link
                        href={`/admin/content-inventory?trackId=${row.trackId}`}
                        className="hover:text-indigo-600 dark:hover:text-indigo-400"
                      >
                        {row.trackName}
                      </Link>
                    </td>
                    <td className="p-4 text-right tabular-nums text-slate-700 dark:text-slate-300">
                      {row.questionsApproved}
                    </td>
                    <td className="p-4 text-right tabular-nums text-slate-700 dark:text-slate-300">
                      {row.studyGuidesApproved}
                    </td>
                    <td className="p-4 text-right tabular-nums text-slate-700 dark:text-slate-300">
                      {row.flashcardDecks}
                    </td>
                    <td className="p-4 text-right tabular-nums text-slate-700 dark:text-slate-300">
                      {row.flashcardCards}
                    </td>
                    <td className="p-4 text-right tabular-nums text-slate-700 dark:text-slate-300">
                      {row.videosApproved}
                    </td>
                    <td className="p-4 text-right tabular-nums text-slate-700 dark:text-slate-300">
                      {row.highYieldContent ?? row.highYieldTopics}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Generation queue health */}
      {hasBatchActivity && (
        <Card padding="none">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="font-semibold text-slate-900 dark:text-white">
              Generation queue health
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Batch plans and AI campaigns
            </p>
          </div>
          <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-slate-500">Batch plans pending</p>
              <p className="text-xl font-semibold text-slate-900 dark:text-white">
                {bp.pending}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Batch plans running</p>
              <p className="text-xl font-semibold text-slate-900 dark:text-white">
                {bp.running}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Batch plans completed</p>
              <p className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">
                {bp.completed}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Campaigns active</p>
              <p className="text-xl font-semibold text-slate-900 dark:text-white">
                {metrics.campaigns.active}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Recent errors (dead-letter) */}
      {hasRecentErrors && (
        <Card padding="none">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">
                Recent batch errors
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Last {metrics.recentErrors.length} error log entries
              </p>
            </div>
            <Link
              href="/admin/ai-factory"
              className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              AI Factory →
            </Link>
          </div>
          <div className="overflow-x-auto max-h-48 overflow-y-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left p-3 text-xs font-medium text-slate-500">Time</th>
                  <th className="text-left p-3 text-xs font-medium text-slate-500">Message</th>
                  <th className="text-left p-3 text-xs font-medium text-slate-500">Code</th>
                </tr>
              </thead>
              <tbody>
                {metrics.recentErrors.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b border-slate-100 dark:border-slate-800 text-sm"
                  >
                    <td className="p-3 text-slate-500 whitespace-nowrap">
                      {new Date(e.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3 text-slate-700 dark:text-slate-300 max-w-xs truncate">
                      {e.message || "—"}
                    </td>
                    <td className="p-3 text-rose-600 dark:text-rose-400 font-mono text-xs">
                      {e.errorCode ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Low coverage alert */}
      {hasLowCoverage && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-900/10">
          <div className="p-4">
            <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              {Icons.alertTriangle}
              Lowest coverage systems
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Systems with fewest approved questions
            </p>
            <ul className="mt-3 space-y-1 text-sm">
              {metrics.lowestCoverage
                .filter((r) => r.questionCount < 20)
                .slice(0, 5)
                .map((r) => (
                  <li key={`${r.trackSlug}-${r.systemName}`}>
                    <span className="font-medium">{r.systemName}</span>
                    <span className="text-slate-500"> ({r.trackSlug.toUpperCase()})</span>
                    <span className="text-slate-600 dark:text-slate-400">
                      {" "}
                      — {r.questionCount} questions
                    </span>
                  </li>
                ))}
            </ul>
            <Link
              href="/admin/missing-content"
              className="inline-block mt-3 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              View missing content →
            </Link>
          </div>
        </Card>
      )}

      {/* Navigation tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tiles.map((tile) => (
          <Link key={tile.href} href={tile.href}>
            <Card className="hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors cursor-pointer h-full">
              <div className="flex items-center gap-3">
                <span className="text-slate-400">{tile.icon}</span>
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">{tile.label}</p>
                  {tile.value !== undefined && (
                    <p className="text-sm text-slate-500">{tile.value} items</p>
                  )}
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
