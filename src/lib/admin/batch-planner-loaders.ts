/**
 * Batch planner loaders - plans, inventory by scope, target vs actual.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";

export type BatchPlanStatus = "planned" | "in_progress" | "under_review" | "completed";

export interface BatchPlan {
  id: string;
  examTrackId: string;
  systemId: string | null;
  topicId: string | null;
  targetQuestions: number;
  targetGuides: number;
  targetDecks: number;
  targetVideos: number;
  targetHighYield: number;
  status: BatchPlanStatus;
  ownerId: string | null;
  reviewerId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  // Joined
  trackSlug?: string;
  trackName?: string;
  systemName?: string;
  topicName?: string;
}

export interface BatchPlanWithProgress extends BatchPlan {
  actualQuestions: number;
  actualGuides: number;
  actualDecks: number;
  actualVideos: number;
  actualHighYield: number;
  questionsProgress: number;
  guidesProgress: number;
  decksProgress: number;
  videosProgress: number;
  highYieldProgress: number;
  overallProgress: number;
}

async function safeQuery<T>(fn: () => Promise<T>): Promise<T> {
  try {
    if (!isSupabaseServiceRoleConfigured()) return [] as unknown as T;
    return await fn();
  } catch {
    return [] as unknown as T;
  }
}

/** Load counts for a scope (track, optional system, optional topic) */
async function loadActualCounts(
  supabase: ReturnType<typeof createServiceClient>,
  trackId: string,
  systemId: string | null,
  topicId: string | null
): Promise<{
  questions: number;
  guides: number;
  decks: number;
  videos: number;
  highYield: number;
}> {
  const run = async (table: string) => {
    let q = supabase.from(table).select("id", { count: "exact", head: true }).eq("exam_track_id", trackId);
    if (systemId) q = q.eq("system_id", systemId);
    if (topicId) q = q.eq("topic_id", topicId);
    const { count } = await q;
    return count ?? 0;
  };

  const [questions, guides, decks, videos, highYield] = await Promise.all([
    run("questions"),
    run("study_guides"),
    run("flashcard_decks"),
    run("video_lessons"),
    run("high_yield_content"),
  ]);

  return { questions, guides, decks, videos, highYield };
}

/** Load all batch plans with progress */
export async function loadBatchPlansWithProgress(filters?: {
  trackId?: string;
  status?: BatchPlanStatus;
  ownerId?: string;
}): Promise<BatchPlanWithProgress[]> {
  return safeQuery(async () => {
    const supabase = createServiceClient();
    let query = supabase
      .from("batch_plans")
      .select("*")
      .order("created_at", { ascending: false });

    if (filters?.trackId) query = query.eq("exam_track_id", filters.trackId);
    if (filters?.status) query = query.eq("status", filters.status);
    if (filters?.ownerId) query = query.eq("owner_id", filters.ownerId);

    const { data: plans } = await query;
    if (!plans?.length) return [];

    const { data: tracks } = await supabase.from("exam_tracks").select("id, slug, name");
    const trackMap = new Map((tracks ?? []).map((t) => [t.id, t]));

    const systemIds = [...new Set((plans ?? []).map((p) => p.system_id).filter(Boolean))] as string[];
    const topicIds = [...new Set((plans ?? []).map((p) => p.topic_id).filter(Boolean))] as string[];

    const { data: systems } = systemIds.length > 0
      ? await supabase.from("systems").select("id, name").in("id", systemIds)
      : { data: [] };
    const { data: topics } = topicIds.length > 0
      ? await supabase.from("topics").select("id, name").in("id", topicIds)
      : { data: [] };
    const systemMap = new Map((systems ?? []).map((s) => [s.id, s]));
    const topicMap = new Map((topics ?? []).map((t) => [t.id, t]));

    const results: BatchPlanWithProgress[] = [];
    for (const p of plans ?? []) {
      const actual = await loadActualCounts(
        supabase,
        p.exam_track_id,
        p.system_id,
        p.topic_id
      );

      const targets = [p.target_questions, p.target_guides, p.target_decks, p.target_videos, p.target_high_yield];
      const actuals = [actual.questions, actual.guides, actual.decks, actual.videos, actual.highYield];
      const totalTarget = targets.reduce((a, b) => a + b, 0);
      const totalActual = actuals.reduce((a, b) => a + b, 0);
      const overallProgress = totalTarget > 0 ? Math.min(100, Math.round((totalActual / totalTarget) * 100)) : 0;

      const progress = (t: number, a: number) => (t > 0 ? Math.min(100, Math.round((a / t) * 100)) : 100);

      const track = trackMap.get(p.exam_track_id);
      const system = p.system_id ? systemMap.get(p.system_id) : null;
      const topic = p.topic_id ? topicMap.get(p.topic_id) : null;

      results.push({
        id: p.id,
        examTrackId: p.exam_track_id,
        systemId: p.system_id,
        topicId: p.topic_id,
        targetQuestions: p.target_questions,
        targetGuides: p.target_guides,
        targetDecks: p.target_decks,
        targetVideos: p.target_videos,
        targetHighYield: p.target_high_yield,
        status: p.status as BatchPlanStatus,
        ownerId: p.owner_id,
        reviewerId: p.reviewer_id,
        notes: p.notes,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        trackSlug: track?.slug,
        trackName: track?.name,
        systemName: system?.name,
        topicName: topic?.name,
        actualQuestions: actual.questions,
        actualGuides: actual.guides,
        actualDecks: actual.decks,
        actualVideos: actual.videos,
        actualHighYield: actual.highYield,
        questionsProgress: progress(p.target_questions, actual.questions),
        guidesProgress: progress(p.target_guides, actual.guides),
        decksProgress: progress(p.target_decks, actual.decks),
        videosProgress: progress(p.target_videos, actual.videos),
        highYieldProgress: progress(p.target_high_yield, actual.highYield),
        overallProgress,
      });
    }
    return results;
  });
}
