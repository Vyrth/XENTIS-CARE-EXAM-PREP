/**
 * Production-Scale AI Content Pipeline
 *
 * - Master batch → child shards
 * - Concurrency control (per-track, global)
 * - Exponential backoff + retry
 * - Idempotency keys
 * - Resume from partial
 */

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";
import type { BatchJobSpec } from "./batch-engine";
import { generateShards, type ShardSpec } from "./shard-generator";
import { simpleHash } from "./dedupe-utils";
import {
  CONCURRENCY_LIMITS,
  getBackoffMs,
  type BatchContentType,
} from "./production-pipeline-config";

export interface MasterBatchSpec {
  name?: string;
  tracks: { id: string; slug: string }[];
  contentType: BatchContentType;
  targetPerTrack: number;
  systemIds?: string[];
  topicIds?: string[];
  createdBy: string | null;
  /** Optional: existing idempotency key to prevent duplicate master creation */
  idempotencyKey?: string;
}

export interface CreateMasterBatchResult {
  success: boolean;
  masterBatchId?: string;
  childJobIds?: string[];
  error?: string;
}

/** Create master batch and spawn child jobs (shards) */
export async function createMasterBatch(spec: MasterBatchSpec): Promise<CreateMasterBatchResult> {
  if (!isSupabaseServiceRoleConfigured()) {
    return { success: false, error: "Supabase not configured" };
  }

  const supabase = createServiceClient();

  if (spec.idempotencyKey) {
    const { data: existing } = await supabase
      .from("ai_master_batches")
      .select("id")
      .eq("idempotency_key", spec.idempotencyKey)
      .maybeSingle();
    if (existing) {
      const { data: children } = await supabase
        .from("ai_batch_jobs")
        .select("id")
        .eq("master_batch_id", existing.id);
      return {
        success: true,
        masterBatchId: existing.id,
        childJobIds: (children ?? []).map((c) => c.id),
      };
    }
  }

  const { data: systems } = await supabase
    .from("systems")
    .select("id, name, exam_track_id")
    .in("exam_track_id", spec.tracks.map((t) => t.id));
  const systemsByTrack = new Map<string, { id: string; name: string }[]>();
  for (const s of systems ?? []) {
    const list = systemsByTrack.get(s.exam_track_id) ?? [];
    if (!spec.systemIds || spec.systemIds.includes(s.id)) {
      list.push({ id: s.id, name: s.name });
    }
    systemsByTrack.set(s.exam_track_id, list);
  }

  const { data: links } = await supabase
    .from("topic_system_links")
    .select("topic_id, system_id");
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

  const shards = generateShards(
    spec.tracks,
    systemsByTrack,
    topicsBySystem,
    spec.contentType,
    spec.targetPerTrack
  );

  const targetTotal = shards.reduce((acc, s) => acc + s.targetCount, 0);

  const { data: master } = await supabase
    .from("ai_master_batches")
    .insert({
      name: spec.name ?? `Master ${spec.contentType} ${new Date().toISOString().slice(0, 10)}`,
      target_total_count: targetTotal,
      status: "planned",
      idempotency_key: spec.idempotencyKey ?? `mb:${spec.contentType}:${Date.now()}:${simpleHash(JSON.stringify(spec.tracks.map((t) => t.id)))}`,
      created_by: spec.createdBy,
    })
    .select("id")
    .single();

  if (!master?.id) {
    return { success: false, error: "Failed to create master batch" };
  }

  const childJobIds: string[] = [];
  for (const shard of shards) {
    const idempotencyKey = `mb:${master.id}:${shard.shardKey}:${simpleHash(JSON.stringify(shard))}`;
    const jobSpec: BatchJobSpec = {
      trackId: shard.trackId,
      trackSlug: shard.trackSlug,
      contentType: shard.contentType,
      topicIds: shard.topicId ? [shard.topicId] : undefined,
      systemIds: shard.systemId ? [shard.systemId] : undefined,
      targetCount: shard.targetCount,
      quantityPerTopic: shard.targetCount,
    };
    const jobId = await createBatchJobWithShard(jobSpec, spec.createdBy, {
      masterBatchId: master.id,
      shardKey: shard.shardKey,
      idempotencyKey,
    });
    if (jobId) childJobIds.push(jobId);
  }

  await supabase
    .from("ai_master_batches")
    .update({ status: "running", updated_at: new Date().toISOString() })
    .eq("id", master.id);

  return {
    success: true,
    masterBatchId: master.id,
    childJobIds,
  };
}

/** Create batch job with shard metadata */
async function createBatchJobWithShard(
  spec: BatchJobSpec,
  createdBy: string | null,
  meta: { masterBatchId: string; shardKey: string; idempotencyKey: string }
): Promise<string | null> {
  if (!isSupabaseServiceRoleConfigured()) return null;
  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("ai_batch_jobs")
    .select("id")
    .eq("idempotency_key", meta.idempotencyKey)
    .maybeSingle();
  if (existing) return existing.id;

  const { data } = await supabase
    .from("ai_batch_jobs")
    .insert({
      exam_track_id: spec.trackId,
      content_type: spec.contentType,
      topic_ids: spec.topicIds ?? [],
      system_ids: spec.systemIds ?? [],
      target_count: spec.targetCount,
      quantity_per_topic: spec.quantityPerTopic ?? null,
      difficulty_distribution: spec.difficultyDistribution ?? {},
      board_focus: spec.boardFocus ?? null,
      item_type_slug: spec.itemTypeSlug ?? "single_best_answer",
      study_guide_mode: spec.studyGuideMode ?? "section_pack",
      section_count: spec.sectionCount ?? 4,
      flashcard_deck_mode: spec.flashcardDeckMode ?? "rapid_recall",
      flashcard_style: spec.flashcardStyle ?? "rapid_recall",
      card_count: spec.cardCount ?? 8,
      high_yield_type: spec.highYieldType ?? "high_yield_summary",
      status: "pending",
      created_by: createdBy,
      master_batch_id: meta.masterBatchId,
      shard_key: meta.shardKey,
      idempotency_key: meta.idempotencyKey,
    })
    .select("id")
    .single();

  return data?.id ?? null;
}

/** Check concurrency limits before claiming a job */
export async function canClaimJob(trackId: string): Promise<boolean> {
  if (!isSupabaseServiceRoleConfigured()) return false;
  const supabase = createServiceClient();

  const { count: globalRunning } = await supabase
    .from("ai_batch_jobs")
    .select("id", { count: "exact", head: true })
    .eq("status", "running");
  if ((globalRunning ?? 0) >= CONCURRENCY_LIMITS.maxConcurrentGlobal) return false;

  const { count: trackRunning } = await supabase
    .from("ai_batch_jobs")
    .select("id", { count: "exact", head: true })
    .eq("exam_track_id", trackId)
    .eq("status", "running");
  if ((trackRunning ?? 0) >= CONCURRENCY_LIMITS.maxConcurrentPerTrack) return false;

  return true;
}
