/**
 * Console email provider - logs emails instead of sending (dev)
 */

import type { SendEmailParams, SendEmailResult } from "./types";

export async function sendEmailConsole(params: SendEmailParams): Promise<SendEmailResult> {
  console.info("[email:console]", {
    to: params.to,
    subject: params.subject,
    htmlPreview: params.html.slice(0, 200) + (params.html.length > 200 ? "…" : ""),
    timestamp: new Date().toISOString(),
  });
  return { ok: true };
}
