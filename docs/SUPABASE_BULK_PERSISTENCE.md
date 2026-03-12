# Supabase Bulk Persistence for High-Volume AI Generation

Optimizes 25,000+ question generation without DB bottlenecks.

## Chunk Sizes

| Table | Chunk Size | Location |
|-------|------------|----------|
| questions | 25 | `bulk-persistence-config.ts` BULK_CHUNK_SIZES.questions |
| question_options | 100 | BULK_CHUNK_SIZES.question_options |
| flashcards | 100 | BULK_CHUNK_SIZES.flashcards |
| high_yield_content | 25 | BULK_CHUNK_SIZES.high_yield_content |

## Transaction Boundaries

| Boundary | Scope |
|----------|-------|
| Question chunk | `questions` + `question_options` per chunk (25 questions + their options). If options fail, questions in that chunk are rolled back. |
| Flashcard chunk | `flashcards` per 100-card chunk within a deck. Deck created first; cards inserted in chunks. |
| High-yield chunk | `high_yield_content` per 25-row chunk. |

## Optimized Save Flow

### Questions (batch-engine)

1. Buffer questions in memory as they are generated
2. When buffer reaches 25, call `bulkPersistQuestions`
3. Dedupe: fetch existing `stem_normalized_hash` for track/topic, filter batch
4. Insert questions in one bulk call (25 rows)
5. Insert options in chunks of 100 (bulk)
6. On option failure: delete inserted questions, move failed rows to dead letter
7. Flush remaining buffer at job end

### Flashcards (persistFullFlashcardDeck)

1. Create deck (single insert)
2. Build card rows
3. Insert cards in chunks of 100 (bulk)

### High-yield (bulkPersistHighYield)

1. Validate and dedupe per item (title check)
2. Insert in chunks of 25

## Stable Hashes for Dedupe

- **questions**: `stem_normalized_hash = simpleHash(normalizeForHash(stem))`
- Stored in `questions.stem_normalized_hash` (migration 039)
- Pre-insert: fetch existing hashes for track/topic, filter batch

## Dead-Letter Handling

- **Table**: `ai_bulk_insert_dead_letter`
- **Columns**: content_type, batch_job_id, payload (JSONB), error_message, error_code, retry_count
- Failed rows from chunk inserts are written here for retry or manual review
- `insertDeadLetter()` is fire-and-forget (non-blocking)

## Post-Insert Reconciliation

- `bulkPersistQuestions` returns: `insertedCount`, `duplicateCount`, `failedCount`, `deadLetterCount`, `contentIds`
- `bulkPersistFlashcards` returns: `insertedCount`, `failedCount`, `deadLetterCount`, `deckId`
- `bulkPersistHighYield` returns: `insertedCount`, `duplicateCount`, `failedCount`, `deadLetterCount`, `contentIds`

## Staging Tables (Optional)

Not implemented. For ultra-large batches (e.g. 100k+), consider:
- Insert into `questions_staging` with batch_id
- Background job: validate, dedupe, move to `questions` in chunks
- Enables async processing without blocking the generation worker
