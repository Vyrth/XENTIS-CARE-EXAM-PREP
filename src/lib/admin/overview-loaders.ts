/**
 * Admin overview loaders - live Supabase-backed metrics for the admin dashboard.
 * No mock data. Uses service client for full access.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";
import {
  loadContentInventoryByTrack,
  type TrackInventoryRow,
} from "@/lib/admin/track-inventory";

export type OverviewInventoryRow = TrackInventoryRow & { highYieldContent?: number };
import { loadAdminPublishQueue } from "@/lib/admin/loaders";

export interface LearnerSummary {
  totalLearners: number;
  activeLearners7d: number;
  completedSessions7d: number;
  questionsAnswered7d: number;
}

export interface AdminOverviewMetrics {
  /** Learner activity summary */
  learner: LearnerSummary;
  /** Content counts by track */
  inventory: OverviewInventoryRow[];
  /** Draft items across all content types */
  draftCount: number;
  /** Items in any review lane (editor, sme, legal, qa, needs_revision) */
  inReviewCount: number;
  /** Approved items ready to publish */
  readyToPublishCount: number;
  /** Batch plans by status */
  batchPlans: {
    pending: number;
    running: number;
    completed: number;
    failed: number;
  };
  /** AI generation campaigns by status */
  campaigns: {
    active: number;
    completed: number;
  };
  /** Recent error log entries from ai_batch_job_logs */
  recentErrors: { id: string; message: string; errorCode: string | null; createdAt: string }[];
  /** Lowest coverage systems by track (systems with fewest approved questions) */
  lowestCoverage: { trackSlug: string; systemName: string; questionCount: number }[];
}

const REVIEW_STATUSES = [
  "editor_review",
  "sme_review",
  "legal_review",
  "qa_review",
  "needs_revision",
] as const;

async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    if (!isSupabaseServiceRoleConfigured()) return fallback;
    return await fn();
  } catch {
    return fallback;
  }
}

/** Count draft items across questions, study_guides, videos, flashcard_decks, high_yield_content */
async function loadDraftCount(): Promise<number> {
  return safeQuery(async () => {
    const supabase = createServiceClient();
    const [q, sg, v, fd, hy] = await Promise.all([
      supabase.from("questions").select("id", { count: "exact", head: true }).eq("status", "draft"),
      supabase.from("study_guides").select("id", { count: "exact", head: true }).eq("status", "draft"),
      supabase.from("video_lessons").select("id", { count: "exact", head: true }).eq("status", "draft"),
      supabase.from("flashcard_decks").select("id", { count: "exact", head: true }).eq("status", "draft"),
      supabase.from("high_yield_content").select("id", { count: "exact", head: true }).eq("status", "draft"),
    ]);
    return (
      (q.count ?? 0) +
      (sg.count ?? 0) +
      (v.count ?? 0) +
      (fd.count ?? 0) +
      (hy.count ?? 0)
    );
  }, 0);
}

/** Count items in any review lane */
async function loadInReviewCount(): Promise<number> {
  return safeQuery(async () => {
    const supabase = createServiceClient();
    let total = 0;
    for (const status of REVIEW_STATUSES) {
      const [q, sg, v, fd, hy] = await Promise.all([
        supabase.from("questions").select("id", { count: "exact", head: true }).eq("status", status),
        supabase.from("study_guides").select("id", { count: "exact", head: true }).eq("status", status),
        supabase.from("video_lessons").select("id", { count: "exact", head: true }).eq("status", status),
        supabase.from("flashcard_decks").select("id", { count: "exact", head: true }).eq("status", status),
        supabase.from("high_yield_content").select("id", { count: "exact", head: true }).eq("status", status),
      ]);
      total +=
        (q.count ?? 0) +
        (sg.count ?? 0) +
        (v.count ?? 0) +
        (fd.count ?? 0) +
        (hy.count ?? 0);
    }
    return total;
  }, 0);
}

/** Load batch plan counts by status */
async function loadBatchPlanCounts(): Promise<AdminOverviewMetrics["batchPlans"]> {
  return safeQuery(
    async () => {
      const supabase = createServiceClient();
      const { data } = await supabase
        .from("batch_plans")
        .select("status");

      const counts = { pending: 0, running: 0, completed: 0, failed: 0 };
      for (const r of data ?? []) {
        const s = String(r.status ?? "");
        if (s === "planned" || s === "under_review") counts.pending++;
        else if (s === "in_progress") counts.running++;
        else if (s === "completed") counts.completed++;
        else if (s === "failed") counts.failed++;
      }
      return counts;
    },
    { pending: 0, running: 0, completed: 0, failed: 0 }
  );
}

/** Load AI generation campaign counts */
async function loadCampaignCounts(): Promise<AdminOverviewMetrics["campaigns"]> {
  return safeQuery(
    async () => {
      const supabase = createServiceClient();
      const { data } = await supabase
        .from("ai_generation_campaigns")
        .select("status");

      let active = 0;
      let completed = 0;
      for (const r of data ?? []) {
        const s = String(r.status ?? "").toLowerCase();
        if (s === "active" || s === "running" || s === "in_progress") active++;
        else if (s === "completed" || s === "done") completed++;
      }
      return { active, completed };
    },
    { active: 0, completed: 0 }
  );
}

/** Load recent error entries from ai_batch_job_logs */
async function loadRecentErrors(
  limit = 10
): Promise<AdminOverviewMetrics["recentErrors"]> {
  return safeQuery(
    async () => {
      const supabase = createServiceClient();
      const { data } = await supabase
        .from("ai_batch_job_logs")
        .select("id, message, error_code, log_level, created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      const filtered = (data ?? []).filter(
        (r) =>
          r.log_level === "error" ||
          (r.error_code != null && r.error_code !== "")
      );
      return filtered.slice(0, limit).map((r) => ({
        id: r.id,
        message: (r.message ?? "").slice(0, 120),
        errorCode: r.error_code ?? null,
        createdAt: r.created_at ?? "",
      }));
    },
    []
  );
}

/** Load lowest coverage systems (by approved question count) per track */
async function loadLowestCoverage(
  limitPerTrack = 3
): Promise<AdminOverviewMetrics["lowestCoverage"]> {
  return safeQuery(async () => {
    const supabase = createServiceClient();
    const { data: tracks } = await supabase
      .from("exam_tracks")
      .select("id, slug")
      .order("display_order", { ascending: true });

    const result: { trackSlug: string; systemName: string; questionCount: number }[] = [];

    for (const t of tracks ?? []) {
      const { data: systems } = await supabase
        .from("systems")
        .select("id, name")
        .eq("exam_track_id", t.id);

      const rows: { systemName: string; questionCount: number }[] = [];
      for (const sys of systems ?? []) {
        const { count } = await supabase
          .from("questions")
          .select("id", { count: "exact", head: true })
          .eq("exam_track_id", t.id)
          .eq("system_id", sys.id)
          .eq("status", "approved");
        rows.push({
          systemName: sys.name ?? "Unknown",
          questionCount: count ?? 0,
        });
      }

      const sorted = rows.sort((a, b) => a.questionCount - b.questionCount);
      for (let i = 0; i < Math.min(limitPerTrack, sorted.length); i++) {
        result.push({
          trackSlug: t.slug ?? "",
          systemName: sorted[i].systemName,
          questionCount: sorted[i].questionCount,
        });
      }
    }

    return result;
  }, []);
}

/** Load learner activity summary */
async function loadLearnerSummary(): Promise<LearnerSummary> {
  return safeQuery(async () => {
    const supabase = createServiceClient();
    const since = new Date();
    since.setDate(since.getDate() - 7);
    const sinceStr = since.toISOString();

    const [totalRes, sessionsRes, attemptsRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .not("primary_exam_track_id", "is", null),
      supabase
        .from("exam_sessions")
        .select("id, user_id, completed_at")
        .gte("started_at", sinceStr),
      supabase
        .from("user_question_attempts")
        .select("id", { count: "exact", head: true })
        .gte("created_at", sinceStr),
    ]);

    const sessionData = sessionsRes.data ?? [];
    const activeUserIds = new Set(sessionData.map((s) => s.user_id).filter(Boolean));
    const completed7d = sessionData.filter((s) => s.completed_at != null).length;
    const questions7d = attemptsRes.count ?? 0;

    const sessionIds = sessionData.map((s) => s.id);
    let examQuestions7d = 0;
    if (sessionIds.length > 0) {
      const { count } = await supabase
        .from("exam_session_questions")
        .select("id", { count: "exact", head: true })
        .in("exam_session_id", sessionIds);
      examQuestions7d = count ?? 0;
    }

    return {
      totalLearners: totalRes.count ?? 0,
      activeLearners7d: activeUserIds.size,
      completedSessions7d: completed7d,
      questionsAnswered7d: questions7d + examQuestions7d,
    };
  }, {
    totalLearners: 0,
    activeLearners7d: 0,
    completedSessions7d: 0,
    questionsAnswered7d: 0,
  });
}

/** Load high_yield_content approved count per track */
async function loadHighYieldCountByTrack(): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const result = await safeQuery(async () => {
    const supabase = createServiceClient();
    const { data: tracks } = await supabase
      .from("exam_tracks")
      .select("id")
      .order("display_order", { ascending: true });
    for (const t of tracks ?? []) {
      const { count } = await supabase
        .from("high_yield_content")
        .select("id", { count: "exact", head: true })
        .eq("exam_track_id", t.id)
        .eq("status", "approved");
      map.set(t.id, count ?? 0);
    }
    return map;
  }, new Map());
  return result;
}

/** Load full admin overview metrics */
export async function loadAdminOverviewMetrics(): Promise<AdminOverviewMetrics> {
  const [
    learner,
    inventory,
    draftCount,
    inReviewCount,
    publishQueue,
    batchPlans,
    campaigns,
    recentErrors,
    lowestCoverage,
    highYieldByTrack,
  ] = await Promise.all([
    loadLearnerSummary(),
    loadContentInventoryByTrack(),
    loadDraftCount(),
    loadInReviewCount(),
    loadAdminPublishQueue(null),
    loadBatchPlanCounts(),
    loadCampaignCounts(),
    loadRecentErrors(10),
    loadLowestCoverage(3),
    loadHighYieldCountByTrack(),
  ]);

  const inventoryWithHighYield = inventory.map((row) => ({
    ...row,
    highYieldContent: highYieldByTrack.get(row.trackId) ?? 0,
  }));

  return {
    learner,
    inventory: inventoryWithHighYield,
    draftCount,
    inReviewCount,
    readyToPublishCount: publishQueue.length,
    batchPlans,
    campaigns,
    recentErrors,
    lowestCoverage,
  };
}
