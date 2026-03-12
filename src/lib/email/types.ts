/**
 * Email provider abstraction - send transactional emails
 */

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  /** Optional idempotency key for retry-safe sends */
  idempotencyKey?: string;
}

export interface SendEmailResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

export type SendEmailFn = (params: SendEmailParams) => Promise<SendEmailResult>;
