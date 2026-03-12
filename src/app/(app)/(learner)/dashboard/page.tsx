import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getProfile } from "@/lib/auth/profile";
import { getPrimaryTrack, requirePrimaryTrack, clearOrphanedPrimaryTrack } from "@/lib/auth/track";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatBlock } from "@/components/ui/StatBlock";
import { ActionTile } from "@/components/ui/ActionTile";
import { DashboardReadinessClient } from "@/components/dashboard/DashboardReadinessClient";
import { PerformanceTrendCard } from "@/components/dashboard/PerformanceTrendCard";
import { HighYieldStudyFeed } from "@/components/high-yield/HighYieldStudyFeed";
import { WeakAreaOverlay } from "@/components/high-yield/WeakAreaOverlay";
import { Icons } from "@/components/ui/icons";
import { rollupBySystem, rollupByDomain, getWeakRollups } from "@/lib/readiness";
import {
  loadDashboardStats,
  loadReadinessScore,
  loadMasteryData,
  loadHighYieldTopics,
  loadStudyWorkflowRecommendations,
  loadLastPrePracticeDate,
  loadPerformanceTrends,
} from "@/lib/dashboard/loaders";
import { getTrackDisplayName } from "@/lib/high-yield/track-display";
import { getReadinessBandInfo } from "@/lib/readiness/readiness-score";

export default async function DashboardPage() {
  if (process.env.NODE_ENV === "development") {
    console.log("[dashboard] server render start");
  }
  const user = await getSessionUser();
  const profile = user ? await getProfile(user.id) : null;
  // Layout redirects when !profile.primary_exam_track_id. Dashboard also redirects when
  // track is orphaned (primary_exam_track_id doesn't exist in exam_tracks after migration).
  let primary = await getPrimaryTrack(user?.id ?? null);
  if (!primary) {
    primary = user?.id ? await requirePrimaryTrack(user.id) : null;
  }
  // Redirect when no valid track: no primary, or orphaned track (trackId empty = FK doesn't exist in exam_tracks)
  if (!primary || !primary.trackId) {
    if (process.env.NODE_ENV === "development") {
      console.log("[dashboard] redirect: no valid primary track", {
        hasProfileTrack: !!profile?.primary_exam_track_id,
        primaryTrackId: primary?.trackId ?? "none",
      });
    }
    // Clear orphaned FK so layout redirects correctly on next load (migration recovery)
    if (user?.id && profile?.primary_exam_track_id) {
      await clearOrphanedPrimaryTrack(user.id);
    }
    redirect("/onboarding");
  }
  const track = primary.trackSlug;
  const trackId = primary.trackId;
  const userId = user?.id ?? null;

  if (process.env.NODE_ENV === "development") {
    console.log("[dashboard] selectedTrack", { track, trackId, userId: userId?.slice(0, 8) });
  }

  const studyMinutesGoal = profile?.study_minutes_per_day ?? 0;

  const [stats, masteryResult, highYieldTopics, continueLearningCards, lastPrePracticeDate, performanceTrends] =
    await Promise.all([
      loadDashboardStats(userId, trackId, studyMinutesGoal),
      loadMasteryData(userId, trackId),
      loadHighYieldTopics(trackId, track, 10),
      loadStudyWorkflowRecommendations(userId, trackId, track),
      loadLastPrePracticeDate(userId, trackId),
      loadPerformanceTrends(userId, trackId, 7),
    ]);

  const mastery = masteryResult;
  const readinessResult = await loadReadinessScore(userId, trackId, mastery);
  const readinessScore = readinessResult.score;
  const readinessInfo = getReadinessBandInfo(readinessScore);

  const hasActivity =
    mastery.systems.some((r) => r.total > 0) ||
    mastery.domains.some((r) => r.total > 0) ||
    mastery.skills.some((r) => r.total > 0) ||
    mastery.itemTypes.some((r) => r.total > 0);

  const systemRollups = rollupBySystem(mastery.systems);
  const domainRollups = rollupByDomain(mastery.domains);
  const weakSystems = getWeakRollups(systemRollups);
  const weakDomains = getWeakRollups(domainRollups);
  const hyScoreBySystem = new Map<string, number>();
  for (const t of highYieldTopics) {
    const current = hyScoreBySystem.get(t.systemId) ?? 0;
    if (t.score > current) hyScoreBySystem.set(t.systemId, t.score);
  }

  const questionsTrend =
    stats.questionsYesterday > 0
      ? stats.questionsToday > stats.questionsYesterday
        ? ("up" as const)
        : stats.questionsToday < stats.questionsYesterday
          ? ("down" as const)
          : undefined
      : undefined;
  const questionsSubtext =
    stats.questionsYesterday > 0
      ? stats.questionsToday > stats.questionsYesterday
        ? `+${stats.questionsToday - stats.questionsYesterday} from yesterday`
        : stats.questionsToday < stats.questionsYesterday
          ? `${stats.questionsToday - stats.questionsYesterday} from yesterday`
          : "Same as yesterday"
      : "Start practicing to see progress";

  const statsBlocks = [
    {
      label: "Questions Today",
      value: String(stats.questionsToday),
      subtext: questionsSubtext,
      trend: questionsTrend,
    },
    {
      label: "Study Minutes",
      value: String(stats.studyMinutesToday),
      subtext: stats.studyMinutesGoal > 0 ? `of ${stats.studyMinutesGoal} goal` : "Set a goal in profile",
    },
    {
      label: "Current Streak",
      value: stats.streakDays === 0 ? "0 days" : `${stats.streakDays} day${stats.streakDays === 1 ? "" : "s"}`,
      subtext: stats.streakDays > 0 ? "Keep it up!" : "Start studying to build your streak",
    },
    {
      label: "Readiness Score",
      value: readinessScore === 0 && !hasActivity ? "No data yet" : `${readinessScore}%`,
      subtext: readinessScore === 0 && !hasActivity ? "Answer questions to build readiness" : `Target: 80%${readinessScore < 80 ? ` (${80 - readinessScore}% to go)` : ""}`,
    },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
            Dashboard
          </h1>
          <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
            Welcome back{profile?.full_name ? `, ${profile.full_name}` : ""}
          </p>
          {primary && (
            <Badge variant="default" size="sm" className="mt-2">
              {track.toUpperCase()} track
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statsBlocks.map((stat) => (
          <StatBlock
            key={stat.label}
            label={stat.label}
            value={stat.value}
            subtext={stat.subtext}
            trend={stat.trend}
          />
        ))}
      </div>

      <div>
        <h2 className="font-heading text-xl font-semibold text-slate-900 dark:text-white mb-5">
          Continue Learning
        </h2>
        {continueLearningCards.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {continueLearningCards.map((action) => (
              <ActionTile
                key={action.href + action.title}
                href={action.href}
                title={action.title}
                description={action.description}
                icon={Icons[action.iconKey as keyof typeof Icons]}
                badge={action.badge}
                trackColor={action.trackColor}
              />
            ))}
          </div>
        ) : (
          <Card variant="elevated" className="overflow-hidden rounded-card-lg">
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/15 to-violet-500/15 dark:from-indigo-400/20 dark:to-violet-400/20 flex items-center justify-center mb-4 [&>svg]:w-8 [&>svg]:h-8 text-indigo-600 dark:text-indigo-400">
                {Icons["sparkles"]}
              </div>
              <h3 className="font-heading text-lg font-semibold text-slate-900 dark:text-white">
                No recommendations yet
              </h3>
              <p className="mt-2 text-slate-600 dark:text-slate-400 max-w-sm">
                Explore practice questions and study guides to get started and build your readiness.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 justify-center">
                <Link
                  href="/questions"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-300"
                >
                  Practice questions
                  {Icons.chevronRight}
                </Link>
                <Link
                  href="/study-guides"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-300"
                >
                  Study guides
                </Link>
                <Link
                  href="/pre-practice"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-300"
                >
                  Pre-practice exam
                </Link>
              </div>
            </div>
          </Card>
        )}
      </div>

      <DashboardReadinessClient
        readinessScore={readinessScore}
        readinessBand={readinessInfo.label}
        readinessColor={readinessInfo.color as "red" | "amber" | "emerald" | "green"}
        masteryData={mastery}
        trackSlug={track}
        lastPrePracticeDate={lastPrePracticeDate}
        hasActivity={hasActivity}
      />

      <PerformanceTrendCard points={performanceTrends} />

      {weakSystems.length > 0 && (
        <WeakAreaOverlay
          weakAreas={weakSystems}
          highYieldScores={hyScoreBySystem}
          getPracticeHref={(id, type) =>
            type === "system"
              ? `/questions/system/${mastery.systemSlugMap[id] ?? id}`
              : `/questions?domain=${mastery.domainSlugMap[id] ?? id}`
          }
          maxItems={3}
          userId={userId}
          examTrack={track}
          weakSystems={weakSystems.map((s) => ({ name: s.name, percent: s.percent }))}
          weakDomains={weakDomains.map((d) => ({ name: d.name, percent: d.percent }))}
        />
      )}

      {highYieldTopics.length > 0 ? (
        <HighYieldStudyFeed topics={highYieldTopics} track={track} maxItems={5} />
      ) : (
        <Card variant="elevated" className="overflow-hidden rounded-card-lg">
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/15 to-cyan-500/15 dark:from-amber-400/20 dark:to-cyan-400/20 flex items-center justify-center mb-4 [&>svg]:w-8 [&>svg]:h-8 text-amber-600 dark:text-amber-400">
              {Icons["layers"]}
            </div>
            <h3 className="font-heading text-lg font-semibold text-slate-900 dark:text-white">
              High-yield topics coming soon
            </h3>
            <p className="mt-2 text-slate-600 dark:text-slate-400 max-w-sm">
              Content will appear here as it&apos;s added for {getTrackDisplayName(track)}.
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-500">
              Focus on practice questions and study guides to build your readiness.
            </p>
            <Link
              href="/questions"
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-300"
            >
              Practice questions
              {Icons.chevronRight}
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
