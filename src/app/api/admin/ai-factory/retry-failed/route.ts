/**
 * Retry Failed Shards
 *
 * POST: Reset failed campaign jobs to pending for retry.
 * Auth: Admin session
 */

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/admin";
import { retryFailedShards } from "@/lib/ai/campaign-orchestrator";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = await isAdmin(user.id);
  if (!admin) return NextResponse.json({ error: "Admin required" }, { status: 403 });

  try {
    const body = await req.json().catch(() => ({}));
    const campaignId = body.campaignId ?? body.campaign_id;
    if (!campaignId) {
      return NextResponse.json({ error: "campaignId required" }, { status: 400 });
    }

    const result = await retryFailedShards(campaignId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({
      success: true,
      count: result.count,
      skippedAtCap: result.skippedAtCap,
    });
  } catch (e) {
    console.error("[retry-failed]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
