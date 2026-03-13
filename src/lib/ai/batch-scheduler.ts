/**
 * AI Content Production - Background Job Scheduler
 *
 * - Queue generation jobs (pending status)
 * - Concurrency control: max per track, max global
 * - Rate limiting: delay between generations
 * - Retry failed generations with exponential backoff
 * - Log results to ai_batch_job_logs
 * - Resume: claim pending/queued; running jobs with stale started_at can be reclaimed
 */

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";
import { runBatchJob } from "./batch-engine";
import { CONCURRENCY_LIMITS } from "./production-pipeline-config";
import { isCircuitOpen } from "./rate-control";

export const DEFAULT_RATE_LIMIT_MS = CONCURRENCY_LIMITS.rateLimitMs;
export const MAX_RETRIES_PER_ITEM = CONCURRENCY_LIMITS.maxRetriesPerItem;
/** Max job-level retries (retry failed shards). Prevents runaway retries. */
export const MAX_JOB_RETRIES = 5;
/** Stale running job threshold: reclaim jobs stuck in running longer than this (ms) */
const STALE_RUNNING_MS = 15 * 60 * 1000;

export interface SchedulerConfig {
  /** Delay between API calls (ms) to prevent overload */
  rateLimitMs?: number;
  /** Max retries per failed item */
  maxRetries?: number;
  /** Use concurrency limits (per-track, global) */
  useConcurrencyLimits?: boolean;
}

/** Log levels for ai_batch_job_logs */
export type BatchLogLevel = "info" | "warn" | "error";

/** Log a batch job event (awaitable). campaignId in metadata. log_level and error_code for observability. */
export async function logBatchJobEvent(
  jobId: string,
  eventType: string,
  message?: string,
  metadata?: Record<string, unknown>,
  campaignId?: string | null,
  logLevel?: BatchLogLevel,
  errorCode?: string | null
): Promise<void> {
  if (!isSupabaseServiceRoleConfigured()) return;
  try {
    const supabase = createServiceClient();
    const meta = { ...metadata, ...(campaignId ? { campaignId } : {}) };
    const isError = eventType === "failed" || eventType === "generation_failed" || eventType === "save_error" || eventType === "dead_letter";
    const level = logLevel ?? (isError ? "error" : "info");
    await supabase.from("ai_batch_job_logs").insert({
      batch_job_id: jobId,
      event_type: eventType,
      message: message ?? null,
      metadata: meta,
      log_level: level,
      error_code: errorCode ?? (isError ? (metadata?.errorCode as string) ?? "unknown" : null),
    });
  } catch {
    // ignore
  }
}

/** Queue-safe logging: fire-and-forget, never blocks. Use in hot paths. */
export function queueSafeLogBatchJobEvent(
  jobId: string,
  eventType: string,
  message?: string,
  metadata?: Record<string, unknown>,
  campaignId?: string | null,
  logLevel?: BatchLogLevel,
  errorCode?: string | null
): void {
  if (!isSupabaseServiceRoleConfigured()) return;
  const supabase = createServiceClient();
  const meta = { ...metadata, ...(campaignId ? { campaignId } : {}) };
  const isError = eventType === "failed" || eventType === "generation_failed" || eventType === "save_error" || eventType === "dead_letter";
  const level = logLevel ?? (isError ? "error" : "info");
  supabase
    .from("ai_batch_job_logs")
    .insert({
      batch_job_id: jobId,
      event_type: eventType,
      message: message ?? null,
      metadata: meta,
      log_level: level,
      error_code: errorCode ?? (isError ? (metadata?.errorCode as string) ?? "unknown" : null),
    })
    .then(() => {})
    .then(undefined, (err: unknown) =>
      console.warn("[queueSafeLog] batch_job_logs insert failed:", err instanceof Error ? err.message : err)
    );
}

/**
 * Atomically claim the next pending job.
 * With useConcurrencyLimits: respects maxConcurrentPerTrack and maxConcurrentGlobal.
 * Without: legacy single-worker behavior (only one running at a time).
 */
export async function claimNextPendingJob(useConcurrencyLimits = true): Promise<string | null> {
  if (!isSupabaseServiceRoleConfigured()) return null;
  if (isCircuitOpen()) return null;
  try {
    const supabase = createServiceClient();

    if (useConcurrencyLimits) {
      const { count: globalCount } = await supabase
        .from("ai_batch_jobs")
        .select("id", { count: "exact", head: true })
        .eq("status", "running");
      if ((globalCount ?? 0) >= CONCURRENCY_LIMITS.maxConcurrentGlobal) return null;
    } else {
      const { data: running } = await supabase
        .from("ai_batch_jobs")
        .select("id")
        .eq("status", "running")
        .limit(1)
        .maybeSingle();
      if (running) return null;
    }

    const staleThreshold = new Date(Date.now() - STALE_RUNNING_MS).toISOString();
    await supabase
      .from("ai_batch_jobs")
      .update({ status: "pending", updated_at: new Date().toISOString(), started_at: null })
      .eq("status", "running")
      .lt("started_at", staleThreshold);

    const { data: pending } = await supabase
      .from("ai_batch_jobs")
      .select("id, exam_track_id, job_retry_attempt")
      .in("status", ["pending", "queued"])
      .order("created_at", { ascending: true })
      .limit(50);

    if (!pending?.length) return null;

    for (const job of pending) {
      if ((job.job_retry_attempt ?? 0) >= MAX_JOB_RETRIES) continue;
      if (useConcurrencyLimits) {
        const { count: trackCount } = await supabase
          .from("ai_batch_jobs")
          .select("id", { count: "exact", head: true })
          .eq("exam_track_id", job.exam_track_id)
          .eq("status", "running");
        if ((trackCount ?? 0) >= CONCURRENCY_LIMITS.maxConcurrentPerTrack) continue;
      }

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
  } catch {
    return null;
  }
}

/** Process the next job in the queue. Returns jobId if processed, null otherwise. */
export async function processNextJob(
  questionTypeId: string,
  config?: SchedulerConfig
): Promise<{ processed: boolean; jobId?: string; error?: string }> {
  const useConcurrency = config?.useConcurrencyLimits ?? true;
  const jobId = await claimNextPendingJob(useConcurrency);
  if (!jobId) {
    return { processed: false };
  }
  const rateLimitMs = config?.rateLimitMs ?? DEFAULT_RATE_LIMIT_MS;
  const maxRetries = config?.maxRetries ?? MAX_RETRIES_PER_ITEM;
  try {
    await logBatchJobEvent(jobId, "claimed", "Job claimed by worker");
    await logBatchJobEvent(jobId, "started", "Job started processing");
    const result = await runBatchJob(jobId, questionTypeId, undefined, {
      rateLimitMs,
      maxRetries,
      onLog: queueSafeLogBatchJobEvent,
    });
    if (result.success) {
      await logBatchJobEvent(jobId, "completed", `Saved: ${result.progress?.completedCount ?? 0}, Failed: ${result.progress?.failedCount ?? 0}`, {
        completedCount: result.progress?.completedCount,
        failedCount: result.progress?.failedCount,
        generatedCount: result.progress?.generatedCount,
      });
    } else {
      await logBatchJobEvent(jobId, "failed", result.error, { error: result.error });
    }
    return { processed: true, jobId };
  } catch (e) {
    await logBatchJobEvent(jobId, "failed", String(e), { error: String(e) });
    return { processed: true, jobId, error: String(e) };
  }
}
