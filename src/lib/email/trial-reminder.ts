/**
 * Trial expiration reminder email - 7 days before trial ends
 */

import { sendEmail } from "./index";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://xentis-care.com";
const PRICING_URL = `${APP_URL.replace(/\/$/, "")}/pricing`;

export interface TrialReminderParams {
  to: string;
  fullName?: string | null;
  trialEndDate: Date;
  /** Unique id for idempotency (e.g. user_id + reminder_type) */
  idempotencyKey: string;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function buildEmailHtml(params: TrialReminderParams): string {
  const greeting = params.fullName ? `Hi ${params.fullName}` : "Hi there";
  const endDate = formatDate(params.trialEndDate);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your free trial is ending soon</title>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #334155; max-width: 560px; margin: 0 auto; padding: 24px;">
  <p>${greeting},</p>
  
  <p>Your free 1-month trial of Xentis Care Exam Prep ends on <strong>${endDate}</strong>.</p>
  
  <p><strong>Your data stays with you.</strong> All your exam progress, notes, highlights, flashcards, and study history are already saved to your account. If you upgrade, everything will remain right where you left it—no new profile, no lost data.</p>
  
  <p>Upgrade now to keep full access and continue your learning:</p>
  
  <p style="margin: 24px 0;">
    <a href="${PRICING_URL}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Upgrade to continue</a>
  </p>
  
  <p style="color: #64748b; font-size: 14px;">If you have any questions, just reply to this email.</p>
  
  <p style="margin-top: 32px; color: #94a3b8; font-size: 12px;">&copy; Xentis Care Exam Prep</p>
</body>
</html>
`.trim();
}

function buildSubject(): string {
  return "Your free trial ends in 7 days";
}

export async function sendTrialReminderEmail(params: TrialReminderParams): Promise<{ ok: boolean; error?: string }> {
  const result = await sendEmail({
    to: params.to,
    subject: buildSubject(),
    html: buildEmailHtml(params),
    idempotencyKey: params.idempotencyKey,
  });

  return result.ok ? { ok: true } : { ok: false, error: result.error };
}
