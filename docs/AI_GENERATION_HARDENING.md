# AI Generation Layer Hardening

Enables safe generation of 25,000+ questions without crashing OpenAI APIs, Vercel, or Supabase.

## Throttling Rules

| Rule | Value | Location |
|------|-------|----------|
| Global concurrency | 6 | `rate-control.ts` RATE_LIMITS.globalConcurrency |
| Per-model concurrency | 4 | `rate-control.ts` RATE_LIMITS.perModelConcurrency |
| Global requests/min | 50 | RATE_LIMITS.requestsPerMinuteGlobal |
| Per-model requests/min | 35 | RATE_LIMITS.requestsPerMinutePerModel |
| Request timeout | 90s | provider-client RETRY_CONFIG.requestTimeoutMs |

## Retry Rules

| Rule | Value | Location |
|------|-------|----------|
| Max retries | 4 (5 total attempts) | provider-client RETRY_CONFIG.maxRetries |
| Initial backoff | 1000ms | RETRY_CONFIG.initialBackoffMs |
| Max backoff | 60s | RETRY_CONFIG.maxBackoffMs |
| Backoff formula | min(initial * 2^attempt, max) | getBackoffMs |
| Jitter | ±25% on each delay | provider-client backoffWithJitter |
| Retry on | 429, 500/502/503, timeout, ECONNRESET | classifyError |

## Circuit Breaker (Pause/Failover)

| Rule | Value |
|------|-------|
| Window | Last 20 requests (2 min) |
| Failure threshold | ≥40% (8+ of 20) |
| Action | Open circuit → no new job claims |
| Cooldown | 60s before half-open |
| Half-open | Allow 1 probe request |
| On probe success | Close circuit |
| On probe failure | Reset 60s cooldown |

When circuit opens:
- `acquireSlot()` throws `CircuitOpenError`
- `claimNextPendingJob()` and `claimNextShard()` return null (no new work)
- In-flight requests complete; no new work starts until circuit closes

## Error Classification

| Code | When |
|------|------|
| `provider_rate_limit` | 429, rate limit message, circuit open |
| `provider_timeout` | timeout, ETIMEDOUT, ECONNRESET |
| `invalid_output` | empty response, parse failure |
| `db_failure` | persist/save failed |
| `duplicate_rejected` | stem similarity > 85% |
| `unknown` | everything else |

Logged to `ai_batch_job_logs` with `metadata.errorCode`.

## Queue-Safe Logging

`queueSafeLogBatchJobEvent()`: fire-and-forget insert to `ai_batch_job_logs`. Never blocks. Used in batch-engine hot paths (progress, retry, save_error, generation_failed).

## Integration Points

- **content-factory/orchestrator.ts**: All `generateContent` calls go through `executeWithRetry` (rate control, timeout, backoff)
- **batch-scheduler.ts**: `claimNextPendingJob` checks `isCircuitOpen()`; uses `queueSafeLogBatchJobEvent` for onLog
- **campaign-orchestrator.ts**: `claimNextShard` checks `isCircuitOpen()`
- **process-shard route**: Uses `queueSafeLogBatchJobEvent` for onLog
