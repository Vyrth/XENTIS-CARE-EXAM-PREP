/**
 * Process AI batch plans - processes exactly 1 pending batch_plan per invocation.
 * Call from cron (Vercel) or manually. Rate-limited, with retries.
 *
 * Auth: CRON_SECRET (cron) or session admin (manual)
 * - Cron: Set Authorization: Bearer <CRON_SECRET> or x-cron-secret header
 * - Manual: Admin session required
 *
 * Query: ?dev=1 - use shorter rate limit (200ms) for local testing
 */

import { NextResponse } from "next/server";
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

    const result = await processNextBatchPlan(questionTypeId, {
      rateLimitMs,
      maxRetries: 2,
    });

    return NextResponse.json({
      processed: result.processed,
      batchPlanId: result.batchPlanId,
      error: result.error,
    });
  } catch (e) {
    console.error("[process-batch-plans]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
