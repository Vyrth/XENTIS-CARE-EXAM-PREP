/**
 * Process AI batch queue - processes exactly 1 pending job per invocation.
 * Tries batch_plans first, then ai_batch_jobs. Rate-limited, with retries.
 *
 * Auth: CRON_SECRET (cron) or session admin (manual)
 * - Cron: Set Authorization: Bearer <CRON_SECRET> or x-cron-secret header
 * - Manual: Admin session required
 *
 * Query: ?dev=1 - use shorter rate limit (200ms) for local testing
 * Query: ?plansOnly=1 - process only batch_plans (skip ai_batch_jobs)
 * Query: ?jobsOnly=1 - process only ai_batch_jobs (skip batch_plans)
 */

import { NextResponse } from "next/server";
import { processNextJob } from "@/lib/ai/batch-scheduler";
import { processNextBatchPlan } from "@/lib/ai/batch-plan-worker";
import { createServiceClient } from "@/lib/supabase/service";
import { getSessionUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/admin";

export const maxDuration = 300; // 5 min for long batches

export async function POST(req: Request) {
  const cronSecret = req.headers.get("authorization")?.replace("Bearer ", "") ?? req.headers.get("x-cron-secret");
  const isCron = Boolean(process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET);

  if (!isCron) {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userIsAdmin = await isAdmin(user.id);
    if (!userIsAdmin) return NextResponse.json({ error: "Admin required" }, { status: 403 });
  }

  const url = new URL(req.url);
  const devMode = url.searchParams.get("dev") === "1";
  const plansOnly = url.searchParams.get("plansOnly") === "1";
  const jobsOnly = url.searchParams.get("jobsOnly") === "1";
  const rateLimitMs = devMode ? 200 : 800;

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

    if (!jobsOnly) {
      const planResult = await processNextBatchPlan(questionTypeId, { rateLimitMs, maxRetries: 2 });
      if (planResult.processed) {
        return NextResponse.json({
          processed: true,
          source: "batch_plan",
          batchPlanId: planResult.batchPlanId,
          error: planResult.error,
        });
      }
    }

    if (!plansOnly) {
      const jobResult = await processNextJob(questionTypeId, { rateLimitMs, maxRetries: 2 });
      if (jobResult.processed) {
        return NextResponse.json({
          processed: true,
          source: "ai_batch_job",
          jobId: jobResult.jobId,
          error: jobResult.error,
        });
      }
    }

    return NextResponse.json({
      processed: false,
      source: null,
      jobId: undefined,
      batchPlanId: undefined,
      error: undefined,
    });
  } catch (e) {
    console.error("[process-batch-queue]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
