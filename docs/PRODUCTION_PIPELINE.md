# Production-Scale AI Content Pipeline

Target: **25,000+ original board-style questions in 24 hours** without crashing APIs or Supabase.

## Architecture

### 1. Sharding

Shards are built by:
- **Track** (RN, FNP, PMHNP, LVN)
- **System** (cardiovascular, respiratory, etc.)
- **Topic** (from taxonomy)
- **Content type** (question, study_guide, flashcard_deck, high_yield_summary)
- **Batch size** (chunk size per shard)

### 2. Master / Child Model

| Table | Purpose |
|-------|---------|
| `ai_master_batches` | One plan; `target_total_count`; spawns many child jobs |
| `ai_batch_jobs` | Child shards; `master_batch_id`, `shard_key`, `idempotency_key` |

### 3. Queue Strategy

| Status | Meaning |
|--------|---------|
| `pending` | Ready to run |
| `queued` | In queue, waiting for slot |
| `running` | Currently processing |
| `completed` | Finished successfully |
| `failed` | Error; can requeue |
| `cancelled` | Manually stopped |
| `partial` | Interrupted; resumable |

### 4. Worker Concurrency

| Limit | Default | Purpose |
|-------|---------|---------|
| `maxConcurrentPerTrack` | 2 | Prevent one track from monopolizing |
| `maxConcurrentGlobal` | 4 | Cap total parallel jobs |
| `apiCallsPerMinute` | 45 | Rough API rate |
| `rateLimitMs` | 1200 | Delay between API calls |
| `maxRetriesPerItem` | 3 | With exponential backoff |

### 5. Batch Sizing

| Content Type | Chunk Size |
|--------------|------------|
| Questions | 10–25 (default 15) |
| Study guides | 1–3 |
| Flashcard decks | 1 deck / 10–25 cards |
| High-yield | 5–10 summaries |

### 6. Exponential Backoff

`delay = min(initialBackoffMs * 2^attempt, maxBackoffMs)`
- Initial: 1000ms
- Max: 30000ms

### 7. Idempotency

- **Master batch**: `idempotency_key` on `ai_master_batches`
- **Child jobs**: `idempotency_key` on `ai_batch_jobs` (unique)
- **Generation calls**: `ai_generation_idempotency` table (optional)

### 8. Deduplication

| Content | Strategy |
|---------|----------|
| Question stems | Exact match (ilike) + fuzzy similarity (>85%) |
| Flashcard fronts | Exact match in same track/topic |
| Guide titles | Exact match in track/system/topic |
| High-yield titles | Exact match in track/topic |

### 9. Persistence Buffering

- Generate content in memory batch
- Validate each item
- Dedupe against DB
- Bulk insert in transaction (future: batch insert helper)
- Log counts to `ai_batch_job_logs`

### 10. Resume After Interruption

- Jobs in `pending` or `queued` are picked up by next worker
- `partial` status: job stopped mid-run; can be extended for checkpoint resume
- Cron runs every 5 min; each invocation processes up to `maxConcurrentGlobal` jobs

## Files Created

| File | Purpose |
|------|---------|
| `supabase/migrations/20250308000039_production_batch_pipeline.sql` | Schema: master batches, shard columns, idempotency, worker slots |
| `src/lib/ai/production-pipeline-config.ts` | Batch sizing, concurrency, backoff |
| `src/lib/ai/shard-generator.ts` | Shard generation by track/system/topic |
| `src/lib/ai/dedupe-utils.ts` | Stem, flashcard, guide, high-yield dedupe |
| `src/lib/ai/production-pipeline.ts` | `createMasterBatch`, concurrency checks |
| `docs/PRODUCTION_PIPELINE.md` | This doc |

## Schema Updates

- `ai_batch_job_status`: +`queued`, +`partial`
- `ai_batch_jobs`: +`master_batch_id`, +`shard_key`, +`idempotency_key`
- `ai_master_batches`: new table
- `ai_generation_idempotency`: new table
- `ai_batch_worker_slots`: new table (optional coordination)
- `questions`: +`stem_normalized_hash` (optional, for faster dedupe)

## Worker Strategy

1. Cron hits `POST /api/admin/process-batch-queue` every 5 min
2. `claimNextPendingJob(useConcurrencyLimits=true)` picks oldest pending/queued job
3. Respects `maxConcurrentPerTrack` and `maxConcurrentGlobal`
4. `runBatchJob` uses `rateLimitMs`, exponential backoff on retry
5. Progress written to `ai_batch_jobs` and `ai_batch_job_logs`

## Dedupe Strategy

- **Questions**: `checkStemDuplicate(trackId, topicId, stem)` – exact + `isLikelyDuplicate` (similarity)
- **Flashcards**: `checkFlashcardFrontDuplicate` – exact `front_text` in same track/topic
- **Guides**: `checkGuideTitleDuplicate` – exact `title` in track/system/topic
- **High-yield**: `checkHighYieldTitleDuplicate` – exact `title` in track/topic

Existing `persistQuestion` etc. already perform dedupe; `dedupe-utils` provides reusable checks for batch pre-validation.
