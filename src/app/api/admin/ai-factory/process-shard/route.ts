/**
 * Process AI Campaign Shard
 *
 * POST: Process exactly 1 pending shard from a campaign (or global queue).
 * - Respects max concurrency (configurable)
 * - Updates campaign progress on completion
 * - Safe stop on provider/API failures
 * - Resume: pending shards processed on next invocation
 *
 * Call from cron every 1-2 min for 24-hour generation mode.
 * Rotates across tracks to avoid hotspotting.
 *
 * Auth: CRON_SECRET or Admin session
 */

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/admin";
import { claimNextShard, updateCampaignProgress } from "@/lib/ai/campaign-orchestrator";
import { runBatchJob } from "@/lib/ai/batch-engine";
import { logBatchJobEvent, queueSafeLogBatchJobEvent } from "@/lib/ai/batch-scheduler";
import { createServiceClient } from "@/lib/supabase/service";

export const maxDuration = 300;

export async function POST(req: Request) {
  const cronSecret = req.headers.get("authorization")?.replace("Bearer ", "") ?? req.headers.get("x-cron-secret");
  const isCron = Boolean(process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET);

  if (!isCron) {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const admin = await isAdmin(user.id);
    if (!admin) return NextResponse.json({ error: "Admin required" }, { status: 403 });
  }

  const url = new URL(req.url);
  const campaignId = url.searchParams.get("campaignId") ?? null;
  const maxConcurrency = parseInt(url.searchParams.get("maxConcurrency") ?? "4", 10) || 4;
  const rateLimitMs = parseInt(url.searchParams.get("rateLimitMs") ?? "800", 10) || 800;
  const devMode = url.searchParams.get("dev") === "1";

  try {
    let questionTypeId = "";
    try {
      const supabase = createServiceClient();
      const { data } = await supabase
        .from("question_types")
        .select("id")
        .eq("slug", "single_best_answer")
        .limit(1)
        .maybeSingle();
      questionTypeId = data?.id ?? "";
    } catch {
      // ignore
    }

    const jobId = await claimNextShard(campaignId, maxConcurrency);
    if (!jobId) {
      return NextResponse.json({
        processed: false,
        message: "No pending shards or concurrency limit reached",
      });
    }

    const supabase = createServiceClient();
    const { data: job } = await supabase
      .from("ai_batch_jobs")
      .select("campaign_id")
      .eq("id", jobId)
      .single();

    const campaignIdForLog = job?.campaign_id ?? null;
    const onLog = (jid: string, et: string, msg?: string, meta?: Record<string, unknown>) =>
      queueSafeLogBatchJobEvent(jid, et, msg, meta, campaignIdForLog);

    await logBatchJobEvent(jobId, "claimed", "Shard claimed by process-shard worker", undefined, campaignIdForLog);

    const result = await runBatchJob(jobId, questionTypeId, undefined, {
      rateLimitMs: devMode ? 200 : rateLimitMs,
      maxRetries: 2,
      onLog,
    });

    if (job?.campaign_id) {
      await updateCampaignProgress(job.campaign_id, jobId);
    }

    if (result.success) {
      await logBatchJobEvent(
        jobId,
        "completed",
        `Saved: ${result.progress?.completedCount ?? 0}, Failed: ${result.progress?.failedCount ?? 0}`,
        {
          completedCount: result.progress?.completedCount,
          failedCount: result.progress?.failedCount,
        },
        campaignIdForLog
      );
    } else {
      await logBatchJobEvent(jobId, "failed", result.error, { error: result.error }, campaignIdForLog);
    }

    return NextResponse.json({
      processed: true,
      jobId,
      success: result.success,
      completedCount: result.progress?.completedCount ?? 0,
      failedCount: result.progress?.failedCount ?? 0,
      error: result.error,
    });
  } catch (e) {
    console.error("[process-shard]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
