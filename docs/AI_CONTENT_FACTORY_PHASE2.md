# AI Content Factory - Phase 2 Implementation

Full AI Content Factory engine for safe generation of 25,000+ questions across RN, FNP, PMHNP, and LVN tracks.

## Implemented Components

### 1. Jade Tutor AI Generation Services

- **Content Factory** (`src/lib/ai/content-factory/`): Unified generation via `generateContent()` for questions, study guides, flashcards, high-yield
- **Jade Generation** (`src/lib/ai/jade-generation.ts`): Board-style questions, study guides, flashcards, high-yield drafts with validation
- **Adapter** (`content-factory/adapter.ts`): `toContentFactoryRequest()` maps `GenerationConfig` to prompts

### 2. Question Generation Pipeline

- **Batch Plan Processors** (`src/lib/ai/batch-plan-processors.ts`): `processQuestionBatchPlan` — 5–20 questions per chunk, topic distribution, dedupe
- **Batch Engine** (`src/lib/ai/batch-engine.ts`): `runBatchJob` for `ai_batch_jobs` — rate limiting, retries, bulk persistence
- **Persistence**: `saveAIQuestionsBulk` → `bulkPersistQuestions` with dedupe, dead-letter handling

### 3. Flashcard Generation

- `processFlashcardBatchPlan` — deck per topic, rapid_recall or high_yield_clinical
- `saveAIFlashcardDeck` with dedupe and `content_dedupe_registry` registration

### 4. Study Guide Generation

- `processStudyGuideBatchPlan` — section packs per topic (4 sections default)
- `saveAIStudyGuideSectionPack` with title dedupe

### 5. High-Yield Summary Generation

- `processHighYieldBatchPlan` — high_yield_summary, common_confusion, board_trap, compare_contrast_summary
- `saveAIHighYieldContent` with title dedupe

### 6. Batch Job Orchestration

- **batch_plans**: `claimNextPendingBatchPlan` → content-type processors → `ai_batch_job_logs`
- **ai_batch_jobs**: `claimNextPendingJob` / `claimNextShard` → `runBatchJob` → Supabase
- **Rate limiting**: 800ms default between API calls (configurable via `rateLimitMs`)
- **Retry logic**: Exponential backoff via `getBackoffMs()`, max 2–3 retries per item

### 7. Rate Limiting and Retry Logic

- **Rate control** (`src/lib/ai/rate-control.ts`): Circuit breaker, per-minute throttle, concurrency limits
- **Production config** (`production-pipeline-config.ts`): `CONCURRENCY_LIMITS`, `BATCH_SIZING`, `getBackoffMs()`

### 8. Logging to ai_batch_job_logs

- **batch-plan-worker**: `logBatchPlanEvent`, `queueSafeLogBatchPlanEvent` — batch_plan_id, campaign_id, shard_id
- **batch-scheduler**: `logBatchJobEvent`, `queueSafeLogBatchJobEvent` — batch_job_id, campaignId in metadata
- **process-shard**: Passes campaignId to onLog for campaign-scoped jobs

### 9. Campaign + Shard Generation

- **Campaign Orchestrator** (`campaign-orchestrator.ts`): `launchCampaign`, `claimNextShard`, `updateCampaignProgress`
- **Shard Generator** (`shard-generator.ts`): Splits by track/system/topic/content-type
- **25k+ preset**: `LARGE_CAMPAIGN_TARGETS` — RN 7k, FNP 6.5k, PMHNP 6k, LVN 5.5k questions

### 10. Safe 25,000+ Generation

- Sharded jobs: small chunks per topic to avoid API overload
- Concurrency: max 4 global, 2 per track
- Circuit breaker: opens on ≥40% failure rate
- Dedupe: `content_dedupe_registry` + stem hash for questions

## Admin AI Factory UI

- **Campaign tab**: Generate plan, Launch now, **Launch 25k+ campaign**
- **Batch Jobs tab**: Monitor `ai_batch_jobs`
- **Pause / Resume / Cancel / Retry failed** for campaigns

## API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/admin/ai-factory/launch-campaign` | Launch campaign (dry run or live) |
| `POST /api/admin/ai-factory/process-shard` | Process 1 pending shard (cron) |
| `POST /api/admin/process-batch-queue` | Process 1 batch_plan or 1 ai_batch_job (cron) |

## Cron Setup

For 24-hour campaigns, call every 1–2 minutes:

```bash
# Process shards (campaign jobs)
curl -X POST "https://your-app.vercel.app/api/admin/ai-factory/process-shard" \
  -H "Authorization: Bearer $CRON_SECRET"

# Or process-batch-queue (handles both batch_plans and ai_batch_jobs)
curl -X POST "https://your-app.vercel.app/api/admin/process-batch-queue" \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Environment Variables

- `OPENAI_API_KEY` — Required for generation
- `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — Persistence
- `CRON_SECRET` — For cron endpoints (or admin session)
