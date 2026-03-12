/**
 * Trial expiration reminder job - sends email 7 days before trial ends
 * Idempotent: uses trial_reminder_sent table to prevent duplicate sends
 */

import { createServiceClient } from "@/lib/supabase/service";
import { sendTrialReminderEmail } from "@/lib/email/trial-reminder";

const REMINDER_TYPE = "trial_7_days";

export interface TrialReminderResult {
  processed: number;
  sent: number;
  skipped: number;
  errors: string[];
}

/**
 * Find active trials expiring in exactly 7 days (by date).
 * Uses current_period_end::date = (current_date + 7)::date to match the 7-day window.
 */
async function getTrialsExpiringIn7Days(): Promise<
  { user_id: string; email: string | null; full_name: string | null; current_period_end: string }[]
> {
  const supabase = createServiceClient();

  // Fetch trialing subs with period_end in the 7-day window (UTC)
  // We'll use a raw query via supabase - actually we need to use .select with a filter.
  // current_period_end is TIMESTAMPTZ. We need: date(current_period_end) = current_date + 7
  // Supabase JS doesn't support that. Options:
  // 1. Create a DB function get_trials_expiring_in_7_days() that returns the rows
  // 2. Fetch all trialing subs and filter in JS (wasteful but works)
  // 3. Use a view

  // Trial ends in exactly 7 days (by UTC date)
  const now = new Date();
  const targetDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 7, 0, 0, 0, 0));
  const targetEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 8, 0, 0, 0, 0));

  const { data: subs, error: subsError } = await supabase
    .from("user_subscriptions")
    .select("user_id, current_period_end")
    .eq("status", "trialing")
    .not("current_period_end", "is", null)
    .gte("current_period_end", targetDate.toISOString())
    .lt("current_period_end", targetEnd.toISOString());

  if (subsError) {
    throw new Error(`Failed to fetch trials: ${subsError.message}`);
  }

  if (!subs || subs.length === 0) {
    return [];
  }

  const targetDateStr = targetDate.toISOString().slice(0, 10);
  const filtered = subs.filter((s) => {
    const end = s.current_period_end as string;
    if (!end) return false;
    return end.slice(0, 10) === targetDateStr;
  });

  if (filtered.length === 0) {
    return [];
  }

  const userIds = filtered.map((s) => s.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .in("id", userIds);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, { email: p.email, full_name: p.full_name }])
  );

  return filtered.map((s) => {
    const p = profileMap.get(s.user_id);
    return {
      user_id: s.user_id,
      email: p?.email ?? null,
      full_name: p?.full_name ?? null,
      current_period_end: s.current_period_end as string,
    };
  });
}

/**
 * Claim reminder send for a user (insert if not exists).
 * Returns true if we inserted (we should send), false if already sent.
 */
async function claimReminder(userId: string): Promise<boolean> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("trial_reminder_sent")
    .insert({ user_id: userId, reminder_type: REMINDER_TYPE })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      // Unique violation - already sent
      return false;
    }
    throw new Error(`Failed to claim reminder: ${error.message}`);
  }

  return Boolean(data);
}

/**
 * Process trial reminders: find trials expiring in 7 days, send email once per user.
 * Idempotent and retry-safe.
 */
export async function processTrialReminders(): Promise<TrialReminderResult> {
  const result: TrialReminderResult = { processed: 0, sent: 0, skipped: 0, errors: [] };

  const trials = await getTrialsExpiringIn7Days();
  result.processed = trials.length;

  for (const t of trials) {
    if (!t.email || !t.email.trim()) {
      result.skipped++;
      result.errors.push(`User ${t.user_id}: no email`);
      continue;
    }

    let shouldSend: boolean;
    try {
      shouldSend = await claimReminder(t.user_id);
    } catch (err) {
      result.errors.push(`User ${t.user_id}: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }

    if (!shouldSend) {
      result.skipped++;
      continue;
    }

    const sendResult = await sendTrialReminderEmail({
      to: t.email.trim(),
      fullName: t.full_name,
      trialEndDate: new Date(t.current_period_end),
      idempotencyKey: `trial_7d_${t.user_id}`,
    });

    if (sendResult.ok) {
      result.sent++;
    } else {
      result.skipped++;
      result.errors.push(`User ${t.user_id}: send failed: ${sendResult.error}`);
      // Note: we already claimed (inserted) - we won't retry. Consider a "failed" status for manual retry.
      // For now we treat as skipped; the row prevents duplicate sends.
    }
  }

  return result;
}
