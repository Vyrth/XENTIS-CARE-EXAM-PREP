"use server";

import { revalidatePath } from "next/cache";
import { withAdminAIGuard } from "@/lib/auth/admin-ai-guard";
import {
  createBatchJob,
  runBatchJob,
  getBatchJobProgress,
  type BatchJobSpec,
  type BatchJobProgress,
} from "@/lib/ai/batch-engine";
import { processNextJob } from "@/lib/ai/batch-scheduler";
import { createMasterBatch } from "@/lib/ai/production-pipeline";
import type { BatchContentType } from "@/lib/ai/production-pipeline-config";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";
import {
  createAIGenerationCampaign,
  createAIGenerationShard,
  createAIFactoryBatchPlan,
  createPresetCampaignWithBatches,
  logBatchEvent,
} from "@/app/(app)/actions/ai-factory-campaign";

export type { BatchJobProgress };

export interface CreateAIBatchJobInput {
  trackId: string;
  trackSlug: string;
  contentType: "question" | "study_guide" | "flashcard_deck" | "flashcard_batch" | "high_yield_summary" | "high_yield_batch";
  topicIds?: string[];
  systemIds?: string[];
  targetCount: number;
  quantityPerTopic?: number;
  difficultyDistribution?: Record<number, number>;
  boardFocus?: string;
  itemTypeSlug?: string;
  studyGuideMode?: "full" | "section_pack";
  sectionCount?: number;
  flashcardDeckMode?: "rapid_recall" | "high_yield_clinical";
  flashcardStyle?: string;
  cardCount?: number;
  highYieldType?: "high_yield_summary" | "common_confusion" | "board_trap" | "compare_contrast_summary";
}

export interface CreateAIBatchJobResult {
  success: boolean;
  jobId?: string;
  error?: string;
}

export interface CreateMasterBatchInput {
  name?: string;
  trackIds: string[];
  contentType: BatchContentType;
  targetPerTrack: number;
  systemIds?: string[];
  topicIds?: string[];
  idempotencyKey?: string;
}

export interface CreateMasterBatchResult {
  success: boolean;
  masterBatchId?: string;
  childJobIds?: string[];
  error?: string;
}

export async function createMasterBatchAction(input: CreateMasterBatchInput): Promise<CreateMasterBatchResult> {
  const guard = await withAdminAIGuard();
  if (!guard.allowed) return { success: false, error: guard.error };
  if (!input.trackIds.length) return { success: false, error: "At least one track required" };

  const tracks = await loadTracksByIds(input.trackIds);
  if (!tracks.length) return { success: false, error: "No valid tracks found" };

  return createMasterBatch({
    name: input.name,
    tracks,
    contentType: input.contentType,
    targetPerTrack: input.targetPerTrack,
    systemIds: input.systemIds,
    topicIds: input.topicIds,
    createdBy: guard.userId,
    idempotencyKey: input.idempotencyKey,
  });
}

async function loadTracksByIds(ids: string[]): Promise<{ id: string; slug: string }[]> {
  if (!isSupabaseServiceRoleConfigured()) return [];
  const supabase = createServiceClient();
  const { data } = await supabase.from("exam_tracks").select("id, slug").in("id", ids);
  return (data ?? []).map((t) => ({ id: t.id, slug: t.slug ?? "rn" }));
}

export async function createAIBatchJobAction(input: CreateAIBatchJobInput): Promise<CreateAIBatchJobResult> {
  const guard = await withAdminAIGuard();
  if (!guard.allowed) return { success: false, error: guard.error };
  const spec: BatchJobSpec = {
    trackId: input.trackId,
    trackSlug: input.trackSlug,
    contentType: input.contentType,
    topicIds: input.topicIds,
    systemIds: input.systemIds,
    targetCount: input.targetCount,
    quantityPerTopic: input.quantityPerTopic,
    difficultyDistribution: input.difficultyDistribution,
    boardFocus: input.boardFocus,
    itemTypeSlug: input.itemTypeSlug ?? "single_best_answer",
    studyGuideMode: input.studyGuideMode ?? "section_pack",
    sectionCount: input.sectionCount ?? 4,
    flashcardDeckMode: input.flashcardDeckMode ?? "rapid_recall",
    flashcardStyle: input.flashcardStyle ?? "rapid_recall",
    cardCount: input.cardCount ?? (input.contentType === "flashcard_batch" ? 20 : 8),
    highYieldType: input.highYieldType ?? "high_yield_summary",
  };
  const jobId = await createBatchJob(spec, guard.userId);
  if (!jobId) return { success: false, error: "Failed to create batch job" };
  return { success: true, jobId };
}

export interface LaunchAIFactoryBatchInput extends CreateAIBatchJobInput {
  /** Optional: create campaign + shard + batch_plan records (default: true) */
  createCampaignRecords?: boolean;
}

export interface LaunchAIFactoryBatchResult {
  success: boolean;
  jobId?: string;
  campaignId?: string;
  batchPlanIds?: string[];
  shardIds?: string[];
  error?: string;
}

/** Launch batch with full campaign + shard + batch_plan + ai_batch_job + audit log */
export async function launchAIFactoryBatchAction(
  input: LaunchAIFactoryBatchInput
): Promise<LaunchAIFactoryBatchResult> {
  const guard = await withAdminAIGuard();
  if (!guard.allowed) return { success: false, error: guard.error };

  const createRecords = input.createCampaignRecords !== false;
  let campaignId: string | undefined;
  const batchPlanIds: string[] = [];
  const shardIds: string[] = [];

  if (createRecords) {
    const campaignName = `Batch: ${input.trackSlug} ${input.contentType} x${input.targetCount}`;
    const campaignResult = await createAIGenerationCampaign({
      name: campaignName,
      config: {
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
    campaignId = campaignResult.id;

    const systemId = input.systemIds?.[0] ?? null;
    const topicId = input.topicIds?.[0] ?? null;
    const shardKey = `${input.contentType}-${input.trackSlug}-${systemId ?? "all"}-${topicId ?? "all"}-${Date.now()}`;

    const shardResult = await createAIGenerationShard({
      campaignId,
      examTrackId: input.trackId,
      contentType: input.contentType as "question" | "study_guide" | "flashcard_deck" | "flashcard_batch" | "high_yield_summary" | "high_yield_batch",
      shardKey,
      targetCount: input.targetCount,
      systemId,
      topicId,
      priority: 100,
      payload: { systemIds: input.systemIds, topicIds: input.topicIds },
    });
    if (shardResult.success && shardResult.id) shardIds.push(shardResult.id);

    const batchResult = await createAIFactoryBatchPlan({
      examTrackId: input.trackId,
      contentType: input.contentType as "question" | "study_guide" | "flashcard_deck" | "flashcard_batch" | "high_yield_summary" | "high_yield_batch",
      targetCount: input.targetCount,
      campaignId,
      shardId: shardResult.success ? shardResult.id : null,
      systemId,
      topicId,
      shardKey,
      notes: campaignName,
    });
    if (batchResult.success && batchResult.id) batchPlanIds.push(batchResult.id);
  }

  const spec: BatchJobSpec = {
    trackId: input.trackId,
    trackSlug: input.trackSlug,
    contentType: input.contentType,
    topicIds: input.topicIds,
    systemIds: input.systemIds,
    targetCount: input.targetCount,
    quantityPerTopic: input.quantityPerTopic,
    difficultyDistribution: input.difficultyDistribution,
    boardFocus: input.boardFocus,
    itemTypeSlug: input.itemTypeSlug ?? "single_best_answer",
    studyGuideMode: input.studyGuideMode ?? "section_pack",
    sectionCount: input.sectionCount ?? 4,
    flashcardDeckMode: input.flashcardDeckMode ?? "rapid_recall",
    flashcardStyle: input.flashcardStyle ?? "rapid_recall",
    cardCount: input.cardCount ?? (input.contentType === "flashcard_batch" ? 20 : 8),
    highYieldType: input.highYieldType ?? "high_yield_summary",
  };
  const jobId = await createBatchJob(spec, guard.userId);
  if (!jobId) return { success: false, error: "Failed to create batch job", campaignId, batchPlanIds, shardIds };

  if (createRecords) {
    await logBatchEvent({
      eventType: "batch_launch_requested",
      message: `Batch launched: ${input.contentType} x${input.targetCount}`,
      metadata: {
        jobId,
        campaignId,
        batchPlanIds,
        shardIds,
        contentType: input.contentType,
        targetCount: input.targetCount,
      },
      batchJobId: jobId,
      batchPlanId: batchPlanIds[0] ?? null,
      campaignId: campaignId ?? null,
      shardId: shardIds[0] ?? null,
    });
  }

  revalidatePath("/admin/ai-factory");
  return { success: true, jobId, campaignId, batchPlanIds, shardIds };
}

export interface LaunchPresetBatchInput {
  presetId: string;
  trackId: string;
  trackSlug: string;
  contentType: "question" | "study_guide" | "flashcard_deck" | "flashcard_batch" | "high_yield_summary" | "high_yield_batch";
  targetCount: number;
  systemId?: string | null;
  topicId?: string | null;
  systemIds?: string[];
  topicIds?: string[];
  boardFocus?: string;
  itemTypeSlug?: string;
  studyGuideMode?: "full" | "section_pack";
  sectionCount?: number;
  flashcardDeckMode?: "rapid_recall" | "high_yield_clinical";
  flashcardStyle?: string;
  cardCount?: number;
  highYieldType?: string;
}

export interface LaunchPresetBatchResult {
  success: boolean;
  jobId?: string;
  campaignId?: string;
  batchPlanIds?: string[];
  shardIds?: string[];
  error?: string;
}

/** Launch batch from quick-start preset: campaign + shard + batch_plan + ai_batch_job */
export async function launchPresetBatchAction(
  input: LaunchPresetBatchInput
): Promise<LaunchPresetBatchResult> {
  const guard = await withAdminAIGuard();
  if (!guard.allowed) return { success: false, error: guard.error };

  const campaignResult = await createPresetCampaignWithBatches({
    presetId: input.presetId,
    trackId: input.trackId,
    trackSlug: input.trackSlug,
    contentType: input.contentType,
    targetCount: input.targetCount,
    systemId: input.systemId ?? null,
    topicId: input.topicId ?? null,
    systemIds: input.systemIds,
    topicIds: input.topicIds,
  });

  if (!campaignResult.success) {
    return { success: false, error: campaignResult.error };
  }

  const jobResult = await launchAIFactoryBatchAction({
    trackId: input.trackId,
    trackSlug: input.trackSlug,
    contentType: input.contentType,
    targetCount: input.targetCount,
    systemIds: input.systemIds,
    topicIds: input.topicIds,
    createCampaignRecords: false,
    boardFocus: input.boardFocus,
    itemTypeSlug: input.itemTypeSlug,
    studyGuideMode: input.studyGuideMode,
    sectionCount: input.sectionCount,
    flashcardDeckMode: input.flashcardDeckMode as "rapid_recall" | "high_yield_clinical" | undefined,
    flashcardStyle: input.flashcardStyle,
    cardCount: input.cardCount,
    highYieldType: input.highYieldType as "high_yield_summary" | "common_confusion" | "board_trap" | "compare_contrast_summary" | undefined,
  });

  if (!jobResult.success) {
    return {
      success: false,
      error: jobResult.error,
      campaignId: campaignResult.campaignId,
      batchPlanIds: campaignResult.batchPlanIds,
      shardIds: campaignResult.shardIds,
    };
  }

  return {
    success: true,
    jobId: jobResult.jobId,
    campaignId: campaignResult.campaignId,
    batchPlanIds: campaignResult.batchPlanIds,
    shardIds: campaignResult.shardIds,
  };
}

export interface RunAIBatchJobResult {
  success: boolean;
  jobId?: string;
  progress?: BatchJobProgress;
  error?: string;
}

export async function runAIBatchJobAction(
  jobId: string,
  questionTypeId: string | null
): Promise<RunAIBatchJobResult> {
  const guard = await withAdminAIGuard();
  if (!guard.allowed) return { success: false, error: guard.error };
  const result = await runBatchJob(jobId, questionTypeId ?? "");
  return {
    success: result.success,
    jobId: result.jobId,
    progress: result.progress,
    error: result.error,
  };
}

export async function getAIBatchJobProgressAction(jobId: string): Promise<BatchJobProgress | null> {
  const guard = await withAdminAIGuard();
  if (!guard.allowed) return null;
  return getBatchJobProgress(jobId);
}

export interface ProcessQueueResult {
  processed: boolean;
  jobId?: string;
  error?: string;
}

/** Process next job in queue (background scheduler). Rate-limited, with retries. */
export async function processBatchQueueAction(questionTypeId: string | null): Promise<ProcessQueueResult> {
  const guard = await withAdminAIGuard();
  if (!guard.allowed) return { processed: false, error: guard.error };
  const result = await processNextJob(questionTypeId ?? "", { rateLimitMs: 800, maxRetries: 2 });
  return {
    processed: result.processed,
    jobId: result.jobId,
    error: result.error,
  };
}

export interface AIBatchJobSummary {
  id: string;
  examTrackId: string;
  contentType: string;
  targetCount: number;
  completedCount: number;
  failedCount: number;
  generatedCount: number;
  skippedDuplicateCount: number;
  retryCount: number;
  status: string;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  latestLogMessage?: string | null;
  trackSlug?: string;
  trackName?: string;
}

export async function loadAIBatchJobs(limit = 20): Promise<AIBatchJobSummary[]> {
  const guard = await withAdminAIGuard();
  if (!guard.allowed) return [];
  if (!isSupabaseServiceRoleConfigured()) return [];
  try {
    const supabase = createServiceClient();
    const { data: jobs } = await supabase
      .from("ai_batch_jobs")
      .select("id, exam_track_id, content_type, target_count, completed_count, failed_count, generated_count, skipped_duplicate_count, retry_count, status, created_at, started_at, completed_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (!jobs?.length) return [];
    const trackIds = [...new Set(jobs.map((j) => j.exam_track_id))];
    const { data: tracks } = await supabase.from("exam_tracks").select("id, slug, name").in("id", trackIds);
    const trackMap = new Map((tracks ?? []).map((t) => [t.id, t]));

    const jobIds = jobs.map((j) => j.id);
    const { data: latestLogs } = await supabase
      .from("ai_batch_job_logs")
      .select("batch_job_id, message")
      .in("batch_job_id", jobIds)
      .order("created_at", { ascending: false })
      .limit(100);
    const logByJob = new Map<string, string>();
    for (const log of latestLogs ?? []) {
      const bid = (log as { batch_job_id?: string }).batch_job_id;
      if (bid && !logByJob.has(bid)) logByJob.set(bid, (log as { message?: string }).message ?? "");
    }

    return jobs.map((j) => {
      const track = trackMap.get(j.exam_track_id);
      return {
        id: j.id,
        examTrackId: j.exam_track_id,
        contentType: j.content_type,
        targetCount: j.target_count ?? 0,
        completedCount: j.completed_count ?? 0,
        failedCount: j.failed_count ?? 0,
        generatedCount: j.generated_count ?? 0,
        skippedDuplicateCount: j.skipped_duplicate_count ?? 0,
        retryCount: j.retry_count ?? 0,
        status: j.status ?? "pending",
        createdAt: j.created_at,
        startedAt: j.started_at,
        completedAt: j.completed_at,
        latestLogMessage: logByJob.get(j.id) ?? null,
        trackSlug: track?.slug,
        trackName: track?.name,
      };
    });
  } catch {
    return [];
  }
}

export async function requeueBatchJobAction(jobId: string): Promise<{ success: boolean; error?: string }> {
  const guard = await withAdminAIGuard();
  if (!guard.allowed) return { success: false, error: guard.error };
  if (!isSupabaseServiceRoleConfigured()) return { success: false, error: "Database not configured" };
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("ai_batch_jobs")
      .update({
        status: "pending",
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId)
      .eq("status", "failed")
      .select("id")
      .maybeSingle();
    if (error) return { success: false, error: error.message };
    if (!data) return { success: false, error: "Job not found or not failed" };
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function cancelBatchJobAction(jobId: string): Promise<{ success: boolean; error?: string }> {
  const guard = await withAdminAIGuard();
  if (!guard.allowed) return { success: false, error: guard.error };
  if (!isSupabaseServiceRoleConfigured()) return { success: false, error: "Database not configured" };
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("ai_batch_jobs")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (error) return { success: false, error: error.message };
    if (!data) return { success: false, error: "Job not found or not pending" };
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}
