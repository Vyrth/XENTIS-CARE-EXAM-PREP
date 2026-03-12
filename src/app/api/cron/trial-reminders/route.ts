/**
 * Trial expiration reminder cron - runs daily
 * Sends email to users whose trial ends in 7 days (exactly once per user).
 *
 * Auth: CRON_SECRET (cron) or admin session (manual)
 * - Cron: Authorization: Bearer <CRON_SECRET> or x-cron-secret header
 */

import { NextResponse } from "next/server";
import { processTrialReminders } from "@/lib/billing/trial-reminders";
import { getSessionUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/admin";

export const maxDuration = 60;

export async function POST(req: Request) {
  const cronSecret = req.headers.get("authorization")?.replace("Bearer ", "") ?? req.headers.get("x-cron-secret");
  const isCron = Boolean(process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET);

  if (!isCron) {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userIsAdmin = await isAdmin(user.id);
    if (!userIsAdmin) return NextResponse.json({ error: "Admin required" }, { status: 403 });
  }

  try {
    const result = await processTrialReminders();

    return NextResponse.json({
      ok: true,
      processed: result.processed,
      sent: result.sent,
      skipped: result.skipped,
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (e) {
    console.error("[cron:trial-reminders]", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
