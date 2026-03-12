/**
 * AI Provider Client - Hardened OpenAI Wrapper
 *
 * RETRY RULES:
 * - Retry on: 429 (rate limit), 500/502/503, timeout, ECONNRESET
 * - Max retries: 4 (5 total attempts)
 * - Backoff: exponential 2^attempt, min 1s, max 60s
 * - Jitter: ±25% random on each delay to avoid thundering herd
 *
 * REQUEST TIMEOUT: 90s default (configurable)
 *
 * ERROR CLASSIFICATION:
 * - provider_rate_limit: 429
 * - provider_timeout: timeout, ETIMEDOUT
 * - invalid_output: empty response, parse failure
 * - db_failure: caller-reported (persist failed)
 * - duplicate_rejected: caller-reported (stem similarity)
 * - unknown: everything else
 */

import {
  acquireSlot,
  releaseSlot,
  recordSuccess,
  recordFailure,
  RATE_LIMITS,
  CircuitOpenError,
} from "./rate-control";

export type ProviderErrorCode =
  | "provider_rate_limit"
  | "provider_timeout"
  | "invalid_output"
  | "db_failure"
  | "duplicate_rejected"
  | "unknown";

export interface ProviderError {
  code: ProviderErrorCode;
  message: string;
  retryable: boolean;
  statusCode?: number;
}

export const RETRY_CONFIG = {
  maxRetries: 4,
  initialBackoffMs: 1000,
  maxBackoffMs: 60_000,
  jitterFactor: 0.25,
  requestTimeoutMs: RATE_LIMITS.requestTimeoutMs,
} as const;

function backoffWithJitter(attempt: number): number {
  const base = RETRY_CONFIG.initialBackoffMs * Math.pow(2, attempt);
  const capped = Math.min(base, RETRY_CONFIG.maxBackoffMs);
  const jitter = capped * RETRY_CONFIG.jitterFactor * (2 * Math.random() - 1);
  return Math.max(100, Math.round(capped + jitter));
}

function isRetryableHttpStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function classifyError(err: unknown): ProviderError {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  if (lower.includes("429") || lower.includes("rate limit") || lower.includes("too many requests")) {
    return { code: "provider_rate_limit", message: msg, retryable: true, statusCode: 429 };
  }
  if (
    lower.includes("timeout") ||
    lower.includes("etimedout") ||
    lower.includes("econnreset") ||
    lower.includes("timed out")
  ) {
    return { code: "provider_timeout", message: msg, retryable: true };
  }
  if (lower.includes("empty") || lower.includes("parse") || lower.includes("structured output")) {
    return { code: "invalid_output", message: msg, retryable: true };
  }
  if (lower.includes("duplicate") || lower.includes("similarity") || lower.includes("stem")) {
    return { code: "duplicate_rejected", message: msg, retryable: false };
  }
  if (lower.includes("database") || lower.includes("insert") || lower.includes("supabase") || lower.includes("db ")) {
    return { code: "db_failure", message: msg, retryable: false };
  }

  const statusMatch = msg.match(/status[:\s]*(\d+)/i);
  const status = statusMatch ? parseInt(statusMatch[1], 10) : undefined;
  if (status === 429) {
    return { code: "provider_rate_limit", message: msg, retryable: true, statusCode: 429 };
  }
  if (status && status >= 500) {
    return { code: "unknown", message: msg, retryable: true, statusCode: status };
  }

  return { code: "unknown", message: msg, retryable: false };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Request timeout after ${ms}ms`)), ms);
    promise
      .then((v) => {
        clearTimeout(t);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(t);
        reject(e);
      });
  });
}

export interface ExecuteOptions {
  model?: string;
  timeoutMs?: number;
  onRetry?: (attempt: number, error: ProviderError, delayMs: number) => void;
}

/**
 * Execute an AI provider call with:
 * - Rate control (acquire/release slot)
 * - Request timeout
 * - Exponential backoff + jitter on 429/500/timeout
 * - Circuit breaker integration (record success/failure)
 * - Structured error classification
 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  options: ExecuteOptions = {}
): Promise<{ success: true; data: T } | { success: false; error: ProviderError }> {
  const model = options.model ?? "gpt-4o-mini";
  const timeoutMs = options.timeoutMs ?? RETRY_CONFIG.requestTimeoutMs;
  const onRetry = options.onRetry;

  let lastError: ProviderError | undefined;
  let slotAcquired = false;

  try {
    await acquireSlot(model);
    slotAcquired = true;

    for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
      try {
        const result = await withTimeout(fn(), timeoutMs);
        recordSuccess();
        return { success: true, data: result };
      } catch (err) {
        const classified = classifyError(err);
        lastError = classified;

        if (attempt < RETRY_CONFIG.maxRetries && classified.retryable) {
          const delayMs = backoffWithJitter(attempt);
          onRetry?.(attempt + 1, classified, delayMs);
          await new Promise((r) => setTimeout(r, delayMs));
          continue;
        }

        recordFailure();
        return { success: false, error: classified };
      }
    }
  } catch (err) {
    if (err instanceof CircuitOpenError) {
      return {
        success: false,
        error: { code: "provider_rate_limit", message: err.message, retryable: true },
      };
    }
    lastError = classifyError(err);
    recordFailure();
    return { success: false, error: lastError };
  } finally {
    if (slotAcquired) releaseSlot(model);
  }

  recordFailure();
  return { success: false, error: lastError ?? { code: "unknown", message: "Unknown error", retryable: false } };
}
