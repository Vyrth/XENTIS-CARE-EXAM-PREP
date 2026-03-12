# Production Dedupe - Algorithm and Flow

Prevents duplicate or near-duplicate AI-generated content during large-scale generation.

## Files Created

| File | Purpose |
|------|---------|
| `src/lib/ai/dedupe-normalization.ts` | Content-specific normalization and hashing helpers |
| `src/lib/ai/dedupe-check.ts` | Pre-save check, registry registration, duplicate handling |
| `docs/PRODUCTION_DEDUPE.md` | This documentation |

## Dedupe Algorithm

### 1. Normalization Layer

| Function | Content Type | Normalization |
|----------|--------------|----------------|
| `normalizeQuestionStemForHash` | Question stem | Base normalize (lowercase, trim, collapse whitespace, remove punctuation) |
| `normalizeGuideTitleForHash` | Study guide title | Base normalize |
| `normalizeFlashcardFrontForHash` | Flashcard deck name | Base normalize |
| `normalizeHighYieldTitleForHash` | High-yield title | Base normalize |

### 2. Hashing Helpers

| Function | Purpose |
|----------|---------|
| `createNormalizedHash(text)` | Hash of fully normalized text (primary dedupe key) |
| `createSecondaryHash(text)` | Hash of first 100–120 chars normalized (near-duplicate signal) |

### 3. Pre-Save Check Flow

1. Compute `normalized_hash` from content (stem, title, deck name).
2. Query `content_dedupe_registry` for `content_type + normalized_hash`.
3. If found → **exact duplicate** → skip save.
4. For **questions only**: near-duplicate rules:
   - Compare `secondary_hash` (first 120 chars) in same track/topic.
   - Query `questions` table for stems in same track/topic; run `isLikelyDuplicate` (Jaccard/overlap ≥ 0.88).
5. If duplicate → skip save, increment `batch_plan.duplicate_count`, log `duplicate_skipped`.

### 4. Post-Save Registration

After successful insert, insert into `content_dedupe_registry`:

- `content_type`, `exam_track_id`, `system_id`, `topic_id`
- `source_table`, `source_id`
- `normalized_hash`, `secondary_hash`
- `source_status` (draft/editor_review)
- `normalized_text_preview` (first 120 chars)
- `created_by_batch_plan_id` (when from batch)

## Duplicate Handling Flow

```
AI generates content
       ↓
Compute normalized_hash (and secondary_hash for questions)
       ↓
checkDedupeBeforeSave(contentType, hash, scope, rawStem?)
       ↓
   ┌───┴───┐
   │ Duplicate? │
   └───┬───┘
       │
   Yes │                    No
       ↓                        ↓
recordDuplicateSkipped    Proceed to save
  - increment batch_plan.duplicate_count
  - insert ai_batch_job_logs (event: duplicate_skipped)
       ↓                        ↓
   Return skip              Save to DB
                                   ↓
                            registerAfterSave
                                   ↓
                            Return success
```

## Question Near-Duplicate Rules

1. **Exact**: Same `normalized_hash` in registry (any scope).
2. **Secondary hash**: Same `secondary_hash` (first 120 chars) in same track/topic.
3. **Fuzzy**: `isLikelyDuplicate(stem, existingStem, 0.88)` against questions in same track/topic.

Do not save nearly identical question clones in same track/topic.

## Integration Points

- **Jade persistence** (`jade-persistence.ts`): All four save functions use pre-save check and post-save registration.
- **Bulk persistence** (`bulk-persistence.ts`): `bulkPersistQuestions` checks registry + questions table + near-dup; registers after insert.
- **AI factory persistence** (`ai-factory-persistence.ts`): `saveAIStudyGuideSectionPack`, `saveAIFlashcardDeck`, `saveAIHighYieldContent` use dedupe.
- **Batch processors** (`batch-plan-processors.ts`): Pass `batchPlanId`; handle `duplicate` in result; `onLog("duplicate_skipped", ...)`.
