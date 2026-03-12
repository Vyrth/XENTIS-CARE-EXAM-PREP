/**
 * AI Content Factory - Batch Plan Worker
 *
 * Processes pending batch_plans safely with:
 * - Atomic locking (locked_at, locked_by)
 * - Stale lock reclaim after timeout
 * - Chunked processing per content type
 * - Rate limiting, retries, progress tracking
 * - ai_batch_job_logs audit trail
 */

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";
import {
  processQuestionBatchPlan,
  processStudyGuideBatchPlan,
  processFlashcardBatchPlan,
  processHighYieldBatchPlan,
} from "./batch-plan-processors";
import { getBackoffMs } from "./production-pipeline-config";

export type BatchPlanContentType =
  | "question"
  | "study_guide"
  | "flashcard_deck"
  | "flashcard_batch"
  | "high_yield_summary"
  | "high_yield_batch";

export interface BatchPlanRow {
  id: string;
  exam_track_id: string;
  system_id: string | null;
  topic_id: string | null;
  content_type: string | null;
  target_count: number;
  generated_count: number;
  saved_count: number;
  failed_count: number;
  duplicate_count: number;
  retry_count: number;
  rate_limit_ms: number;
  locked_at: string | null;
  locked_by: string | null;
  started_at: string | null;
  completed_at: string | null;
  last_error: string | null;
  campaign_id: string | null;
  shard_id: string | null;
}

/** Lock timeout: reclaim if locked > 15 min with no progress */
const LOCK_STALE_MS = 15 * 60 * 1000;

/** Skip if locked within last 30s (another worker just claimed) */
const LOCK_FRESH_MS = 30 * 1000;

const WORKER_ID = `worker-${process.pid}-${Date.now()}`;

export interface BatchPlanWorkerConfig {
  rateLimitMs?: number;
  maxRetries?: number;
  lockStaleMs?: number;
  lockFreshMs?: number;
}

export interface ProcessNextBatchPlanResult {
  processed: boolean;
  batchPlanId?: string;
  error?: string;
}

/** Log batch plan event to ai_batch_job_logs */
export async function logBatchPlanEvent(
  batchPlanId: string,
  eventType: string,
  message?: string,
  metadata?: Record<string, unknown>,
  campaignId?: string | null,
  shardId?: string | null
): Promise<void> {
  if (!isSupabaseServiceRoleConfigured()) return;
  try {
    const supabase = createServiceClient();
    await supabase.from("ai_batch_job_logs").insert({
      batch_plan_id: batchPlanId,
      campaign_id: campaignId ?? null,
      shard_id: shardId ?? null,
      event_type: eventType,
      message: message ?? null,
      metadata: metadata ?? {},
    });
  } catch {
    // ignore
  }
}

/** Fire-and-forget log for hot paths */
export function queueSafeLogBatchPlanEvent(
  batchPlanId: string,
  eventType: string,
  message?: string,
  metadata?: Record<string, unknown>,
  campaignId?: string | null,
  shardId?: string | null
): void {
  if (!isSupabaseServiceRoleConfigured()) return;
  const supabase = createServiceClient();
  supabase
    .from("ai_batch_job_logs")
    .insert({
      batch_plan_id: batchPlanId,
      campaign_id: campaignId ?? null,
      shard_id: shardId ?? null,
      event_type: eventType,
      message: message ?? null,
      metadata: metadata ?? {},
    })
    .then(() => {})
    .then(undefined, (err: unknown) =>
      console.warn("[batch-plan-worker] log failed:", err instanceof Error ? err.message : err)
    );
}

/** Update batch_plan progress */
async function updateBatchPlanProgress(
  batchPlanId: string,
  updates: {
    generated_count?: number;
    saved_count?: number;
    failed_count?: number;
    duplicate_count?: number;
    retry_count?: number;
    status?: string;
    last_error?: string | null;
    completed_at?: string | null;
    started_at?: string | null;
    locked_at?: string | null;
    locked_by?: string | null;
  }
): Promise<void> {
  if (!isSupabaseServiceRoleConfigured()) return;
  try {
    const supabase = createServiceClient();
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.generated_count != null) payload.generated_count = updates.generated_count;
    if (updates.saved_count != null) payload.saved_count = updates.saved_count;
    if (updates.failed_count != null) payload.failed_count = updates.failed_count;
    if (updates.duplicate_count != null) payload.duplicate_count = updates.duplicate_count;
    if (updates.retry_count != null) payload.retry_count = updates.retry_count;
    if (updates.status) payload.status = updates.status;
    if (updates.last_error !== undefined) payload.last_error = updates.last_error;
    if (updates.completed_at !== undefined) payload.completed_at = updates.completed_at;
    if (updates.started_at !== undefined) payload.started_at = updates.started_at;
    if (updates.locked_at !== undefined) payload.locked_at = updates.locked_at;
    if (updates.locked_by !== undefined) payload.locked_by = updates.locked_by;
    await supabase.from("batch_plans").update(payload).eq("id", batchPlanId);
  } catch {
    // ignore
  }
}

/**
 * Atomically claim the next runnable batch_plan.
 * - Skips plans locked within LOCK_FRESH_MS (another worker just claimed)
 * - Reclaims plans locked > LOCK_STALE_MS (stale lock)
 * - Only one worker can claim a given plan
 */
export async function claimNextPendingBatchPlan(
  config?: BatchPlanWorkerConfig
): Promise<BatchPlanRow | null> {
  if (!isSupabaseServiceRoleConfigured()) return null;
  const lockStaleMs = config?.lockStaleMs ?? LOCK_STALE_MS;
  const lockFreshMs = config?.lockFreshMs ?? LOCK_FRESH_MS;
  const now = new Date();
  const staleThreshold = new Date(now.getTime() - lockStaleMs).toISOString();
  const freshThreshold = new Date(now.getTime() - lockFreshMs).toISOString();

  try {
    const supabase = createServiceClient();

    // 1. Try planned first (no lock contention)
    const { data: planned } = await supabase
      .from("batch_plans")
      .select("id, exam_track_id, system_id, topic_id, content_type, target_count, generated_count, saved_count, failed_count, duplicate_count, retry_count, rate_limit_ms, locked_at, locked_by, started_at, completed_at, last_error, campaign_id, shard_id")
      .eq("status", "planned")
      .not("content_type", "is", null)
      .gt("target_count", 0)
      .order("created_at", { ascending: true })
      .limit(5);

    for (const row of planned ?? []) {
      const { data: claimed } = await supabase
        .from("batch_plans")
        .update({
          status: "in_progress",
          locked_at: now.toISOString(),
          locked_by: WORKER_ID,
          started_at: row.started_at ?? now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq("id", row.id)
        .eq("status", "planned")
        .select()
        .maybeSingle();

      if (claimed) return claimed as BatchPlanRow;
    }

    // 2. Try reclaiming stale in_progress (locked > stale threshold or never locked)
    const { data: stale } = await supabase
      .from("batch_plans")
      .select("id, exam_track_id, system_id, topic_id, content_type, target_count, generated_count, saved_count, failed_count, duplicate_count, retry_count, rate_limit_ms, locked_at, locked_by, started_at, completed_at, last_error, campaign_id, shard_id")
      .eq("status", "in_progress")
      .not("content_type", "is", null)
      .gt("target_count", 0)
      .or(`locked_at.is.null,locked_at.lt.${staleThreshold}`)
      .order("created_at", { ascending: true })
      .limit(5);

    for (const row of stale ?? []) {
      if (row.locked_at && row.locked_at > freshThreshold) continue;
      const { data: claimed } = await supabase
        .from("batch_plans")
        .update({
          locked_at: now.toISOString(),
          locked_by: WORKER_ID,
          updated_at: now.toISOString(),
        })
        .eq("id", row.id)
        .eq("status", "in_progress")
        .or(`locked_at.is.null,locked_at.lt.${staleThreshold}`)
        .select()
        .maybeSingle();

      if (claimed) return claimed as BatchPlanRow;
    }
    return null;
  } catch {
    return null;
  }
}

/** Release lock on batch plan (on completion or failure) */
async function releaseBatchPlanLock(
  batchPlanId: string,
  status: "completed" | "failed" | "planned"
): Promise<void> {
  if (!isSupabaseServiceRoleConfigured()) return;
  try {
    const supabase = createServiceClient();
    await supabase
      .from("batch_plans")
      .update({
        status,
        locked_at: null,
        locked_by: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", batchPlanId);
  } catch {
    // ignore
  }
}

/**
 * Process the next pending batch plan.
 * Returns batchPlanId if processed, null otherwise.
 */
export async function processNextBatchPlan(
  questionTypeId: string,
  config?: BatchPlanWorkerConfig
): Promise<ProcessNextBatchPlanResult> {
  const batchPlan = await claimNextPendingBatchPlan(config);
  if (!batchPlan) return { processed: false };

  const batchPlanId = batchPlan.id;
  const contentType = (batchPlan.content_type ?? "question") as BatchPlanContentType;
  const rateLimitMs = config?.rateLimitMs ?? batchPlan.rate_limit_ms ?? 800;
  const maxRetries = config?.maxRetries ?? 2;

  const onLog = (
    eventType: string,
    message?: string,
    meta?: Record<string, unknown>
  ) => {
    queueSafeLogBatchPlanEvent(
      batchPlanId,
      eventType,
      message,
      meta,
      batchPlan.campaign_id,
      batchPlan.shard_id
    );
  };

  const updateProgress = (updates: {
    generated_count?: number;
    saved_count?: number;
    failed_count?: number;
    duplicate_count?: number;
    retry_count?: number;
  }) => updateBatchPlanProgress(batchPlanId, updates);

  try {
    await logBatchPlanEvent(
      batchPlanId,
      "start",
      `Processing ${contentType} batch (target: ${batchPlan.target_count})`,
      { contentType, targetCount: batchPlan.target_count },
      batchPlan.campaign_id,
      batchPlan.shard_id
    );

    const runWithRetry = async <T>(fn: () => Promise<T>): Promise<T> => {
      let lastErr: unknown;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const result = await fn();
          if (attempt > 0) {
            await updateBatchPlanProgress(batchPlanId, {
              retry_count: batchPlan.retry_count + attempt,
            });
            onLog("retry", `Succeeded on attempt ${attempt + 1}`);
          }
          return result;
        } catch (e) {
          lastErr = e;
          if (attempt < maxRetries) {
            const backoff = getBackoffMs(attempt);
            onLog("retry", `Attempt ${attempt + 1} failed, retrying in ${backoff}ms`, {
              error: String(e),
              attempt: attempt + 1,
            });
            await new Promise((r) => setTimeout(r, backoff));
          }
        }
      }
      throw lastErr;
    };

    const ctx = {
      batchPlan,
      rateLimitMs,
      questionTypeId,
      onLog,
      updateProgress,
      runWithRetry,
    };

    let result: { saved: number; failed: number; duplicate: number; generated: number };
    switch (contentType) {
      case "question":
        result = await processQuestionBatchPlan(ctx);
        break;
      case "study_guide":
        result = await processStudyGuideBatchPlan(ctx);
        break;
      case "flashcard_deck":
      case "flashcard_batch":
        result = await processFlashcardBatchPlan(ctx);
        break;
      case "high_yield_summary":
      case "high_yield_batch":
        result = await processHighYieldBatchPlan(ctx);
        break;
      default:
        await updateBatchPlanProgress(batchPlanId, {
          status: "failed",
          last_error: `Unsupported content_type: ${contentType}`,
          completed_at: new Date().toISOString(),
        });
        await releaseBatchPlanLock(batchPlanId, "failed");
        onLog("failed", `Unsupported content_type: ${contentType}`);
        return { processed: true, batchPlanId, error: `Unsupported content_type: ${contentType}` };
    }

    const finalSaved = batchPlan.saved_count + result.saved;
    const finalFailed = batchPlan.failed_count + result.failed;
    const finalDuplicate = batchPlan.duplicate_count + result.duplicate;
    const finalGenerated = batchPlan.generated_count + result.generated;

    const isComplete = finalSaved + finalFailed + finalDuplicate >= batchPlan.target_count;
    const status = isComplete ? "completed" : "in_progress";

    await updateBatchPlanProgress(batchPlanId, {
      generated_count: finalGenerated,
      saved_count: finalSaved,
      failed_count: finalFailed,
      duplicate_count: finalDuplicate,
      status,
      completed_at: isComplete ? new Date().toISOString() : null,
      last_error: null,
      locked_at: null,
      locked_by: null,
    });

    if (isComplete) {
      await releaseBatchPlanLock(batchPlanId, "completed");
      await logBatchPlanEvent(
        batchPlanId,
        "completed",
        `Saved: ${finalSaved}, Failed: ${finalFailed}, Duplicate: ${finalDuplicate}`,
        { saved: finalSaved, failed: finalFailed, duplicate: finalDuplicate, generated: finalGenerated },
        batchPlan.campaign_id,
        batchPlan.shard_id
      );
    }

    return { processed: true, batchPlanId };
  } catch (e) {
    const errMsg = String(e);
    await updateBatchPlanProgress(batchPlanId, {
      status: "failed",
      last_error: errMsg,
      completed_at: new Date().toISOString(),
    });
    await releaseBatchPlanLock(batchPlanId, "failed");
    onLog("failed", errMsg, { error: errMsg });
    return { processed: true, batchPlanId, error: errMsg };
  }
}
