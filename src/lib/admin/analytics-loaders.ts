/**
 * Admin analytics loaders - real learner activity and operational metrics.
 * No mock data. Uses service client for full access.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";

export interface AdminLearnerMetrics {
  totalLearners: number;
  activeLearners7d: number;
  completedExamSessions: number;
  completedExamSessions7d: number;
  questionsAnswered: number;
  questionsAnswered7d: number;
  averageScorePct: number | null;
  averageReadinessPct: number | null;
}

export interface AdminContentUsage {
  questions: number;
  flashcards: number;
  studyGuides: number;
  videos: number;
  highYield: number;
}

export interface AdminTrackMetrics {
  trackId: string;
  trackSlug: string;
  trackName: string;
  learners: number;
  activeLearners7d: number;
  questionsAnswered: number;
  completedSessions: number;
  averageScorePct: number | null;
}

export interface AdminSystemPerformance {
  trackSlug: string;
  systemId: string;
  systemName: string;
  correct: number;
  total: number;
  percentCorrect: number;
  type: "weak" | "strong" | "neutral";
}

export interface AdminOperationalMetrics {
  batchJobs: { pending: number; running: number; completed: number; failed: number };
  campaigns: { active: number; completed: number };
  shards: { total: number; completed: number; failed: number };
  recentFailures: number;
  retries24h: number;
}

export interface AdminAnalyticsData {
  learner: AdminLearnerMetrics;
  contentUsage: AdminContentUsage;
  byTrack: AdminTrackMetrics[];
  weakSystems: AdminSystemPerformance[];
  strongSystems: AdminSystemPerformance[];
  operational: AdminOperationalMetrics;
}

async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    if (!isSupabaseServiceRoleConfigured()) return fallback;
    return await fn();
  } catch {
    return fallback;
  }
}

function sevenDaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString();
}

/** Total learners = profiles with primary_exam_track_id */
async function loadTotalLearners(): Promise<number> {
  return safeQuery(async () => {
    const supabase = createServiceClient();
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .not("primary_exam_track_id", "is", null);
    return count ?? 0;
  }, 0);
}

/** Active learners = distinct user_id from exam_sessions or user_question_attempts in last 7d */
async function loadActiveLearners7d(): Promise<number> {
  return safeQuery(async () => {
    const supabase = createServiceClient();
    const since = sevenDaysAgo();
    const userIds = new Set<string>();
    const { data: sessions } = await supabase
      .from("exam_sessions")
      .select("user_id")
      .gte("started_at", since);
    for (const s of sessions ?? []) {
      if (s.user_id) userIds.add(s.user_id);
    }
    const { data: attempts } = await supabase
      .from("user_question_attempts")
      .select("user_id")
      .gte("created_at", since);
    for (const a of attempts ?? []) {
      if (a.user_id) userIds.add(a.user_id);
    }
    return userIds.size;
  }, 0);
}

/** Completed exam sessions (all time and 7d) */
async function loadCompletedSessions(): Promise<{ all: number; last7d: number }> {
  return safeQuery(async () => {
    const supabase = createServiceClient();
    const since = sevenDaysAgo();
    const { count: all } = await supabase
      .from("exam_sessions")
      .select("id", { count: "exact", head: true })
      .not("completed_at", "is", null);
    const { count: last7d } = await supabase
      .from("exam_sessions")
      .select("id", { count: "exact", head: true })
      .not("completed_at", "is", null)
      .gte("completed_at", since);
    return { all: all ?? 0, last7d: last7d ?? 0 };
  }, { all: 0, last7d: 0 });
}

/** Questions answered from exam_session_questions + user_question_attempts */
async function loadQuestionsAnswered(): Promise<{ all: number; last7d: number }> {
  return safeQuery(async () => {
    const supabase = createServiceClient();
    const since = sevenDaysAgo();
    let all = 0;
    let last7d = 0;
    const { data: sessions } = await supabase
      .from("exam_sessions")
      .select("id, started_at, completed_at");
    const sessionIds = (sessions ?? []).map((s) => s.id);
    if (sessionIds.length > 0) {
      const { count } = await supabase
        .from("exam_session_questions")
        .select("id", { count: "exact", head: true })
        .in("exam_session_id", sessionIds);
      all += count ?? 0;
      const sessionIds7d = (sessions ?? [])
        .filter((s) => new Date(s.started_at ?? 0) >= new Date(since))
        .map((s) => s.id);
      if (sessionIds7d.length > 0) {
        const { count: c7 } = await supabase
          .from("exam_session_questions")
          .select("id", { count: "exact", head: true })
          .in("exam_session_id", sessionIds7d);
        last7d += c7 ?? 0;
      }
    }
    const { count: uqaAll } = await supabase
      .from("user_question_attempts")
      .select("id", { count: "exact", head: true });
    all += uqaAll ?? 0;
    const { count: uqa7 } = await supabase
      .from("user_question_attempts")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since);
    last7d += uqa7 ?? 0;
    return { all, last7d };
  }, { all: 0, last7d: 0 });
}

/** Average score from completed exam sessions (scratchpad_data.results.percentCorrect) */
async function loadAverageScore(): Promise<number | null> {
  return safeQuery(async () => {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("exam_sessions")
      .select("scratchpad_data")
      .not("completed_at", "is", null);
    const scores = (data ?? [])
      .map((r) => (r.scratchpad_data as { results?: { percentCorrect?: number } })?.results?.percentCorrect)
      .filter((n): n is number => typeof n === "number");
    if (scores.length === 0) return null;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }, null);
}

/** Average readiness from user_readiness_snapshots */
async function loadAverageReadiness(): Promise<number | null> {
  return safeQuery(async () => {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("user_readiness_snapshots")
      .select("overall_score_pct")
      .order("snapshot_at", { ascending: false });
    const values = (data ?? [])
      .map((r) => (r.overall_score_pct != null ? Number(r.overall_score_pct) : null))
      .filter((n): n is number => typeof n === "number");
    if (values.length === 0) return null;
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  }, null);
}

/** Content usage: questions, flashcards, study guides, videos, high-yield (engagement counts) */
async function loadContentUsage(): Promise<AdminContentUsage> {
  return safeQuery(async () => {
    const supabase = createServiceClient();
    const [esqCount, uqaCount, fcCount, sgCount, vCount] = await Promise.all([
      supabase.from("exam_session_questions").select("id", { count: "exact", head: true }),
      supabase.from("user_question_attempts").select("id", { count: "exact", head: true }),
      supabase.from("user_flashcard_progress").select("id", { count: "exact", head: true }),
      supabase.from("study_material_progress").select("id", { count: "exact", head: true }).eq("completed", true),
      supabase.from("video_progress").select("id", { count: "exact", head: true }).eq("completed", true),
    ]);
    return {
      questions: (esqCount.count ?? 0) + (uqaCount.count ?? 0),
      flashcards: fcCount.count ?? 0,
      studyGuides: sgCount.count ?? 0,
      videos: vCount.count ?? 0,
      highYield: 0, // No high-yield engagement table yet
    };
  }, { questions: 0, flashcards: 0, studyGuides: 0, videos: 0, highYield: 0 });
}

/** Track-scoped metrics */
async function loadTrackMetrics(): Promise<AdminTrackMetrics[]> {
  return safeQuery(async () => {
    const supabase = createServiceClient();
    const since = sevenDaysAgo();
    const { data: tracks } = await supabase
      .from("exam_tracks")
      .select("id, slug, name")
      .order("display_order", { ascending: true });
    if (!tracks?.length) return [];

    const rows: AdminTrackMetrics[] = [];
    for (const t of tracks) {
      const { count: learners } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("primary_exam_track_id", t.id);
      const { data: sessions } = await supabase
        .from("exam_sessions")
        .select("id, user_id, started_at, completed_at, scratchpad_data")
        .eq("exam_track_id", t.id);
      const trackSessions = sessions ?? [];
      const sessionIds = trackSessions.map((s) => s.id);
      let questionsAnswered = 0;
      let completedSessions = 0;
      let totalScore = 0;
      let scoreCount = 0;
      const activeUserIds = new Set<string>();

      if (sessionIds.length > 0) {
        const { count } = await supabase
          .from("exam_session_questions")
          .select("id", { count: "exact", head: true })
          .in("exam_session_id", sessionIds);
        questionsAnswered += count ?? 0;
      }
      for (const s of trackSessions) {
        if (s.completed_at) completedSessions++;
        if (s.started_at && new Date(s.started_at) >= new Date(since) && s.user_id) {
          activeUserIds.add(s.user_id);
        }
        const pct = (s.scratchpad_data as { results?: { percentCorrect?: number } })?.results?.percentCorrect;
        if (typeof pct === "number") {
          totalScore += pct;
          scoreCount++;
        }
      }
      const { data: trackQuestions } = await supabase
        .from("questions")
        .select("id")
        .eq("exam_track_id", t.id);
      const trackQIds = (trackQuestions ?? []).map((q) => q.id);
      if (trackQIds.length > 0) {
        const { count: uqaCount } = await supabase
          .from("user_question_attempts")
          .select("id", { count: "exact", head: true })
          .in("question_id", trackQIds);
        questionsAnswered += uqaCount ?? 0;
      }

      rows.push({
        trackId: t.id,
        trackSlug: t.slug ?? "",
        trackName: t.name ?? t.slug ?? "",
        learners: learners ?? 0,
        activeLearners7d: activeUserIds.size,
        questionsAnswered,
        completedSessions,
        averageScorePct: scoreCount > 0 ? Math.round(totalScore / scoreCount) : null,
      });
    }
    return rows;
  }, []);
}

/** Load weak/strong systems across all learners from exam_session_questions + user_question_attempts */
async function loadSystemPerformance(
  type: "weak" | "strong"
): Promise<AdminSystemPerformance[]> {
  return safeQuery(async () => {
    const supabase = createServiceClient();
    const { data: sessions } = await supabase
      .from("exam_sessions")
      .select("id")
      .not("completed_at", "is", null);
    const sessionIds = (sessions ?? []).map((s) => s.id);
    const bySystem = new Map<string, { correct: number; total: number; trackId: string }>();

    if (sessionIds.length > 0) {
      const { data: esq } = await supabase
        .from("exam_session_questions")
        .select("question_id, is_correct")
        .in("exam_session_id", sessionIds);
      const qIds = [...new Set((esq ?? []).map((e) => e.question_id))];
      if (qIds.length > 0) {
        const { data: qs } = await supabase
          .from("questions")
          .select("id, system_id, exam_track_id")
          .in("id", qIds);
        const qMap = new Map((qs ?? []).map((q) => [q.id, q]));
        const { data: trackSlugs } = await supabase
          .from("exam_tracks")
          .select("id, slug");
        const trackSlugMap = new Map((trackSlugs ?? []).map((t) => [t.id, t.slug ?? ""]));

        for (const e of esq ?? []) {
          const q = qMap.get(e.question_id);
          if (!q?.system_id) continue;
          const cur = bySystem.get(q.system_id) ?? { correct: 0, total: 0, trackId: q.exam_track_id };
          cur.total++;
          if (e.is_correct) cur.correct++;
          bySystem.set(q.system_id, cur);
        }
      }
    }

    const { data: attempts } = await supabase
      .from("user_question_attempts")
      .select("question_id, is_correct");
    const attemptQIds = [...new Set((attempts ?? []).map((a) => a.question_id))];
    if (attemptQIds.length > 0) {
      const { data: qs } = await supabase
        .from("questions")
        .select("id, system_id, exam_track_id")
        .in("id", attemptQIds);
      const qMap = new Map((qs ?? []).map((q) => [q.id, q]));
      for (const a of attempts ?? []) {
        const q = qMap.get(a.question_id);
        if (!q?.system_id) continue;
        const cur = bySystem.get(q.system_id) ?? { correct: 0, total: 0, trackId: q.exam_track_id };
        cur.total++;
        if (a.is_correct) cur.correct++;
        bySystem.set(q.system_id, cur);
      }
    }

    const { data: systems } = await supabase
      .from("systems")
      .select("id, name, exam_track_id");
    const { data: trackSlugs } = await supabase
      .from("exam_tracks")
      .select("id, slug");
    const trackSlugMap = new Map((trackSlugs ?? []).map((t) => [t.id, t.slug ?? ""]));
    const systemMap = new Map((systems ?? []).map((s) => [s.id, { name: s.name, trackId: s.exam_track_id }]));

    const result: AdminSystemPerformance[] = [];
    for (const [systemId, data] of bySystem.entries()) {
      if (data.total < 5) continue;
      const system = systemMap.get(systemId);
      const pct = Math.round((data.correct / data.total) * 100);
      const isWeak = pct < 65;
      const isStrong = pct >= 80;
      if (type === "weak" && !isWeak) continue;
      if (type === "strong" && !isStrong) continue;
      result.push({
        trackSlug: trackSlugMap.get(data.trackId) ?? "",
        systemId,
        systemName: system?.name ?? systemId,
        correct: data.correct,
        total: data.total,
        percentCorrect: pct,
        type: isWeak ? "weak" : isStrong ? "strong" : "neutral",
      });
    }
    return type === "weak"
      ? result.sort((a, b) => a.percentCorrect - b.percentCorrect)
      : result.sort((a, b) => b.percentCorrect - a.percentCorrect);
  }, []);
}

/** Operational metrics: batch jobs, campaigns, shards, failures */
async function loadOperationalMetrics(): Promise<AdminOperationalMetrics> {
  return safeQuery(async () => {
    const supabase = createServiceClient();
    const since = sevenDaysAgo();
    const [batchData, campaignData, shardData, errors, retries] = await Promise.all([
      supabase.from("ai_batch_jobs").select("status"),
      supabase.from("ai_generation_campaigns").select("status"),
      supabase.from("ai_generation_shards").select("status, failed_count, retry_count"),
      supabase.from("ai_batch_job_logs")
        .select("id", { count: "exact", head: true })
        .eq("log_level", "error")
        .gte("created_at", since),
      supabase.from("ai_batch_job_logs")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since),
    ]);

    const batchJobs = { pending: 0, running: 0, completed: 0, failed: 0 };
    for (const r of batchData.data ?? []) {
      const s = String(r.status ?? "").toLowerCase();
      if (["planned", "under_review", "queued", "pending"].includes(s)) batchJobs.pending++;
      else if (["in_progress", "running"].includes(s)) batchJobs.running++;
      else if (["completed", "done"].includes(s)) batchJobs.completed++;
      else if (["failed", "cancelled", "error"].includes(s)) batchJobs.failed++;
      else batchJobs.pending++;
    }

    const campaigns = { active: 0, completed: 0 };
    for (const r of campaignData.data ?? []) {
      const s = String(r.status ?? "").toLowerCase();
      if (["active", "running", "in_progress"].includes(s)) campaigns.active++;
      else if (["completed", "done"].includes(s)) campaigns.completed++;
    }

    let shardsTotal = 0;
    let shardsCompleted = 0;
    let shardsFailed = 0;
    let retries24h = 0;
    for (const r of shardData.data ?? []) {
      shardsTotal++;
      const s = String(r.status ?? "");
      if (["completed", "done"].includes(s)) shardsCompleted++;
      else if (["failed", "error"].includes(s)) shardsFailed++;
      retries24h += r.retry_count ?? 0;
    }

    return {
      batchJobs,
      campaigns,
      shards: { total: shardsTotal, completed: shardsCompleted, failed: shardsFailed },
      recentFailures: errors.count ?? 0,
      retries24h,
    };
  }, {
    batchJobs: { pending: 0, running: 0, completed: 0, failed: 0 },
    campaigns: { active: 0, completed: 0 },
    shards: { total: 0, completed: 0, failed: 0 },
    recentFailures: 0,
    retries24h: 0,
  });
}

/** Load question usage by system (for admin chart) */
export async function loadQuestionUsageBySystem(): Promise<{ name: string; pct: number; total: number }[]> {
  return safeQuery(async () => {
    const supabase = createServiceClient();
    const { data: sessions } = await supabase
      .from("exam_sessions")
      .select("id")
      .not("completed_at", "is", null);
    const sessionIds = (sessions ?? []).map((s) => s.id);
    const bySystem = new Map<string, number>();

    if (sessionIds.length > 0) {
      const { data: esq } = await supabase
        .from("exam_session_questions")
        .select("question_id")
        .in("exam_session_id", sessionIds);
      const qIds = [...new Set((esq ?? []).map((e) => e.question_id))];
      if (qIds.length > 0) {
        const { data: qs } = await supabase
          .from("questions")
          .select("id, system_id")
          .in("id", qIds);
        for (const e of esq ?? []) {
          const q = (qs ?? []).find((x) => x.id === e.question_id);
          if (q?.system_id) {
            bySystem.set(q.system_id, (bySystem.get(q.system_id) ?? 0) + 1);
          }
        }
      }
    }

    const { data: attempts } = await supabase
      .from("user_question_attempts")
      .select("question_id");
    const attemptQIds = [...new Set((attempts ?? []).map((a) => a.question_id))];
    if (attemptQIds.length > 0) {
      const { data: qs } = await supabase
        .from("questions")
        .select("id, system_id")
        .in("id", attemptQIds);
      for (const a of attempts ?? []) {
        const q = (qs ?? []).find((x) => x.id === a.question_id);
        if (q?.system_id) {
          bySystem.set(q.system_id, (bySystem.get(q.system_id) ?? 0) + 1);
        }
      }
    }

    const total = [...bySystem.values()].reduce((a, b) => a + b, 0);
    if (total === 0) return [];

    const { data: systems } = await supabase
      .from("systems")
      .select("id, name");
    const systemMap = new Map((systems ?? []).map((s) => [s.id, s.name]));

    return [...bySystem.entries()]
      .map(([id, count]) => ({
        name: systemMap.get(id) ?? id,
        pct: Math.round((count / total) * 100),
        total: count,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, []);
}

/** Load full admin analytics */
export async function loadAdminAnalytics(): Promise<AdminAnalyticsData> {
  const [
    totalLearners,
    activeLearners7d,
    completedSessions,
    questionsAnswered,
    averageScore,
    averageReadiness,
    contentUsage,
    byTrack,
    weakSystems,
    strongSystems,
    operational,
  ] = await Promise.all([
    loadTotalLearners(),
    loadActiveLearners7d(),
    loadCompletedSessions(),
    loadQuestionsAnswered(),
    loadAverageScore(),
    loadAverageReadiness(),
    loadContentUsage(),
    loadTrackMetrics(),
    loadSystemPerformance("weak"),
    loadSystemPerformance("strong"),
    loadOperationalMetrics(),
  ]);

  return {
    learner: {
      totalLearners,
      activeLearners7d,
      completedExamSessions: completedSessions.all,
      completedExamSessions7d: completedSessions.last7d,
      questionsAnswered: questionsAnswered.all,
      questionsAnswered7d: questionsAnswered.last7d,
      averageScorePct: averageScore,
      averageReadinessPct: averageReadiness,
    },
    contentUsage,
    byTrack,
    weakSystems,
    strongSystems,
    operational,
  };
}
