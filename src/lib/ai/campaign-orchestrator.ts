/**
 * AI Content Factory - Master Campaign Orchestrator
 *
 * Launches and manages 24-hour generation campaigns:
 * - RN: 2000+ questions, guides, flashcards, high-yield
 * - FNP: 1500+, PMHNP: 1000+, LVN: 800+
 *
 * - Reads tracks, systems, topics
 * - Calculates coverage gaps, prioritizes low-coverage
 * - Creates shard jobs, inserts into ai_batch_jobs
 * - Supports dry run, configurable concurrency, safe stop/resume
 */

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";
import { isCircuitOpen } from "@/lib/ai/rate-control";
import { MAX_JOB_RETRIES } from "@/lib/ai/batch-scheduler";
import { loadBlueprintCoverage, type TrackBlueprintCoverage } from "@/lib/admin/blueprint-coverage";
import { generateShards, type ShardSpec } from "@/lib/ai/shard-generator";
import { simpleHash } from "@/lib/ai/dedupe-utils";
import type { BatchContentType } from "@/lib/ai/production-pipeline-config";
import type { BatchJobSpec } from "@/lib/ai/batch-engine";

export type CampaignStatus = "planned" | "running" | "completed" | "failed" | "cancelled" | "paused";

export interface CampaignTargets {
  question?: Record<string, number>;
  study_guide?: Record<string, number>;
  flashcard_deck?: Record<string, number>;
  flashcard_batch?: Record<string, number>;
  high_yield_summary?: Record<string, number>;
  high_yield_batch?: Record<string, number>;
}

export interface LaunchCampaignInput {
  campaignName: string;
  targetByTrackContent: CampaignTargets;
  maxConcurrency?: number;
  modelName?: string;
  dryRun?: boolean;
  createdBy?: string | null;
  idempotencyKey?: string;
}

export interface LaunchCampaignResult {
  success: boolean;
  campaignId?: string;
  shardCount?: number;
  targetTotal?: number;
  dryRun?: boolean;
  error?: string;
}

export interface CampaignSummary {
  campaignId: string;
  name: string;
  status: CampaignStatus;
  targetTotal: number;
  createdTotal: number;
  savedTotal: number;
  failedTotal: number;
  duplicateTotal: number;
  generatedTotal: number;
  retryTotal: number;
  jobsRunning: number;
  queueDepth: number;
  completionPercent: number;
  etaMinutes?: number;
  byTrack?: Record<string, { target: number; saved: number; failed: number; generated?: number }>;
  byContentType?: Record<string, { target: number; saved: number; failed: number; generated?: number }>;
  recentErrors?: { jobId: string; errorMessage?: string; contentType: string; trackSlug?: string }[];
  createdAt?: string;
  completedAt?: string;
}

const TRACK_SLUGS = ["rn", "fnp", "pmhnp", "lvn"] as const;
const DEFAULT_TARGETS: CampaignTargets = {
  question: { rn: 2000, fnp: 1500, pmhnp: 1000, lvn: 800 },
  study_guide: { rn: 200, fnp: 150, pmhnp: 100, lvn: 80 },
  flashcard_deck: { rn: 100, fnp: 75, pmhnp: 50, lvn: 40 },
  high_yield_summary: { rn: 100, fnp: 75, pmhnp: 50, lvn: 40 },
};

/** Autonomous Content Seeding: RN 2500, FNP 1500, PMHNP 1000, LVN 800 questions + guides, flashcards, high-yield */
export const SEEDING_CAMPAIGN_TARGETS: CampaignTargets = {
  question: { rn: 2500, fnp: 1500, pmhnp: 1000, lvn: 800 },
  study_guide: { rn: 200, fnp: 150, pmhnp: 100, lvn: 80 },
  flashcard_deck: { rn: 100, fnp: 75, pmhnp: 50, lvn: 40 },
  high_yield_summary: { rn: 100, fnp: 75, pmhnp: 50, lvn: 40 },
};

/** 25k+ question campaign: RN 7k, FNP 6.5k, PMHNP 6k, LVN 5.5k = 25k total. Safe for API overload. */
export const LARGE_CAMPAIGN_TARGETS: CampaignTargets = {
  question: { rn: 7000, fnp: 6500, pmhnp: 6000, lvn: 5500 },
  study_guide: { rn: 400, fnp: 350, pmhnp: 300, lvn: 250 },
  flashcard_deck: { rn: 200, fnp: 175, pmhnp: 150, lvn: 125 },
  flashcard_batch: { rn: 500, fnp: 400, pmhnp: 350, lvn: 300 },
  high_yield_summary: { rn: 200, fnp: 175, pmhnp: 150, lvn: 125 },
  high_yield_batch: { rn: 200, fnp: 175, pmhnp: 150, lvn: 125 },
};

/** Map coverage level to priority (lower = higher priority) */
function coveragePriority(level: string): number {
  switch (level) {
    case "none": return 0;
    case "low": return 1;
    case "adequate": return 2;
    case "strong": return 3;
    default: return 2;
  }
}

/** Build track-system-topic list with coverage for prioritization */
function buildPrioritizedTopicList(
  coverage: TrackBlueprintCoverage[],
  _trackSlugToId: Map<string, string>
): { trackId: string; trackSlug: string; systemId: string; systemName: string; topicId: string; topicName: string; priority: number }[] {
  const out: { trackId: string; trackSlug: string; systemId: string; systemName: string; topicId: string; topicName: string; priority: number }[] = [];

  for (const track of coverage) {
    const trackId = track.trackId;
    const trackSlug = track.trackSlug;

    for (const domain of track.domains) {
      for (const sys of domain.systems) {
        for (const topic of sys.topics) {
          out.push({
            trackId,
            trackSlug,
            systemId: sys.systemId,
            systemName: sys.systemName,
            topicId: topic.topicId,
            topicName: topic.topicName,
            priority: coveragePriority(topic.coverageLevel),
          });
        }
      }
    }
    for (const sys of track.unassignedSystems) {
      for (const topic of sys.topics) {
        out.push({
          trackId,
          trackSlug,
          systemId: sys.systemId,
          systemName: sys.systemName,
          topicId: topic.topicId,
          topicName: topic.topicName,
          priority: coveragePriority(topic.coverageLevel),
        });
      }
    }
  }

  out.sort((a, b) => a.priority - b.priority);
  return out;
}

/** Load tracks, systems, topics for shard generation */
async function loadTaxonomy(): Promise<{
  tracks: { id: string; slug: string }[];
  systemsByTrack: Map<string, { id: string; name: string }[]>;
  topicsBySystem: Map<string, { id: string; name: string; systemId?: string }[]>;
}> {
  const supabase = createServiceClient();

  const { data: tracks } = await supabase
    .from("exam_tracks")
    .select("id, slug")
    .in("slug", TRACK_SLUGS)
    .order("display_order", { ascending: true });

  const { data: systems } = await supabase
    .from("systems")
    .select("id, name, exam_track_id")
    .in("exam_track_id", (tracks ?? []).map((t) => t.id));

  const systemsByTrack = new Map<string, { id: string; name: string }[]>();
  for (const s of systems ?? []) {
    const list = systemsByTrack.get(s.exam_track_id) ?? [];
    list.push({ id: s.id, name: s.name });
    systemsByTrack.set(s.exam_track_id, list);
  }

  const { data: links } = await supabase.from("topic_system_links").select("topic_id, system_id");
  const { data: topics } = await supabase.from("topics").select("id, name");
  const topicMap = new Map((topics ?? []).map((t) => [t.id, t]));
  const topicsBySystem = new Map<string, { id: string; name: string; systemId?: string }[]>();
  for (const l of links ?? []) {
    const t = topicMap.get(l.topic_id);
    if (!t) continue;
    const list = topicsBySystem.get(l.system_id) ?? [];
    list.push({ id: t.id, name: t.name, systemId: l.system_id });
    topicsBySystem.set(l.system_id, list);
  }

  return {
    tracks: tracks ?? [],
    systemsByTrack,
    topicsBySystem,
  };
}

/** Generate campaign shards with coverage-based prioritization */
function generateCampaignShards(
  targets: CampaignTargets,
  taxonomy: Awaited<ReturnType<typeof loadTaxonomy>>,
  coverage: TrackBlueprintCoverage[]
): ShardSpec[] {
  const allShards: ShardSpec[] = [];
  const trackSlugToId = new Map(taxonomy.tracks.map((t) => [t.slug, t.id]));

  const contentTypes: BatchContentType[] = [
    "question",
    "study_guide",
    "flashcard_deck",
    "flashcard_batch",
    "high_yield_summary",
    "high_yield_batch",
  ];

  for (const contentType of contentTypes) {
    const byTrack = targets[contentType as keyof CampaignTargets] as Record<string, number> | undefined;
    if (!byTrack || Object.keys(byTrack).length === 0) continue;

    const tracksForType = taxonomy.tracks.filter((t) => (byTrack[t.slug] ?? 0) > 0);
    if (tracksForType.length === 0) continue;

    for (const track of tracksForType) {
      const targetPerTrack = byTrack[track.slug] ?? 0;
      if (targetPerTrack <= 0) continue;

      const shards = generateShards(
        [track],
        taxonomy.systemsByTrack,
        taxonomy.topicsBySystem,
        contentType,
        targetPerTrack
      );
      allShards.push(...shards);
    }
  }

  if (coverage.length > 0) {
    const prioritized = buildPrioritizedTopicList(coverage, trackSlugToId);
    const priorityMap = new Map(
      prioritized.map((p) => [`${p.trackId}:${p.systemId}:${p.topicId}`, p.priority])
    );
    allShards.sort((a, b) => {
      const keyA = `${a.trackId}:${a.systemId ?? ""}:${a.topicId ?? ""}`;
      const keyB = `${b.trackId}:${b.systemId ?? ""}:${b.topicId ?? ""}`;
      const priA = priorityMap.get(keyA) ?? 2;
      const priB = priorityMap.get(keyB) ?? 2;
      return priA - priB;
    });
  }

  return allShards;
}

/** Launch a campaign: create campaign row and child batch jobs */
export async function launchCampaign(input: LaunchCampaignInput): Promise<LaunchCampaignResult> {
  if (!isSupabaseServiceRoleConfigured()) {
    return { success: false, error: "Supabase not configured" };
  }

  const supabase = createServiceClient();
  const targets = { ...DEFAULT_TARGETS, ...input.targetByTrackContent };
  const dryRun = input.dryRun ?? false;

  if (input.idempotencyKey) {
    const { data: existing } = await supabase
      .from("ai_campaigns")
      .select("id, target_total")
      .eq("idempotency_key", input.idempotencyKey)
      .maybeSingle();
    if (existing) {
      const { data: children } = await supabase
        .from("ai_batch_jobs")
        .select("id")
        .eq("campaign_id", existing.id);
      return {
        success: true,
        campaignId: existing.id,
        shardCount: (children ?? []).length,
        targetTotal: existing.target_total,
        dryRun: false,
      };
    }
  }

  const [taxonomy, coverage] = await Promise.all([
    loadTaxonomy(),
    loadBlueprintCoverage(null),
  ]);

  const shards = generateCampaignShards(targets, taxonomy, coverage);
  const targetTotal = shards.reduce((acc, s) => acc + s.targetCount, 0);

  if (taxonomy.tracks.length === 0) {
    return { success: false, error: "No tracks found. Configure exam tracks first." };
  }
  const hasSystems = [...taxonomy.systemsByTrack.values()].some((arr) => arr.length > 0);
  if (!hasSystems) {
    return { success: false, error: "No systems found for any track. Add systems to tracks." };
  }
  const hasTopics = [...taxonomy.topicsBySystem.values()].some((arr) => arr.length > 0);
  if (!hasTopics) {
    return { success: false, error: "No topics found. Add topics and link them to systems." };
  }
  if (shards.length === 0 || targetTotal === 0) {
    return { success: false, error: "No shards to generate. Check track, system, and topic configuration." };
  }

  if (dryRun) {
    return {
      success: true,
      shardCount: shards.length,
      targetTotal,
      dryRun: true,
    };
  }

  const idempotencyKey =
    input.idempotencyKey ??
    `campaign:${input.campaignName}:${Date.now()}:${simpleHash(JSON.stringify(targets))}`;

  const { data: campaign, error: campErr } = await supabase
    .from("ai_campaigns")
    .insert({
      name: input.campaignName,
      target_by_track_content: targets,
      target_total: targetTotal,
      max_concurrency: input.maxConcurrency ?? 4,
      model_name: input.modelName ?? "gpt-4o-mini",
      dry_run: false,
      status: "planned",
      created_by: input.createdBy ?? null,
      idempotency_key: idempotencyKey,
    })
    .select("id")
    .single();

  if (campErr || !campaign?.id) {
    return { success: false, error: campErr?.message ?? "Failed to create campaign" };
  }

  let inserted = 0;
  for (const shard of shards) {
    const shardIdempotencyKey = `camp:${campaign.id}:${shard.shardKey}:${simpleHash(JSON.stringify(shard))}`;

    const { data: existing } = await supabase
      .from("ai_batch_jobs")
      .select("id")
      .eq("idempotency_key", shardIdempotencyKey)
      .maybeSingle();
    if (existing) continue;

    const jobSpec: BatchJobSpec = {
      trackId: shard.trackId,
      trackSlug: shard.trackSlug,
      contentType: shard.contentType,
      topicIds: shard.topicId ? [shard.topicId] : undefined,
      systemIds: shard.systemId ? [shard.systemId] : undefined,
      targetCount: shard.targetCount,
      quantityPerTopic: shard.targetCount,
    };

    const { data: job, error } = await supabase
      .from("ai_batch_jobs")
      .insert({
        exam_track_id: jobSpec.trackId,
        content_type: jobSpec.contentType,
        topic_ids: jobSpec.topicIds ?? [],
        system_ids: jobSpec.systemIds ?? [],
        target_count: jobSpec.targetCount,
        quantity_per_topic: jobSpec.quantityPerTopic ?? null,
        difficulty_distribution: {},
        status: "pending",
        created_by: input.createdBy ?? null,
        campaign_id: campaign.id,
        shard_key: shard.shardKey,
        idempotency_key: shardIdempotencyKey,
      })
      .select("id")
      .single();

    if (!error && job) inserted++;
  }

  await supabase
    .from("ai_campaigns")
    .update({ status: "running", updated_at: new Date().toISOString() })
    .eq("id", campaign.id);

  return {
    success: true,
    campaignId: campaign.id,
    shardCount: inserted,
    targetTotal,
    dryRun: false,
  };
}

/** Get campaign summary with progress and ETA */
export async function getCampaignSummary(campaignId: string): Promise<CampaignSummary | null> {
  if (!isSupabaseServiceRoleConfigured()) return null;

  const supabase = createServiceClient();
  const { data: camp } = await supabase
    .from("ai_campaigns")
    .select("*")
    .eq("id", campaignId)
    .single();
  if (!camp) return null;

  const { data: jobs } = await supabase
    .from("ai_batch_jobs")
    .select("id, exam_track_id, content_type, target_count, completed_count, failed_count, skipped_duplicate_count, generated_count, retry_count, status, error_message")
    .eq("campaign_id", campaignId);

  const byTrack: Record<string, { target: number; saved: number; failed: number; generated?: number }> = {};
  const byContentType: Record<string, { target: number; saved: number; failed: number; generated?: number }> = {};
  let totalTarget = 0;
  let totalSaved = 0;
  let totalFailed = 0;
  let totalGenerated = 0;
  let totalRetry = 0;

  const trackIds = [...new Set((jobs ?? []).map((j) => j.exam_track_id))];
  const { data: tracks } = await supabase.from("exam_tracks").select("id, slug").in("id", trackIds);
  const trackSlugMap = new Map((tracks ?? []).map((t) => [t.id, t.slug]));

  for (const j of jobs ?? []) {
    const trackId = j.exam_track_id;
    const ct = j.content_type as string;
    const target = j.target_count ?? 0;
    const saved = j.completed_count ?? 0;
    const failed = j.failed_count ?? 0;
    const gen = j.generated_count ?? 0;
    const retry = j.retry_count ?? 0;

    totalTarget += target;
    totalSaved += saved;
    totalFailed += failed;
    totalGenerated += gen;
    totalRetry += retry;

    if (!byTrack[trackId]) byTrack[trackId] = { target: 0, saved: 0, failed: 0, generated: 0 };
    byTrack[trackId].target += target;
    byTrack[trackId].saved += saved;
    byTrack[trackId].failed += failed;
    byTrack[trackId].generated = (byTrack[trackId].generated ?? 0) + gen;

    if (!byContentType[ct]) byContentType[ct] = { target: 0, saved: 0, failed: 0, generated: 0 };
    byContentType[ct].target += target;
    byContentType[ct].saved += saved;
    byContentType[ct].failed += failed;
    byContentType[ct].generated = (byContentType[ct].generated ?? 0) + gen;
  }

  const targetTotal = camp.target_total ?? totalTarget;
  const savedTotal = camp.saved_total ?? totalSaved;
  const failedTotal = camp.failed_total ?? totalFailed;
  const duplicateTotal = camp.duplicate_total ?? 0;
  const createdTotal = camp.created_total ?? savedTotal;

  const completionPercent = targetTotal > 0 ? Math.round((savedTotal / targetTotal) * 100) : 0;

  const pendingCount = (jobs ?? []).filter((j) => j.status === "pending" || j.status === "queued").length;
  const runningCount = (jobs ?? []).filter((j) => j.status === "running").length;

  const rateLimitMs = 800;
  const avgItemsPerShard = 15;
  const etaMinutes = pendingCount > 0
    ? Math.ceil((pendingCount * avgItemsPerShard * rateLimitMs) / 60000)
    : undefined;

  const failedJobs = (jobs ?? []).filter((j) => j.status === "failed" && (j.error_message || j.failed_count > 0));
  const recentErrors = failedJobs.slice(0, 10).map((j) => ({
    jobId: j.id,
    errorMessage: (j as { error_message?: string }).error_message ?? undefined,
    contentType: j.content_type as string,
    trackSlug: trackSlugMap.get(j.exam_track_id),
  }));

  const createdAt = (camp as { created_at?: string }).created_at;
  const completedAt = (camp as { completed_at?: string }).completed_at;

  return {
    campaignId: camp.id,
    name: camp.name,
    status: camp.status as CampaignStatus,
    targetTotal,
    createdTotal,
    savedTotal,
    failedTotal,
    duplicateTotal,
    generatedTotal: totalGenerated,
    retryTotal: totalRetry,
    jobsRunning: runningCount,
    queueDepth: pendingCount,
    completionPercent,
    etaMinutes,
    byTrack,
    byContentType,
    recentErrors,
    createdAt,
    completedAt,
  };
}

/** Claim next pending shard for processing (respects concurrency, skips paused campaigns) */
export async function claimNextShard(
  campaignId: string | null,
  maxConcurrency: number
): Promise<string | null> {
  if (!isSupabaseServiceRoleConfigured()) return null;
  if (isCircuitOpen()) return null;

  const supabase = createServiceClient();

  const { count: running } = await supabase
    .from("ai_batch_jobs")
    .select("id", { count: "exact", head: true })
    .eq("status", "running");
  if ((running ?? 0) >= maxConcurrency) return null;

  let query = supabase
    .from("ai_batch_jobs")
    .select("id, exam_track_id, campaign_id, job_retry_attempt")
    .in("status", ["pending", "queued"])
    .order("created_at", { ascending: true })
    .limit(50);

  if (campaignId) {
    const { data: camp } = await supabase
      .from("ai_campaigns")
      .select("status")
      .eq("id", campaignId)
      .single();
    if (camp?.status === "paused") return null;
    query = query.eq("campaign_id", campaignId);
  }

  const { data: pending } = await query;

  const campaignIds = [...new Set((pending ?? []).map((j) => j.campaign_id).filter(Boolean))];
  const pausedCampaignIds = new Set<string>();
  if (campaignIds.length > 0) {
    const { data: camps } = await supabase
      .from("ai_campaigns")
      .select("id")
      .in("id", campaignIds)
      .eq("status", "paused");
    for (const c of camps ?? []) {
      if (c.id) pausedCampaignIds.add(c.id);
    }
  }

  for (const job of pending ?? []) {
    if (job.campaign_id && pausedCampaignIds.has(job.campaign_id)) continue;
    const retryAttempt = (job as { job_retry_attempt?: number }).job_retry_attempt ?? 0;
    if (retryAttempt >= MAX_JOB_RETRIES) continue;
    const { count: trackRunning } = await supabase
      .from("ai_batch_jobs")
      .select("id", { count: "exact", head: true })
      .eq("exam_track_id", job.exam_track_id)
      .eq("status", "running");
    if ((trackRunning ?? 0) >= 2) continue;

    const { data: claimed } = await supabase
      .from("ai_batch_jobs")
      .update({
        status: "running",
        updated_at: new Date().toISOString(),
        started_at: new Date().toISOString(),
      })
      .eq("id", job.id)
      .in("status", ["pending", "queued"])
      .select("id")
      .maybeSingle();

    if (claimed?.id) return claimed.id;
  }
  return null;
}

/** Pause campaign: set status to paused. Running jobs continue; no new claims. */
export async function pauseCampaign(campaignId: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseServiceRoleConfigured()) return { success: false, error: "Supabase not configured" };
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("ai_campaigns")
    .update({ status: "paused", updated_at: new Date().toISOString() })
    .eq("id", campaignId)
    .in("status", ["running", "planned"]);
  return { success: !error, error: error?.message };
}

/** Resume campaign: set status to running. */
export async function resumeCampaign(campaignId: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseServiceRoleConfigured()) return { success: false, error: "Supabase not configured" };
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("ai_campaigns")
    .update({ status: "running", updated_at: new Date().toISOString() })
    .eq("id", campaignId)
    .eq("status", "paused");
  return { success: !error, error: error?.message };
}

/** Cancel campaign: set status to cancelled; cancel all pending jobs. */
export async function cancelCampaign(campaignId: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseServiceRoleConfigured()) return { success: false, error: "Supabase not configured" };
  const supabase = createServiceClient();
  await supabase
    .from("ai_batch_jobs")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("campaign_id", campaignId)
    .in("status", ["pending", "queued"]);
  const { error } = await supabase
    .from("ai_campaigns")
    .update({ status: "cancelled", completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", campaignId);
  return { success: !error, error: error?.message };
}

/** Retry a single failed job by id. Respects retry cap. */
export async function retrySingleJob(jobId: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseServiceRoleConfigured()) return { success: false, error: "Supabase not configured" };
  const supabase = createServiceClient();
  const { data: job } = await supabase
    .from("ai_batch_jobs")
    .select("id, status, job_retry_attempt")
    .eq("id", jobId)
    .single();
  if (!job || job.status !== "failed") {
    return { success: false, error: "Job not found or not failed" };
  }
  const retryAttempt = (job as { job_retry_attempt?: number }).job_retry_attempt ?? 0;
  if (retryAttempt >= MAX_JOB_RETRIES) {
    return { success: false, error: `Job at retry cap (${MAX_JOB_RETRIES}). Inspect dead letter or fix root cause.` };
  }
  const { error } = await supabase
    .from("ai_batch_jobs")
    .update({
      status: "pending",
      error_message: null,
      updated_at: new Date().toISOString(),
      job_retry_attempt: retryAttempt + 1,
    })
    .eq("id", jobId);
  return { success: !error, error: error?.message };
}

/** Retry failed shards: reset failed jobs to pending, increment job_retry_attempt. Jobs at cap are skipped. */
export async function retryFailedShards(campaignId: string): Promise<{ success: boolean; count: number; skippedAtCap?: number; error?: string }> {
  if (!isSupabaseServiceRoleConfigured()) return { success: false, count: 0, error: "Supabase not configured" };
  const supabase = createServiceClient();
  const { data: failed } = await supabase
    .from("ai_batch_jobs")
    .select("id, job_retry_attempt")
    .eq("campaign_id", campaignId)
    .eq("status", "failed");
  const toRetry = (failed ?? []).filter((j) => ((j as { job_retry_attempt?: number }).job_retry_attempt ?? 0) < MAX_JOB_RETRIES);
  const skippedAtCap = (failed ?? []).length - toRetry.length;
  if (toRetry.length === 0) {
    return { success: true, count: 0, skippedAtCap: skippedAtCap > 0 ? skippedAtCap : undefined };
  }
  for (const j of toRetry) {
    const current = (j as { job_retry_attempt?: number }).job_retry_attempt ?? 0;
    await supabase
      .from("ai_batch_jobs")
      .update({
        status: "pending",
        error_message: null,
        updated_at: new Date().toISOString(),
        job_retry_attempt: current + 1,
      })
      .eq("id", j.id);
  }
  return { success: true, count: toRetry.length, skippedAtCap: skippedAtCap > 0 ? skippedAtCap : undefined };
}

/** Update campaign aggregates after a shard completes. Marks campaign completed when all jobs done. */
export async function updateCampaignProgress(
  campaignId: string,
  _jobId: string,
  _updates?: { completedCount?: number; failedCount?: number; skippedDuplicateCount?: number; generatedCount?: number }
): Promise<void> {
  if (!isSupabaseServiceRoleConfigured()) return;

  const supabase = createServiceClient();
  const { data: jobs } = await supabase
    .from("ai_batch_jobs")
    .select("id, status, completed_count, failed_count, skipped_duplicate_count")
    .eq("campaign_id", campaignId);

  const savedTotal = (jobs ?? []).reduce((acc, j) => acc + (j.completed_count ?? 0), 0);
  const failedTotal = (jobs ?? []).reduce((acc, j) => acc + (j.failed_count ?? 0), 0);
  const duplicateTotal = (jobs ?? []).reduce((acc, j) => acc + (j.skipped_duplicate_count ?? 0), 0);

  const hasPending = (jobs ?? []).some((j) => j.status === "pending" || j.status === "queued" || j.status === "running");
  const updates: Record<string, unknown> = {
    saved_total: savedTotal,
    failed_total: failedTotal,
    duplicate_total: duplicateTotal,
    created_total: savedTotal,
    updated_at: new Date().toISOString(),
  };
  if (!hasPending) {
    updates.status = "completed";
    updates.completed_at = new Date().toISOString();
  }

  await supabase.from("ai_campaigns").update(updates).eq("id", campaignId);
}
