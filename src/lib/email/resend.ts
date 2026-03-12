/**
 * Resend email provider - production
 * Requires: RESEND_API_KEY, EMAIL_FROM (e.g. "Xentis Care <noreply@xentis.com>")
 */

import { Resend } from "resend";
import type { SendEmailParams, SendEmailResult } from "./types";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = process.env.EMAIL_FROM ?? "Xentis Care <onboarding@resend.dev>";

export async function sendEmailResend(params: SendEmailParams): Promise<SendEmailResult> {
  if (!resend) {
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: params.to,
      subject: params.subject,
      html: params.html,
      ...(params.idempotencyKey && { idempotencyKey: params.idempotencyKey }),
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, messageId: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}
