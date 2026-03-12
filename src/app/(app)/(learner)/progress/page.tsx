import { getSessionUser } from "@/lib/auth/session";
import { getPrimaryTrack } from "@/lib/auth/track";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatBlock } from "@/components/ui/StatBlock";
import { Badge } from "@/components/ui/Badge";
import {
  loadMasteryData,
  loadReadinessScore,
  loadDashboardStats,
  loadPerformanceTrends,
} from "@/lib/dashboard/loaders";
import { countTotalQuestionsAnswered } from "@/lib/analytics/loaders";
import { PerformanceTrendCard } from "@/components/dashboard/PerformanceTrendCard";

export default async function ProgressPage() {
  const user = await getSessionUser();
  const primary = await getPrimaryTrack(user?.id ?? null);
  const trackId = primary?.trackId ?? null;
  const track = primary?.trackSlug ?? "rn";
  const profile = user ? await (await import("@/lib/auth/profile")).getProfile(user.id) : null;
  const studyMinutesGoal = profile?.study_minutes_per_day ?? 0;

  const [mastery, stats, trends] = await Promise.all([
    loadMasteryData(user?.id ?? null, trackId),
    loadDashboardStats(user?.id ?? null, trackId, studyMinutesGoal),
    loadPerformanceTrends(user?.id ?? null, trackId, 14),
  ]);

  const { score } = await loadReadinessScore(user?.id ?? null, trackId, mastery);
  const totalQuestions = countTotalQuestionsAnswered(mastery);
  const hasActivity = totalQuestions > 0;

  const systems = mastery.systems.map((r) => ({
    name: r.entityName,
    pct: r.total > 0 ? Math.round((r.correct / r.total) * 100) : 0,
    track: track as "lvn" | "rn" | "fnp" | "pmhnp",
  }));

  const studyConsistency =
    stats.streakDays > 0
      ? `${stats.streakDays} day streak`
      : hasActivity
        ? "Build a streak by studying daily"
        : "Start studying to build consistency";

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        Progress
      </h1>
      <p className="text-slate-600 dark:text-slate-400">
        Track your readiness, questions answered, and performance over time.
        {primary && ` — ${track.toUpperCase()} track`}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatBlock
          label="Overall Readiness"
          value={hasActivity ? `${score}%` : "No data yet"}
          subtext={hasActivity ? "Target: 80%" : "Answer questions to build readiness"}
        />
        <StatBlock label="Questions Answered" value={String(totalQuestions)} subtext={hasActivity ? "All time" : "Answer questions to see progress"} />
        <StatBlock label="Study Streak" value={`${stats.streakDays} days`} subtext={studyConsistency} />
        <StatBlock label="Study Minutes Today" value={String(stats.studyMinutesToday)} subtext={stats.studyMinutesGoal > 0 ? `of ${stats.studyMinutesGoal} goal` : "Set a goal in profile"} />
      </div>

      <PerformanceTrendCard points={trends} emptyMessage="No activity in the last 14 days" />

      <Card>
        <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-6">
          By System
        </h2>
        <div className="space-y-6">
          {systems.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-500 dark:text-slate-400">
                No activity yet for your track.
              </p>
              <p className="text-sm text-slate-400 mt-1">
                Answer practice questions or take an exam to see system-level progress.
              </p>
            </div>
          ) : (
            systems.map((sys) => (
              <div key={sys.name}>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-slate-900 dark:text-white">
                    {sys.name}
                  </span>
                  <Badge track={sys.track} size="sm">
                    {sys.pct}%
                  </Badge>
                </div>
                <ProgressBar value={sys.pct} trackSlug={sys.track} size="md" />
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
