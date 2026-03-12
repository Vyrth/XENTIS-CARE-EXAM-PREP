import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { loadAdminAnalytics, loadQuestionUsageBySystem } from "@/lib/admin/analytics-loaders";
import { Suspense } from "react";

function formatNumber(n: number): string {
  return n.toLocaleString();
}

async function AnalyticsContent() {
  const [analytics, systemUsage] = await Promise.all([
    loadAdminAnalytics(),
    loadQuestionUsageBySystem(),
  ]);

  const { learner, contentUsage, byTrack, weakSystems, strongSystems, operational } = analytics;

  const metrics = [
    { label: "Total learners", value: formatNumber(learner.totalLearners) },
    { label: "Active learners (7d)", value: formatNumber(learner.activeLearners7d) },
    { label: "Questions answered (7d)", value: formatNumber(learner.questionsAnswered7d) },
    { label: "Completed sessions (7d)", value: formatNumber(learner.completedExamSessions7d) },
    { label: "Avg score", value: learner.averageScorePct != null ? `${learner.averageScorePct}%` : "—" },
    { label: "Avg readiness", value: learner.averageReadinessPct != null ? `${learner.averageReadinessPct}%` : "—" },
  ];

  const contentMetrics = [
    { label: "Questions", value: formatNumber(contentUsage.questions) },
    { label: "Flashcards", value: formatNumber(contentUsage.flashcards) },
    { label: "Study guides", value: formatNumber(contentUsage.studyGuides) },
    { label: "Videos", value: formatNumber(contentUsage.videos) },
    { label: "High-yield", value: formatNumber(contentUsage.highYield) },
  ];

  const hasSystemUsage = systemUsage.length > 0;

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        Analytics Review Console
      </h1>
      <p className="text-slate-600 dark:text-slate-400">
        Platform usage, content performance, and engagement metrics from real learner activity.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {metrics.map((m) => (
          <Card key={m.label} padding="sm">
            <p className="text-sm text-slate-500">{m.label}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{m.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-6">
            Content Usage by Type
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {contentMetrics.map((m) => (
              <div key={m.label} className="text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{m.value}</p>
                <p className="text-xs text-slate-500 mt-1">{m.label}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-6">
            Track Breakdown
          </h2>
          {byTrack.length === 0 ? (
            <p className="text-slate-500 text-sm">No track data yet.</p>
          ) : (
            <div className="space-y-3">
              {byTrack.map((t) => (
                <div key={t.trackId} className="flex justify-between items-center text-sm">
                  <span className="font-medium">{t.trackName}</span>
                  <span className="text-slate-600 dark:text-slate-400">
                    {t.learners} learners · {t.questionsAnswered} answered · {t.completedSessions} sessions
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-6">
          Question Usage by System
        </h2>
        {!hasSystemUsage ? (
          <p className="text-slate-500 text-sm">No question usage data yet.</p>
        ) : (
          <div className="space-y-4">
            {systemUsage.map((s) => (
              <div key={s.name}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-600 dark:text-slate-400">{s.name}</span>
                  <span className="font-medium">{s.pct}% ({formatNumber(s.total)} answers)</span>
                </div>
                <ProgressBar value={s.pct} size="sm" />
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
            Top Weak Systems (across learners)
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
            Systems with &lt;65% accuracy. Consider content review or remediation.
          </p>
          {weakSystems.length === 0 ? (
            <p className="text-slate-500 text-sm">No weak systems identified yet (need ≥5 answers per system).</p>
          ) : (
            <div className="space-y-2">
              {weakSystems.slice(0, 8).map((s) => (
                <div key={s.systemId} className="flex justify-between text-sm">
                  <span>{s.systemName}</span>
                  <span className="text-red-600 dark:text-red-400">{s.percentCorrect}% ({s.correct}/{s.total})</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
            Top Strong Systems (across learners)
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
            Systems with ≥80% accuracy.
          </p>
          {strongSystems.length === 0 ? (
            <p className="text-slate-500 text-sm">No strong systems identified yet (need ≥5 answers per system).</p>
          ) : (
            <div className="space-y-2">
              {strongSystems.slice(0, 8).map((s) => (
                <div key={s.systemId} className="flex justify-between text-sm">
                  <span>{s.systemName}</span>
                  <span className="text-emerald-600 dark:text-emerald-400">{s.percentCorrect}% ({s.correct}/{s.total})</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-6">
          Operational Analytics (AI Factory)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            <p className="text-sm text-slate-500">Batch jobs</p>
            <p className="text-lg font-semibold">
              P: {operational.batchJobs.pending} · R: {operational.batchJobs.running} · C: {operational.batchJobs.completed} · F: {operational.batchJobs.failed}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            <p className="text-sm text-slate-500">Campaigns</p>
            <p className="text-lg font-semibold">
              Active: {operational.campaigns.active} · Completed: {operational.campaigns.completed}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            <p className="text-sm text-slate-500">Shards</p>
            <p className="text-lg font-semibold">
              Total: {operational.shards.total} · Done: {operational.shards.completed} · Failed: {operational.shards.failed}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            <p className="text-sm text-slate-500">Recent (7d)</p>
            <p className="text-lg font-semibold">
              Errors: {operational.recentFailures} · Retries: {operational.retries24h}
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
          Content Performance
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          Top-performing questions, study guides, and videos. Identify content that needs improvement.
        </p>
        <p className="mt-4 text-slate-500 text-sm">
          Use weak/strong systems above and the question usage chart to prioritize content review.
        </p>
      </Card>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="p-6 lg:p-8 space-y-8 animate-pulse">
      <div className="h-8 w-64 bg-slate-200 dark:bg-slate-700 rounded" />
      <div className="h-4 w-96 bg-slate-200 dark:bg-slate-700 rounded" />
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-20 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        ))}
      </div>
      <div className="h-48 bg-slate-200 dark:bg-slate-700 rounded-lg" />
    </div>
  );
}

export default function AnalyticsReviewConsolePage() {
  return (
    <Suspense fallback={<AnalyticsSkeleton />}>
      <AnalyticsContent />
    </Suspense>
  );
}
