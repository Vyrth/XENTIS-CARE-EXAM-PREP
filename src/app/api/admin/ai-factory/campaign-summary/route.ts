/**
 * Campaign Summary API
 *
 * GET ?campaignId=xxx: Returns campaign progress summary.
 * - total target, generated, saved, failed
 * - completion percent
 * - ETA estimate
 * - by track, by content type
 *
 * Auth: Admin session or CRON_SECRET
 */

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/admin";
import { getCampaignSummary } from "@/lib/ai/campaign-orchestrator";

export async function GET(req: Request) {
  const cronSecret = req.headers.get("authorization")?.replace("Bearer ", "") ?? req.headers.get("x-cron-secret");
  const isCron = Boolean(process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET);

  if (!isCron) {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const admin = await isAdmin(user.id);
    if (!admin) return NextResponse.json({ error: "Admin required" }, { status: 403 });
  }

  const url = new URL(req.url);
  const campaignId = url.searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId required" }, { status: 400 });
  }

  try {
    const summary = await getCampaignSummary(campaignId);
    if (!summary) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    return NextResponse.json(summary);
  } catch (e) {
    console.error("[campaign-summary]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
