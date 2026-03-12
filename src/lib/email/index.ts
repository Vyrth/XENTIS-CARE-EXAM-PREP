/**
 * Email service - provider abstraction
 * Uses Resend when RESEND_API_KEY is set; otherwise logs to console (dev).
 */

import { sendEmailResend } from "./resend";
import { sendEmailConsole } from "./console";
import type { SendEmailParams, SendEmailResult } from "./types";

export type { SendEmailParams, SendEmailResult, SendEmailFn } from "./types";

export function getSendEmail(): (params: SendEmailParams) => Promise<SendEmailResult> {
  return process.env.RESEND_API_KEY ? sendEmailResend : sendEmailConsole;
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const send = getSendEmail();
  return send(params);
}
