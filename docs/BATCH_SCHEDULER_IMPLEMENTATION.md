# AI Batch Scheduler – Implementation Summary

## Overview

The AI batch scheduler for Xentis Care Exam Prep is production-ready. It processes AI content generation jobs (questions, study guides, flashcards, high-yield content) in a controlled, observable queue.

---

## 1. Migration Support

### Migration 036 (`20250306000036_batch_scheduler.sql`)

- **`generated_count`** – Count of items the AI generated successfully (before persist)
- **`retry_count`** – Number of retry attempts for failed generations
- **`ai_batch_job_logs`** – Audit table for job events

### Migration 037 (`20250306000037_batch_scheduler_started_at.sql`)

- **`started_at`** – When the job transitioned to `running`

---

## 2. Queue Processor

### Safe Claim Pattern

- **`claimNextPendingJob()`** – Atomically claims the next pending job
- Flow: check no job is running → select oldest pending → update to `running` only if still `pending`
- Prevents multiple workers from claiming the same job

### Status Transitions

- `pending` → `running` (on claim)
- `running` → `completed` (success)
- `running` → `failed` (error or no progress)
- `pending` → `cancelled` (manual cancel)

---

## 3. Event Logging

All major events are written to `ai_batch_job_logs`:

| Event        | When                                      |
|-------------|---------------------------------------------|
| `claimed`   | Job claimed by worker                       |
| `started`   | Job started processing                      |
| `progress`  | Every 5 items (generated/saved/failed)      |
| `retry`     | Generation retry (with attempt count)       |
| `save_error`| Persist failed                              |
| `duplicate_retry` | Regenerating due to stem similarity |
| `completed` | Job finished successfully                   |
| `failed`    | Job failed (error or exception)             |

---

## 4. Admin UI (BatchJobsTab)

- **Status badge** – Color-coded (pending/running/completed/failed/cancelled)
- **Counts** – Generated, Saved, Failed, Skipped, Retry
- **Timestamps** – Started, Completed
- **Latest log** – Most recent `ai_batch_job_logs` message
- **Requeue** – Failed jobs → `pending` (clears error)
- **Cancel** – Pending jobs → `cancelled`

---

## 5. Manual Actions

- **Requeue** – `requeueBatchJobAction(jobId)` – Sets failed jobs back to `pending`
- **Cancel** – `cancelBatchJobAction(jobId)` – Cancels pending jobs

---

## 6. API Route

**`POST /api/admin/process-batch-queue`**

- **Auth**
  - Cron: `Authorization: Bearer <CRON_SECRET>` or `x-cron-secret` header
  - Manual: Admin session required
- **Behavior** – Processes exactly one job per invocation
- **Dev mode** – `?dev=1` uses 200ms rate limit (vs 800ms) for local testing

---

## 7. Cron

- **`vercel.json`** – Cron every 5 minutes (`*/5 * * * *`)
- **`CRON_SECRET`** – Must be set in Vercel env vars for cron auth

---

## 8. Key Paths

| Purpose           | Path                                           |
|-------------------|------------------------------------------------|
| Scheduler         | `src/lib/ai/batch-scheduler.ts`                |
| Batch engine      | `src/lib/ai/batch-engine.ts`                   |
| Queue API         | `src/app/api/admin/process-batch-queue/route.ts`|
| Batch actions     | `src/app/(app)/actions/ai-batch.ts`            |
| BatchJobsTab      | `src/components/admin/ai-factory/BatchJobsTab.tsx` |

---

## 9. Deployment Checklist

1. Run migrations 036 and 037
2. Set `CRON_SECRET` in Vercel
3. Ensure Supabase service role is configured
