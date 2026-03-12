import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getProfile } from "@/lib/auth/profile";
import { getPrimaryTrack, requirePrimaryTrack, clearOrphanedPrimaryTrack } from "@/lib/auth/track";
import { Card } from "@/components/ui/Card";
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
    const pathname = (await headers()).get("x-pathname") ?? "";
    if (process.env.NODE_ENV === "development") {
      console.log("[dashboard] redirect: no valid primary track", {
        pathname,
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
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
          Dashboard
        </h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Welcome back{profile?.full_name ? `, ${profile.full_name}` : ""}
          {primary ? ` — ${track.toUpperCase()} track` : ""}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
        <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
          Continue Learning
        </h2>
        {continueLearningCards.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <Card>
            <div className="text-center py-8">
              <p className="text-slate-500 dark:text-slate-400">
                No recommendations yet. Explore practice questions and study guides to get started.
              </p>
              <a
                href="/questions"
                className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                Practice questions
              </a>
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
        <Card>
          <div className="text-center py-8">
            <p className="text-slate-500 dark:text-slate-400">
              High-yield topics will appear here as content is added for {getTrackDisplayName(track)}.
            </p>
            <p className="text-sm text-slate-400 mt-1">
              Focus on practice questions and study guides to build your readiness.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
