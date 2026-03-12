/**
 * Launch AI Content Factory Campaign
 *
 * POST: Launch a 24-hour generation campaign.
 * - campaignName, targetByTrackContent, maxConcurrency, modelName, dryRun
 * - Creates ai_campaigns row and child ai_batch_jobs (shards)
 * - Prioritizes low-coverage areas first
 *
 * Auth: Admin session or CRON_SECRET
 */

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/admin";
import { launchCampaign, type CampaignTargets } from "@/lib/ai/campaign-orchestrator";

export const maxDuration = 60;

export async function POST(req: Request) {
  const cronSecret = req.headers.get("authorization")?.replace("Bearer ", "") ?? req.headers.get("x-cron-secret");
  const isCron = Boolean(process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET);

  if (!isCron) {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const admin = await isAdmin(user.id);
    if (!admin) return NextResponse.json({ error: "Admin required" }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const campaignName = body.campaignName ?? body.name ?? "24h Campaign";
    const targetByTrackContent = (body.targetByTrackContent ?? body.targets ?? {}) as CampaignTargets;
    const maxConcurrency = body.maxConcurrency ?? 4;
    const modelName = body.modelName ?? "gpt-4o-mini";
    const dryRun = body.dryRun ?? false;
    const idempotencyKey = body.idempotencyKey as string | undefined;

    const user = await getSessionUser();
    const result = await launchCampaign({
      campaignName,
      targetByTrackContent,
      maxConcurrency,
      modelName,
      dryRun,
      createdBy: user?.id ?? null,
      idempotencyKey,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      campaignId: result.campaignId,
      shardCount: result.shardCount,
      targetTotal: result.targetTotal,
      dryRun: result.dryRun,
    });
  } catch (e) {
    console.error("[launch-campaign]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
