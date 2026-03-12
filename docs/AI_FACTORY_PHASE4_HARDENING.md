# AI Factory Phase 4 — Batch Generation at Scale

## Summary

Hardened the AI Content Factory for production-safe high-volume generation (25k+ questions) with throughput control, retry caps, dedupe, observability, and admin usability.

---

## 1. Root Causes Found

| Issue | Root Cause |
|-------|------------|
| No log_level/error_code in ai_batch_job_logs | Log inserts did not set log_level or error_code columns |
| Paused campaigns still claimed | claimNextShard did not filter out jobs from paused campaigns |
| Campaign never marked completed | updateCampaignProgress did not set status=completed when all jobs done |
| Runaway retries | No cap on job-level retries; failed shards could retry indefinitely |
| No single-job retry | Admin could only retry all failed shards, not one job |
| Retry cap not visible | job_retry_attempt not exposed in admin UI |

---

## 2. Files Changed

| File | Change |
|------|--------|
| `src/lib/ai/batch-scheduler.ts` | Added log_level, error_code to log inserts; MAX_JOB_RETRIES; skip jobs at retry cap in claimNextPendingJob |
| `src/lib/ai/campaign-orchestrator.ts` | claimNextShard: skip paused campaigns, skip jobs at retry cap; updateCampaignProgress: mark completed when all done; retryFailedShards: increment job_retry_attempt, skip at cap; retrySingleJob |
| `src/app/api/admin/ai-factory/retry-failed/route.ts` | Return skippedAtCap in response |
| `src/app/(app)/actions/ai-campaign.ts` | jobRetryAttempt in CampaignJobRow; retryFailedShardsAction returns skippedAtCap |
| `supabase/migrations/20250312000000_ai_batch_job_retry_cap.sql` | **New** — job_retry_attempt column on ai_batch_jobs |

---

## 3. Campaign → Shard → Batch Flow Verified

| Step | Component | Status |
|------|-----------|--------|
| Launch campaign | `launchCampaign` → ai_campaigns + ai_batch_jobs | ✓ |
| Claim shard | `claimNextShard` (process-shard) or `claimNextPendingJob` (process-batch-queue) | ✓ |
| Run job | `runBatchJob` → generateContent → saveAI* / saveAIQuestionsBulk | ✓ |
| Update progress | `updateBatchProgress` (job), `updateCampaignProgress` (campaign) | ✓ |
| Mark completed | updateCampaignProgress sets status=completed when no pending/running | ✓ |
| Pause | claimNextShard skips paused campaigns | ✓ |
| Resume | resumeCampaign sets status=running | ✓ |

---

## 4. Retry, Dedupe, and Dead-Letter Behavior Verified

| Behavior | Implementation |
|----------|----------------|
| **Per-item retry** | runWithRetry in batch-engine; maxRetries (default 2–3); exponential backoff |
| **Job-level retry cap** | job_retry_attempt on ai_batch_jobs; MAX_JOB_RETRIES=5; retryFailedShards increments, skips at cap |
| **Dedupe** | content_dedupe_registry + stem_normalized_hash; checkDedupeBeforeSave; near-duplicate for questions |
| **Idempotency** | idempotency_key on ai_campaigns and ai_batch_jobs; shard key in launch |
| **Dead letter** | ai_bulk_insert_dead_letter; insertDeadLetter on validation/insert failure; deadLetterCount in bulk result |
| **Circuit breaker** | isCircuitOpen() in claimNextPendingJob and claimNextShard; rate-control.acquireSlot |

---

## 5. Admin Monitoring Routes Verified

| Route | Purpose |
|-------|---------|
| `POST /api/admin/process-batch-queue` | Process 1 batch_plan or 1 ai_batch_job (cron) |
| `POST /api/admin/ai-factory/process-shard` | Process 1 shard from campaign |
| `POST /api/admin/ai-factory/launch-campaign` | Launch campaign |
| `POST /api/admin/ai-factory/pause-campaign` | Pause campaign |
| `POST /api/admin/ai-factory/resume-campaign` | Resume campaign |
| `POST /api/admin/ai-factory/cancel-campaign` | Cancel campaign |
| `POST /api/admin/ai-factory/retry-failed` | Retry failed shards (returns count, skippedAtCap) |
| `GET /api/admin/ai-factory/campaign-summary` | Campaign progress |

Admin UI: Campaign Dashboard tab — create, inspect shards, pause/resume, retry failed, cancel.

---

## 6. Remaining Blockers Before 25k-Scale Generation

| Blocker | Notes |
|---------|-------|
| **ai_batch_job_logs.campaign_id FK** | Column references ai_generation_campaigns; campaign-orchestrator uses ai_campaigns. campaign_id stored in metadata; column left null for ai_campaigns flow. |
| **Cron configuration** | Ensure process-batch-queue and process-shard are called every 1–5 min. |
| **Vercel function timeout** | maxDuration=300 (5 min). For very large shards, consider smaller target_count per shard. |
| **OpenAI rate limits** | rate-control + circuit breaker mitigate; monitor for 429s. |
| **Single-job retry in UI** | retrySingleJob exists in campaign-orchestrator; not yet wired to Campaign Dashboard. |

---

## Observability

- **ai_batch_job_logs**: event_type, log_level, error_code, message, metadata (campaignId, generatedCount, etc.)
- **ai_batch_jobs**: completed_count (saved), failed_count, generated_count, skipped_duplicate_count, retry_count, job_retry_attempt
- **ai_campaigns**: saved_total, failed_total, duplicate_total, status, completed_at
- **ai_bulk_insert_dead_letter**: content_type, payload, error_message, error_code, batch_job_id

---

## Content Contracts

- **Questions**: validateQuestionPayload, normalizeQuestionPayload before save; invalid → dead letter
- **Flashcards**: validateFlashcardDeckPayload
- **High-yield**: validateHighYieldPayload
- **Study guides**: prepareGuideDedupe, checkDedupeBeforeSave

Generated content is never reported as saved unless persistence succeeded (completed_count = insertedCount from bulk result).
