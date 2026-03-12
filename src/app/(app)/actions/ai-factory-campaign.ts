"use server";

import { revalidatePath } from "next/cache";
import { withAdminAIGuard } from "@/lib/auth/admin-ai-guard";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";

/** Supported content types for AI factory batch creation */
export type AICampaignContentType =
  | "question"
  | "study_guide"
  | "flashcard_deck"
  | "flashcard_batch"
  | "high_yield_summary"
  | "high_yield_batch";

const SUPPORTED_CONTENT_TYPES: AICampaignContentType[] = [
  "question",
  "study_guide",
  "flashcard_deck",
  "flashcard_batch",
  "high_yield_summary",
  "high_yield_batch",
];

/** Input for creating an AI generation campaign */
export interface CreateAIGenerationCampaignInput {
  name: string;
  config?: Record<string, unknown>;
  status?: "draft" | "planned" | "running" | "completed" | "cancelled";
}

/** Input for creating an AI generation shard */
export interface CreateAIGenerationShardInput {
  campaignId: string;
  examTrackId: string;
  contentType: AICampaignContentType;
  shardKey: string;
  targetCount: number;
  systemId?: string | null;
  topicId?: string | null;
  priority?: number;
  payload?: Record<string, unknown>;
}

/** Input for creating a batch plan (AI factory flow) */
export interface CreateAIFactoryBatchPlanInput {
  examTrackId: string;
  contentType: AICampaignContentType;
  targetCount: number;
  campaignId?: string | null;
  shardId?: string | null;
  systemId?: string | null;
  topicId?: string | null;
  shardKey?: string | null;
  notes?: string | null;
}

/** Input for logging a batch event */
export interface LogBatchEventInput {
  eventType: string;
  message?: string | null;
  metadata?: Record<string, unknown>;
  batchJobId?: string | null;
  batchPlanId?: string | null;
  campaignId?: string | null;
  shardId?: string | null;
  logLevel?: "debug" | "info" | "warn" | "error";
  errorCode?: string | null;
  attemptNumber?: number;
}

export interface CampaignResult {
  success: boolean;
  id?: string;
  error?: string;
}

export interface ShardResult {
  success: boolean;
  id?: string;
  error?: string;
}

export interface BatchPlanResult {
  success: boolean;
  id?: string;
  error?: string;
}

export interface LogResult {
  success: boolean;
  id?: string;
  error?: string;
}

/** Validate track exists */
async function validateTrack(trackId: string): Promise<{ valid: boolean; error?: string }> {
  if (!isSupabaseServiceRoleConfigured()) return { valid: false, error: "Database not configured" };
  const supabase = createServiceClient();
  const { data, error } = await supabase.from("exam_tracks").select("id").eq("id", trackId).maybeSingle();
  if (error) return { valid: false, error: error.message };
  if (!data) return { valid: false, error: "Track not found" };
  return { valid: true };
}

/** Validate system belongs to track */
async function validateSystemBelongsToTrack(
  systemId: string,
  trackId: string
): Promise<{ valid: boolean; error?: string }> {
  if (!isSupabaseServiceRoleConfigured()) return { valid: false, error: "Database not configured" };
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("systems")
    .select("id, exam_track_id")
    .eq("id", systemId)
    .eq("exam_track_id", trackId)
    .maybeSingle();
  if (error) return { valid: false, error: error.message };
  if (!data) return { valid: false, error: "System not found or does not belong to track" };
  return { valid: true };
}

/** Validate topic exists and belongs to valid domain/system context */
async function validateTopic(topicId: string): Promise<{ valid: boolean; error?: string }> {
  if (!isSupabaseServiceRoleConfigured()) return { valid: false, error: "Database not configured" };
  const supabase = createServiceClient();
  const { data, error } = await supabase.from("topics").select("id").eq("id", topicId).maybeSingle();
  if (error) return { valid: false, error: error.message };
  if (!data) return { valid: false, error: "Topic not found" };
  return { valid: true };
}

/** Create an AI generation campaign */
export async function createAIGenerationCampaign(
  input: CreateAIGenerationCampaignInput
): Promise<CampaignResult> {
  const guard = await withAdminAIGuard();
  if (!guard.allowed) return { success: false, error: guard.error };
  if (!isSupabaseServiceRoleConfigured()) return { success: false, error: "Database not configured" };

  const name = input.name?.trim();
  if (!name) return { success: false, error: "Campaign name is required" };

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("ai_generation_campaigns")
      .insert({
        name,
        status: input.status ?? "draft",
        config: input.config ?? {},
        created_by: guard.userId,
      })
      .select("id")
      .single();

    if (error) return { success: false, error: error.message };

    await logBatchEventInternal({
      eventType: "campaign_created",
      message: `Campaign created: ${name}`,
      metadata: { campaignId: data.id, name },
      campaignId: data.id,
      createdBy: guard.userId,
    });

    revalidatePath("/admin/ai-factory");
    return { success: true, id: data.id };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/** Create an AI generation shard */
export async function createAIGenerationShard(input: CreateAIGenerationShardInput): Promise<ShardResult> {
  const guard = await withAdminAIGuard();
  if (!guard.allowed) return { success: false, error: guard.error };
  if (!isSupabaseServiceRoleConfigured()) return { success: false, error: "Database not configured" };

  if (!SUPPORTED_CONTENT_TYPES.includes(input.contentType)) {
    return { success: false, error: `Unsupported content_type: ${input.contentType}` };
  }
  if (input.targetCount <= 0) {
    return { success: false, error: "target_count must be > 0" };
  }

  const trackCheck = await validateTrack(input.examTrackId);
  if (!trackCheck.valid) return { success: false, error: trackCheck.error };

  if (input.systemId) {
    const sysCheck = await validateSystemBelongsToTrack(input.systemId, input.examTrackId);
    if (!sysCheck.valid) return { success: false, error: sysCheck.error };
  }
  if (input.topicId) {
    const topicCheck = await validateTopic(input.topicId);
    if (!topicCheck.valid) return { success: false, error: topicCheck.error };
  }

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("ai_generation_shards")
      .insert({
        campaign_id: input.campaignId,
        exam_track_id: input.examTrackId,
        content_type: input.contentType,
        shard_key: input.shardKey,
        target_count: input.targetCount,
        system_id: input.systemId ?? null,
        topic_id: input.topicId ?? null,
        priority: input.priority ?? 100,
        payload: input.payload ?? {},
        status: "pending",
      })
      .select("id")
      .single();

    if (error) return { success: false, error: error.message };

    await logBatchEventInternal({
      eventType: "shard_created",
      message: `Shard created: ${input.contentType} x${input.targetCount}`,
      metadata: { shardId: data.id, contentType: input.contentType, targetCount: input.targetCount },
      campaignId: input.campaignId,
      shardId: data.id,
      createdBy: guard.userId,
    });

    revalidatePath("/admin/ai-factory");
    return { success: true, id: data.id };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/** Create a batch plan for AI factory (with campaign/shard linkage) */
export async function createAIFactoryBatchPlan(input: CreateAIFactoryBatchPlanInput): Promise<BatchPlanResult> {
  const guard = await withAdminAIGuard();
  if (!guard.allowed) return { success: false, error: guard.error };
  if (!isSupabaseServiceRoleConfigured()) return { success: false, error: "Database not configured" };

  if (!SUPPORTED_CONTENT_TYPES.includes(input.contentType)) {
    return { success: false, error: `Unsupported content_type: ${input.contentType}` };
  }
  if (input.targetCount <= 0) {
    return { success: false, error: "target_count must be > 0" };
  }

  const trackCheck = await validateTrack(input.examTrackId);
  if (!trackCheck.valid) return { success: false, error: trackCheck.error };

  if (input.systemId) {
    const sysCheck = await validateSystemBelongsToTrack(input.systemId, input.examTrackId);
    if (!sysCheck.valid) return { success: false, error: sysCheck.error };
  }
  if (input.topicId) {
    const topicCheck = await validateTopic(input.topicId);
    if (!topicCheck.valid) return { success: false, error: topicCheck.error };
  }

  try {
    const supabase = createServiceClient();
    const row: Record<string, unknown> = {
      exam_track_id: input.examTrackId,
      content_type: input.contentType,
      target_count: input.targetCount,
      system_id: input.systemId ?? null,
      topic_id: input.topicId ?? null,
      campaign_id: input.campaignId ?? null,
      shard_id: input.shardId ?? null,
      shard_key: input.shardKey ?? null,
      notes: input.notes?.trim() || null,
      status: "planned",
      target_questions: 0,
      target_guides: 0,
      target_decks: 0,
      target_videos: 0,
      target_high_yield: 0,
      generated_count: 0,
      saved_count: 0,
      failed_count: 0,
      duplicate_count: 0,
      retry_count: 0,
      owner_id: guard.userId,
    };

    const { data, error } = await supabase.from("batch_plans").insert(row).select("id").single();

    if (error) return { success: false, error: error.message };

    await logBatchEventInternal({
      eventType: "batch_created",
      message: `Batch plan created: ${input.contentType} x${input.targetCount}`,
      metadata: {
        batchPlanId: data.id,
        contentType: input.contentType,
        targetCount: input.targetCount,
        campaignId: input.campaignId,
        shardId: input.shardId,
      },
      batchPlanId: data.id,
      campaignId: input.campaignId ?? undefined,
      shardId: input.shardId ?? undefined,
      createdBy: guard.userId,
    });

    revalidatePath("/admin/ai-factory");
    revalidatePath("/admin/batch-planner");
    return { success: true, id: data.id };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/** Log a batch event to ai_batch_job_logs */
export async function logBatchEvent(input: LogBatchEventInput): Promise<LogResult> {
  const guard = await withAdminAIGuard();
  if (!guard.allowed) return { success: false, error: guard.error };
  if (!isSupabaseServiceRoleConfigured()) return { success: false, error: "Database not configured" };

  const result = await logBatchEventInternal({
    ...input,
    createdBy: undefined,
  });
  return result;
}

/** Internal log helper (used by other actions, accepts optional createdBy) */
async function logBatchEventInternal(
  input: LogBatchEventInput & { createdBy?: string }
): Promise<LogResult> {
  if (!isSupabaseServiceRoleConfigured()) return { success: false, error: "Database not configured" };
  if (!input.eventType?.trim()) return { success: false, error: "event_type is required" };

  try {
    const supabase = createServiceClient();
    const row: Record<string, unknown> = {
      event_type: input.eventType,
      message: input.message ?? null,
      metadata: input.metadata ?? {},
      log_level: input.logLevel ?? "info",
      error_code: input.errorCode ?? null,
      attempt_number: input.attemptNumber ?? 0,
      batch_job_id: input.batchJobId ?? null,
      batch_plan_id: input.batchPlanId ?? null,
      campaign_id: input.campaignId ?? null,
      shard_id: input.shardId ?? null,
    };

    const { data, error } = await supabase.from("ai_batch_job_logs").insert(row).select("id").single();

    if (error) return { success: false, error: error.message };
    return { success: true, id: data.id };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/** Create campaign + batch plans for a quick-start preset */
export interface CreatePresetCampaignInput {
  presetId: string;
  trackId: string;
  trackSlug: string;
  contentType: AICampaignContentType;
  targetCount: number;
  systemId?: string | null;
  topicId?: string | null;
  systemIds?: string[];
  topicIds?: string[];
}

export interface CreatePresetCampaignResult {
  success: boolean;
  campaignId?: string;
  batchPlanIds?: string[];
  shardIds?: string[];
  error?: string;
}

/** Create one campaign and one or more batch_plans for a quick-start preset */
export async function createPresetCampaignWithBatches(
  input: CreatePresetCampaignInput
): Promise<CreatePresetCampaignResult> {
  const guard = await withAdminAIGuard();
  if (!guard.allowed) return { success: false, error: guard.error };

  const trackCheck = await validateTrack(input.trackId);
  if (!trackCheck.valid) return { success: false, error: trackCheck.error };

  if (input.systemId) {
    const sysCheck = await validateSystemBelongsToTrack(input.systemId, input.trackId);
    if (!sysCheck.valid) return { success: false, error: sysCheck.error };
  }
  if (input.topicId) {
    const topicCheck = await validateTopic(input.topicId);
    if (!topicCheck.valid) return { success: false, error: topicCheck.error };
  }

  if (input.targetCount <= 0) return { success: false, error: "target_count must be > 0" };
  if (!SUPPORTED_CONTENT_TYPES.includes(input.contentType)) {
    return { success: false, error: `Unsupported content_type: ${input.contentType}` };
  }

  try {
    const campaignName = `Preset: ${input.presetId} - ${input.trackSlug} ${input.contentType}`;
    const campaignResult = await createAIGenerationCampaign({
      name: campaignName,
      config: {
        presetId: input.presetId,
        trackId: input.trackId,
        trackSlug: input.trackSlug,
        contentType: input.contentType,
        targetCount: input.targetCount,
        systemIds: input.systemIds,
        topicIds: input.topicIds,
      },
      status: "planned",
    });

    if (!campaignResult.success || !campaignResult.id) {
      return { success: false, error: campaignResult.error ?? "Failed to create campaign" };
    }

    const campaignId = campaignResult.id;
    const batchPlanIds: string[] = [];
    const shardIds: string[] = [];

    const shardKey = `${input.contentType}-${input.trackSlug}-${input.systemId ?? "all"}-${input.topicId ?? "all"}`;
    const shardResult = await createAIGenerationShard({
      campaignId,
      examTrackId: input.trackId,
      contentType: input.contentType,
      shardKey,
      targetCount: input.targetCount,
      systemId: input.systemId ?? null,
      topicId: input.topicId ?? null,
      priority: 100,
      payload: { presetId: input.presetId },
    });

    if (shardResult.success && shardResult.id) {
      shardIds.push(shardResult.id);
    }

    const batchResult = await createAIFactoryBatchPlan({
      examTrackId: input.trackId,
      contentType: input.contentType,
      targetCount: input.targetCount,
      campaignId,
      shardId: shardResult.success ? shardResult.id : null,
      systemId: input.systemId ?? null,
      topicId: input.topicId ?? null,
      shardKey,
      notes: `Preset: ${input.presetId}`,
    });

    if (batchResult.success && batchResult.id) {
      batchPlanIds.push(batchResult.id);
    }

    await logBatchEventInternal({
      eventType: "batch_launch_requested",
      message: `Preset campaign launched: ${input.presetId}`,
      metadata: {
        presetId: input.presetId,
        campaignId,
        batchPlanIds,
        shardIds,
        contentType: input.contentType,
        targetCount: input.targetCount,
      },
      campaignId,
      createdBy: guard.userId,
    });

    return {
      success: true,
      campaignId,
      batchPlanIds,
      shardIds,
    };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}
