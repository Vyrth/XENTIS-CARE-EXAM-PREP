/**
 * Autonomous Content Operations Cron
 *
 * Modes (query param ?mode=):
 * - process-shards: Process queued AI batch jobs (every 2h)
 * - nightly-underfill: Queue underfill campaign for low-coverage areas (nightly)
 * - weekly-rebalance: Queue blueprint rebalance campaign (weekly)
 * - monthly-low-coverage: Queue low-coverage regeneration (monthly)
 *
 * Auth: CRON_SECRET
 */

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  queueNightlyUnderfillCampaign,
  queueWeeklyRebalanceCampaign,
  getSettings,
} from "@/lib/admin/autonomous-operations";
import { claimNextShard, updateCampaignProgress } from "@/lib/ai/campaign-orchestrator";
import { runBatchJob } from "@/lib/ai/batch-engine";
import { logBatchJobEvent } from "@/lib/ai/batch-scheduler";

export const maxDuration = 300;

export async function POST(req: Request) {
  const cronSecret = req.headers.get("authorization")?.replace("Bearer ", "") ?? req.headers.get("x-cron-secret");
  const isCron = Boolean(process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET);

  if (!isCron) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") ?? "process-shards";

  try {
    if (mode === "process-shards") {
      const maxConcurrency = 4;
      const jobId = await claimNextShard(null, maxConcurrency);
      if (!jobId) {
        return NextResponse.json({
          mode: "process-shards",
          processed: false,
          message: "No pending shards",
        });
      }

      const supabase = createServiceClient();
      let questionTypeId = "";
      try {
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

      const { data: job } = await supabase
        .from("ai_batch_jobs")
        .select("campaign_id")
        .eq("id", jobId)
        .single();
      const campaignIdForLog = job?.campaign_id ?? null;
      const onLog = (jid: string, et: string, msg?: string, meta?: Record<string, unknown>) =>
        logBatchJobEvent(jid, et, msg, meta, campaignIdForLog);

      await logBatchJobEvent(jobId, "claimed", "Autonomous cron: shard claimed", undefined, campaignIdForLog);

      const result = await runBatchJob(jobId, questionTypeId, undefined, {
        rateLimitMs: 800,
        maxRetries: 2,
        onLog,
      });

      if (job?.campaign_id) {
        await updateCampaignProgress(job.campaign_id, jobId);
      }

      return NextResponse.json({
        mode: "process-shards",
        processed: true,
        jobId,
        success: result.success,
        completedCount: result.progress?.completedCount ?? 0,
        failedCount: result.progress?.failedCount ?? 0,
      });
    }

    if (mode === "nightly-underfill") {
      const result = await queueNightlyUnderfillCampaign();
      return NextResponse.json({
        mode: "nightly-underfill",
        launched: result.launched,
        campaignId: result.campaignId,
        shardCount: result.shardCount,
        error: result.error,
      });
    }

    if (mode === "weekly-rebalance") {
      const result = await queueWeeklyRebalanceCampaign();
      return NextResponse.json({
        mode: "weekly-rebalance",
        launched: result.launched,
        campaignId: result.campaignId,
        shardCount: result.shardCount,
        error: result.error,
      });
    }

    if (mode === "monthly-low-coverage") {
      const result = await queueWeeklyRebalanceCampaign();
      return NextResponse.json({
        mode: "monthly-low-coverage",
        launched: result.launched,
        campaignId: result.campaignId,
        shardCount: result.shardCount,
        error: result.error,
      });
    }

    return NextResponse.json({ error: `Unknown mode: ${mode}` }, { status: 400 });
  } catch (e) {
    console.error("[cron:autonomous-content]", mode, e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
