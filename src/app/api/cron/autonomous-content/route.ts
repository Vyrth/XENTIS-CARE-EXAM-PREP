/**
 * Autonomous Content Operations Cron
 *
 * Modes (query param ?mode=):
 * - process-shards: Process queued AI batch jobs (every 2h)
 * - autonomous-generation: Gap-based recurring generation (reads cadence config)
 * - nightly-underfill: Queue underfill campaign for low-coverage areas (nightly)
 * - weekly-rebalance: Queue blueprint rebalance campaign (weekly)
 * - monthly-low-coverage: Queue low-coverage regeneration (monthly)
 *
 * Auth: CRON_SECRET via Authorization: Bearer <secret> or x-cron-secret header.
 */

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  queueNightlyUnderfillCampaign,
  queueWeeklyRebalanceCampaign,
} from "@/lib/admin/autonomous-operations";
import { runAutonomousGeneration } from "@/lib/admin/autonomous-cadence";
import { claimNextShard, getClaimDiagnostic, updateCampaignProgress } from "@/lib/ai/campaign-orchestrator";
import { runBatchJob } from "@/lib/ai/batch-engine";
import { logBatchJobEvent } from "@/lib/ai/batch-scheduler";

export const maxDuration = 300;

/** Validate cron auth. Supports Authorization: Bearer <secret> and x-cron-secret. Returns auth result and safe dev-only diagnostic. */
function validateCronAuth(req: Request): {
  authorized: boolean;
  /** Safe diagnostic for local dev only; never includes secret */
  authDiagnostic?: Record<string, unknown>;
} {
  const authHeader = req.headers.get("authorization");
  const bearerSecret = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  const xCronSecret = req.headers.get("x-cron-secret")?.trim() ?? null;
  const providedSecret = bearerSecret ?? xCronSecret;

  const envConfigured = Boolean(process.env.CRON_SECRET);
  const secretMatch = envConfigured && providedSecret !== null && providedSecret === process.env.CRON_SECRET;
  const authorized = secretMatch;

  const isDev = process.env.NODE_ENV === "development";
  const authDiagnostic =
    isDev && !authorized
      ? {
          cronSecretConfigured: envConfigured,
          authorizationHeaderPresent: authHeader !== null,
          xCronSecretHeaderPresent: req.headers.has("x-cron-secret"),
          authMechanismUsed: bearerSecret !== null ? "Authorization" : xCronSecret !== null ? "x-cron-secret" : "none",
          secretLengthMatch: envConfigured && providedSecret !== null ? providedSecret.length === (process.env.CRON_SECRET?.length ?? 0) : false,
        }
      : undefined;

  return { authorized, authDiagnostic };
}

export async function POST(req: Request) {
  const { authorized, authDiagnostic } = validateCronAuth(req);

  if (!authorized) {
    const body: Record<string, unknown> = { error: "Unauthorized" };
    if (authDiagnostic) body.authDiagnostic = authDiagnostic;
    return NextResponse.json(body, { status: 401 });
  }

  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") ?? "process-shards";

  try {
    if (mode === "process-shards") {
      const maxConcurrency = 4;
      const jobId = await claimNextShard(null, maxConcurrency);
      if (!jobId) {
        const diagnostic = await getClaimDiagnostic(null);
        const hasPlanned = diagnostic.pendingCount > 0;
        if (process.env.NODE_ENV === "development" || hasPlanned) {
          // eslint-disable-next-line no-console
          console.log("[cron:autonomous-content] process-shards no claim", {
            mode: "process-shards",
            ...diagnostic,
          });
        }
        return NextResponse.json({
          mode: "process-shards",
          processed: false,
          message: hasPlanned ? diagnostic.reason : "No pending shards",
          diagnostic: hasPlanned ? diagnostic : undefined,
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

      if (!result.success) {
        await logBatchJobEvent(jobId, "cron_complete", `Cron run finished with failure: ${result.error}`, { error: result.error }, campaignIdForLog, "error");
      }

      return NextResponse.json({
        mode: "process-shards",
        processed: true,
        jobId,
        success: result.success,
        completedCount: result.progress?.completedCount ?? 0,
        failedCount: result.progress?.failedCount ?? 0,
        error: result.success ? undefined : result.error,
      });
    }

    if (mode === "autonomous-generation") {
      const dryRun = url.searchParams.get("dryRun") === "true";
      const result = await runAutonomousGeneration(dryRun);
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.log("[cron:autonomous-content] autonomous-generation", {
          mode: "autonomous-generation",
          dryRun: result.dryRun,
          launched: result.launched,
          campaignId: result.campaignId,
          shardCount: result.shardCount,
          shardCountZeroDiagnostic: result.shardCountZeroDiagnostic,
          scopeType: result.log?.scopeType,
          systemsTargetedCount: (result.log?.systemsTargeted as string[])?.length ?? 0,
          topicsTargetedCount: (result.log?.topicsTargeted as string[])?.length ?? 0,
        });
      }
      return NextResponse.json({
        mode: "autonomous-generation",
        dryRun: result.dryRun,
        launched: result.launched,
        campaignId: result.campaignId,
        shardCount: result.shardCount,
        targetTotal: result.targetTotal,
        skippedReasons: result.skippedReasons,
        error: result.error,
        shardCountZeroDiagnostic: result.shardCountZeroDiagnostic,
        activeCampaignDiagnostic: result.activeCampaignDiagnostic
          ? {
              campaignId: result.activeCampaignDiagnostic.campaignId,
              campaignName: result.activeCampaignDiagnostic.campaignName,
              status: result.activeCampaignDiagnostic.status,
              pendingCount: result.activeCampaignDiagnostic.pendingCount,
              runningCount: result.activeCampaignDiagnostic.runningCount,
              completedCount: result.activeCampaignDiagnostic.completedCount,
              failedCount: result.activeCampaignDiagnostic.failedCount,
              totalJobs: result.activeCampaignDiagnostic.totalJobs,
              hasRunnableJobs: result.activeCampaignDiagnostic.hasRunnableJobs,
              isStale: result.activeCampaignDiagnostic.isStale,
              staleReason: result.activeCampaignDiagnostic.staleReason,
            }
          : undefined,
        log: result.log,
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
