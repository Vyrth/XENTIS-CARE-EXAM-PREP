import { getSessionUser } from "@/lib/auth/session";
import { getProfile } from "@/lib/auth/profile";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatBlock } from "@/components/ui/StatBlock";
import { ActionTile } from "@/components/ui/ActionTile";
import { DashboardReadinessClient } from "@/components/dashboard/DashboardReadinessClient";
import { HighYieldStudyFeed } from "@/components/high-yield/HighYieldStudyFeed";
import { WeakAreaOverlay } from "@/components/high-yield/WeakAreaOverlay";
import { Icons } from "@/components/ui/icons";
import { computeReadinessScore } from "@/lib/readiness/readiness-score";
import { MOCK_READINESS_INPUTS } from "@/data/mock/readiness";
import { MOCK_RAW_SYSTEM_PERFORMANCE } from "@/data/mock/readiness";
import { getHighYieldTopics } from "@/lib/high-yield";
import { rollupBySystem, getWeakRollups } from "@/lib/readiness";
import {
  MOCK_TOPIC_BLUEPRINT,
  MOCK_BLUEPRINT_BY_TRACK,
  MOCK_TELEMETRY,
  MOCK_STUDENT_SIGNAL,
} from "@/data/mock/high-yield";
import { MOCK_TOPICS, MOCK_SYSTEMS } from "@/data/mock/systems";
import type { TrackSlug } from "@/data/mock/types";

function trackIdToSlug(trackId: string | null): TrackSlug {
  if (!trackId) return "rn";
  const map: Record<string, TrackSlug> = { lvn: "lvn", rn: "rn", fnp: "fnp", pmhnp: "pmhnp" };
  return map[trackId] ?? "rn";
}

export default async function DashboardPage() {
  const user = await getSessionUser();
  const profile = user ? await getProfile(user.id) : null;
  const track = trackIdToSlug(profile?.primary_exam_track_id ?? null);

  const readinessScore = computeReadinessScore(MOCK_READINESS_INPUTS);

  const topicsWithSystem = MOCK_TOPICS.map((t) => ({
    id: t.id,
    name: t.name,
    systemId: t.systemId,
    systemName: MOCK_SYSTEMS.find((s) => s.id === t.systemId)?.name ?? t.systemId,
  }));
  const highYieldTopics = getHighYieldTopics(track, {
    topicBlueprint: MOCK_TOPIC_BLUEPRINT,
    systemBlueprint: MOCK_BLUEPRINT_BY_TRACK[track] ?? MOCK_BLUEPRINT_BY_TRACK.rn,
    telemetry: MOCK_TELEMETRY,
    studentSignal: MOCK_STUDENT_SIGNAL,
    topics: topicsWithSystem,
  });

  const systemRollups = rollupBySystem(MOCK_RAW_SYSTEM_PERFORMANCE);
  const weakSystems = getWeakRollups(systemRollups);
  const hyScoreBySystem = new Map<string, number>();
  for (const t of highYieldTopics) {
    const current = hyScoreBySystem.get(t.systemId) ?? 0;
    if (t.score > current) hyScoreBySystem.set(t.systemId, t.score);
  }

  const stats = [
    { label: "Questions Today", value: "12", subtext: "+3 from yesterday", trend: "up" as const },
    { label: "Study Minutes", value: "45", subtext: "of 60 goal" },
    { label: "Current Streak", value: "5 days", subtext: "Keep it up!" },
    {
      label: "Readiness Score",
      value: `${readinessScore}%`,
      subtext: `Target: 80%${readinessScore < 80 ? ` (${80 - readinessScore}% to go)` : ""}`,
    },
  ];

  const quickActions = [
    {
      href: "/questions",
      title: "Practice Questions",
      description: "10 new questions in Cardiovascular",
      icon: Icons["help-circle"],
      badge: "RN",
      trackColor: "rn" as const,
    },
    {
      href: "/pre-practice",
      title: "Pre-Practice Exam",
      description: "150 questions, 3 hours",
      icon: Icons["file-check"],
      trackColor: "lvn" as const,
    },
    {
      href: "/study-guides",
      title: "Study Guides",
      description: "Respiratory system — 3 sections left",
      icon: Icons["book-open"],
      trackColor: "fnp" as const,
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
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickActions.map((action) => (
            <ActionTile key={action.href} {...action} />
          ))}
        </div>
      </div>

      <DashboardReadinessClient />

      {weakSystems.length > 0 && (
        <WeakAreaOverlay
          weakAreas={weakSystems}
          highYieldScores={hyScoreBySystem}
          maxItems={3}
        />
      )}

      <HighYieldStudyFeed topics={highYieldTopics} track={track} maxItems={5} />
    </div>
  );
}
