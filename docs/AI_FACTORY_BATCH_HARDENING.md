# AI Factory Batch Hardening – Root Causes, Fixes, and Test Plan

**Date:** March 2025  
**Status:** Implemented

---

## 1. Root Causes

### 1.1 Bulk persistence did not use auto-publish flow

**Problem:** `applyQualityAndAutoPublish` in `bulk-persistence.ts` used `tryAutoPublish` + `getAutoPublishConfig` directly instead of the canonical `runAutoPublishFlow`. Single-question saves used `runAutoPublishFlow`, so bulk inserts behaved differently: eligible content stayed in `editor_review` instead of auto-publishing.

**Impact:** Auto-publish never triggered for batch-generated questions; all content required manual review.

### 1.2 Jobs stuck in `running` forever

**Problem:** When a worker crashed or timed out mid-job, `ai_batch_jobs.status` stayed `running` with no reclaim. New workers skipped these jobs (concurrency limits), so they never completed.

**Impact:** Batch campaigns appeared to stall; pending counts grew while jobs stayed stuck.

### 1.3 No autonomous mode visibility

**Problem:** Admin dashboard lacked a summary of batch outcomes: total generated, auto-published, sent to review, failed, duplicates skipped.

**Impact:** Operators could not assess factory health or verify that auto-publish was working.

### 1.4 `sentToReview` filter fragility

**Problem:** Filter `.filter("generation_metadata->>routedToReviewReason", "neq", "")` could fail on some Supabase/PostgREST setups for JSONB. Using `.not("generation_metadata->>routedToReviewReason", "is", null)` is more robust.

**Impact:** `sentToReview` count could be wrong or throw.

---

## 2. Files Changed

| File | Change |
|------|--------|
| `src/lib/ai/factory/bulk-persistence.ts` | Use `runAutoPublishFlow` in `applyQualityAndAutoPublish` instead of `tryAutoPublish` + `getAutoPublishConfig` |
| `src/lib/ai/batch-scheduler.ts` | Add stuck-job reclaim: reset `running` jobs with `started_at` > 15 min back to `pending` before claiming |
| `src/lib/ai/campaign-orchestrator.ts` | Same stuck-job reclaim in `claimNextShard` |
| `src/lib/admin/overview-loaders.ts` | Add `loadAutonomousModeSummary()`, `AutonomousModeSummary`, wire into `loadAdminOverviewMetrics`; fix `sentToReview` filter |
| `src/app/(app)/admin/page.tsx` | Add "Autonomous mode summary" banner when batch activity exists |
| `src/app/(app)/actions/ai-batch.ts` | Add `error_message` to `loadAIBatchJobs` select and `AIBatchJobSummary` |
| `src/components/admin/ai-factory/BatchJobsTab.tsx` | Show `errorMessage` for failed jobs in Error/Log column |

---

## 3. End-to-End Batch Flow

```
1. Admin: Launch Batch (track + content type)
   └─ launchAIFactoryBatchAction → ai_generation_campaigns, ai_batch_shards, batch_plans, ai_batch_jobs

2. Cron: process-batch-queue (every 5 min)
   └─ Process batch_plans first
   └─ For each ai_batch_job (pending/queued):
        a. Reclaim stuck jobs (running > 15 min → pending)
        b. claimNextPendingJob (respects concurrency)
        c. runBatchJob:
             - Resolve topics for track
             - For each topic shard:
                  - Generate content (AI)
                  - Dedupe (stem/title checks)
                  - bulkPersistQuestions / persistStudyGuide / etc.
                  - applyQualityAndAutoPublish → runAutoPublishFlow
                       - Passes gates → published
                       - Fails gates → editor_review + routedToReviewReason
                  - updateBatchProgress (completed_count, failed_count, skipped_duplicate_count)
             - Mark job completed/failed/partial

3. Admin: View autonomous mode summary
   └─ totalGenerated, autoPublished, sentToReview, failedValidation, duplicateSkipped
   └─ jobsPending, jobsRunning
```

---

## 4. What Was Blocking Scale Generation

1. **Auto-publish never ran for bulk** – All batch content stayed in review; no path to learner app.
2. **Stuck jobs** – Crashed workers left jobs in `running`; no reclaim logic.
3. **No visibility** – Operators could not confirm auto-publish or failure rates.
4. **Filter fragility** – `sentToReview` count could fail on JSONB.

---

## 5. Manual Test Plan (100+ Items Safely)

### Prerequisites

- `OPENAI_API_KEY` set in `.env.local`
- Supabase configured; admin user logged in
- At least one exam track (RN, FNP, PMHNP, or LVN) with systems/topics

### Test 1: Launch Batch

1. Go to **Admin → AI Factory** (or Batch Planner).
2. Select track (e.g. RN) and content type (questions).
3. Set target count (e.g. 100).
4. Click **Launch Batch**.
5. **Verify:** Campaign created; shards/jobs appear in DB or UI.
6. **Verify:** `ai_batch_jobs` has rows with `status = 'pending'` or `queued`.

### Test 2: Jobs Process (No Stuck)

1. Trigger cron: `POST /api/admin/process-batch-queue` (or wait 5 min).
2. **Verify:** Some jobs move from `pending` → `running` → `completed`.
3. **Verify:** No job stays `running` > 15 min (reclaim should reset it).
4. **Verify:** `completed_count` and `failed_count` update on jobs.

### Test 3: Auto-Publish

1. After batch completes, query:
   - `publish_audit` where `auto_publish = true` (recent rows).
   - `questions` where `status = 'published'` and `created_at` recent.
2. **Verify:** Some questions are `published` (not all `editor_review`).
3. **Verify:** Learner app shows new questions in practice/questions browse.

### Test 4: Deduplication

1. Launch a second batch for same track/topics.
2. **Verify:** `skipped_duplicate_count` > 0 on jobs.
3. **Verify:** No duplicate stems in `questions` for same track/topic.

### Test 5: Failed Items Explain Why

1. Check `ai_batch_job_logs` for failed items.
2. **Verify:** `error_message` or log payload explains failure (e.g. validation, API error).
3. **Verify:** Admin UI (if present) shows failure reason.

### Test 6: Autonomous Mode Banner

1. Go to **Admin** overview.
2. **Verify:** "Autonomous mode summary" banner appears when batch activity exists.
3. **Verify:** Counts: total generated, auto-published, sent to review, failed, duplicate skipped.
4. **Verify:** `jobsPending` and `jobsRunning` reflect live DB state.

### Test 7: Roadmap Counts

1. Go to **Admin → Launch Readiness** or **Blueprint Coverage**.
2. **Verify:** Question counts match `questions` table for each track.
3. **Verify:** Counts update after batch completion (refresh page).

### Test 8: Generate Buttons (Single-Item)

1. Go to **Admin → Questions → New** (or Study Guides, Flashcards, High-Yield).
2. Click **Generate**.
3. **Verify:** Preview appears.
4. Click **Save**.
5. **Verify:** Item saved; auto-publish applies if eligible.

---

## 6. Autonomous Mode Summary Metrics

| Metric | Source |
|--------|--------|
| `totalGenerated` | Sum of `ai_batch_jobs.completed_count` (last 2000 jobs) |
| `autoPublished` | Count from `publish_audit` where `auto_publish = true` |
| `sentToReview` | Count from `content_quality_metadata` where `generation_metadata->>routedToReviewReason` is not null |
| `failedValidation` | Sum of `ai_batch_jobs.failed_count` |
| `duplicateSkipped` | Sum of `ai_batch_jobs.skipped_duplicate_count` |
| `jobsPending` | Count of jobs in `pending` or `queued` |
| `jobsRunning` | Count of jobs in `running` |

---

## 7. Failed Item Explanations

- **Job-level:** `ai_batch_jobs.error_message` is set when a job fails (e.g. "No topics found for track", API errors).
- **UI:** Batch Jobs tab shows `errorMessage` in the "Error / Log" column for failed jobs (red text).
- **Per-item:** Individual failed items within a job are logged to `ai_batch_job_logs` with `message` and `error_code`.

---

## 8. Follow-Up Work (Not Yet Implemented)

1. **Higher throughput** – Consider increasing `process-shards` cron from 2h to 5–15 min if needed.
2. **Materialized aggregates** – For very large histories (>10k jobs), consider a DB view or materialized table for `totalGenerated` etc.
3. **Per-item failure drill-down** – Expand a job to see individual `ai_batch_job_logs` entries for each failed item.
