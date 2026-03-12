# AI Content Factory – Production Hardening Audit

**Date:** March 2025  
**Status:** Production-ready with full audit trail

---

## 1. Audit Summary

### Generation Flows Audited

| Flow | Content Type | Preview | Save | Batch | Audit Logged |
|------|--------------|---------|------|-------|--------------|
| Questions | question | ✓ | ✓ | ✓ | ✓ |
| Study guides (full) | study_guide | ✓ | ✓ | ✓ | ✓ |
| Study guide section pack | study_guide_section_pack | ✓ | ✓ | ✓ | ✓ |
| Flashcard decks | flashcard_deck | ✓ | ✓ | ✓ | ✓ |
| Single flashcard | flashcard | — | ✓ | — | ✓ |
| High-yield summary | high_yield_summary | ✓ | ✓ | ✓ | ✓ |
| Common confusion | common_confusion | ✓ | ✓ | ✓ | ✓ |
| Board trap | board_trap | ✓ | ✓ | ✓ | ✓ |
| Compare/contrast | compare_contrast_summary | ✓ | ✓ | ✓ | ✓ |

---

## 2. Track Safety

**Confirmed: No generated content leaks across tracks.**

- **Persistence:** All inserts use `config.trackId` (from `GenerationConfig`) for `exam_track_id`. The config is built from:
  - **Single-item:** UI dropdowns populated from `exam_tracks`, `systems`, `topics` (taxonomy)
  - **Batch:** `job.exam_track_id` from `ai_batch_jobs`; topics resolved via `resolveTopicIds()` filtered by track’s systems
- **Duplicate guard:** Questions use `exam_track_id` + `topic_id` + stem for duplicate detection
- **Adapter:** `toContentFactoryRequest` uses `config.trackSlug` for prompts only; persistence uses `config.trackId` (UUID)

---

## 3. Draft / Editor Review Only

**Confirmed: All saved items are `draft` or `editor_review` only.**

- **Persistence:** `status = config.saveStatus === "editor_review" ? "editor_review" : "draft"` for all content types
- **Validation:** `validateGenerationConfig` restricts `saveStatus` to `draft` or `editor_review`
- **Defaults:** `GenerationConfigPanel` default `saveStatus: "draft"`; batch engine uses `saveStatus: "draft"`
- **No auto-publish:** No path sets `approved` or `published` for AI-generated content

---

## 4. Persistence vs Supabase Schema

| Table | Columns Used | Schema Match |
|-------|--------------|--------------|
| questions | exam_track_id, question_type_id, system_id, domain_id, topic_id, stem, stem_metadata, status | ✓ |
| question_options | question_id, option_key, option_text, is_correct, option_metadata, display_order | ✓ |
| study_guides | exam_track_id, system_id, topic_id, slug, title, description, status | ✓ |
| study_material_sections | study_guide_id, slug, title, content_markdown, section_metadata, display_order | ✓ |
| flashcard_decks | exam_track_id, system_id, topic_id, name, description, source, deck_type, difficulty, status | ✓ |
| flashcards | flashcard_deck_id, front_text, back_text, metadata, display_order | ✓ |
| high_yield_content | content_type, exam_track_id, system_id, topic_id, title, explanation, status, type-specific cols | ✓ |
| ai_generation_audit | content_type, content_id, generation_params, model_used, created_by, outcome, batch_job_id | ✓ |

---

## 5. Enum Normalization

| Field | Source | Normalization |
|-------|--------|---------------|
| content_status | draft, editor_review | Validation restricts; persistence uses only these |
| high_yield_content_type | high_yield_summary, common_confusion, board_trap, compare_contrast_summary | Matches DB enum |
| confusion_frequency | common, very_common, extremely_common | `normalizeConfusionFrequency()` |
| trap_severity | 1–5 | `normalizeTrapSeverity()` clamps |
| deck_type | rapid_recall, high_yield_clinical | `DECK_TYPE_MAP` → rapid_recall, high_yield |
| difficulty (flashcards) | easy, medium, hard | Validated; defaults to medium |

---

## 6. Generation History Logging

**Confirmed: Generation history is logged.**

- **Single-item (preview):** `recordGenerationAudit()` at generate time → `outcome: "pending"` → updated to `saved` on save
- **Single-item (generate-and-save):** `recordAudit()` or `recordGenerationAudit()` at save time → `outcome: "saved"`
- **Batch:** `recordGenerationAudit({ batchJobId })` before each save → persistence updates `content_id` and `outcome: "saved"`
- **Discard:** `recordGenerationDiscarded(auditId)` sets `outcome: "discarded"`
- **History UI:** `loadAIGenerationHistory`, `loadAIGenerationCounts`, `loadAIGenerationHistoryUsers` (admin-only)

---

## 7. Batch Generation

**Confirmed: Batch generation works and is logged.**

- **Create job:** `createAIBatchJobAction` → `ai_batch_jobs` row
- **Run job:** `runAIBatchJobAction` → `runBatchJob()` generates and saves per topic
- **Track scope:** Single track per job; topics from `resolveTopicIds(trackId, topicIds, systemIds)`
- **Progress:** `updateBatchProgress()` updates `completed_count`, `failed_count`, `skipped_duplicate_count`
- **Audit:** Each batch item gets an `ai_generation_audit` row with `batch_job_id`

---

## 8. Preview / Edit / Save Flow

**Confirmed: Preview → edit → save works for all content types.**

| Tab | Generate Preview | Edit | Save | Discard |
|-----|------------------|------|------|---------|
| Questions | `generateQuestionDraft` | `QuestionPreview` | `saveQuestionDraft` | `recordGenerationDiscardedAction` |
| Study guides | `generateStudyGuideDraft` | Inline | `saveStudyGuideDraft` | — |
| Flashcards | `generateFlashcardDeckDraft` | Inline | `saveFlashcardDeckDraft` | — |
| High-yield | `generateHighYieldDraft` | Inline | `saveHighYieldDraft` | — |

---

## 9. What Is Fully Working

- **Questions:** Generate preview, edit, save, batch; duplicate stem guard; audit logging
- **Study guides:** Full and section pack; preview, save, batch; audit logging
- **Flashcard decks:** Preview, save, batch; deck_type and difficulty normalization; audit logging
- **High-yield:** All four subtypes; preview, save, batch; enum normalization; audit logging
- **Batch jobs:** Create, run, progress; track-scoped; audit per item
- **Generation history:** List, filter, counts; admin-only
- **Security:** Admin-only + rate limiting on all AI factory actions
- **Review pipeline:** AI content defaults to draft/editor_review; flows into review queue

---

## 10. What Remains Mocked

- **Jade Tutor (student-facing):** Uses mock response when `OPENAI_API_KEY` is unset
- **Retrieval:** Falls back to mock when `ai_chunks` is empty (RAG for tutor context)
- **AI Content Factory:** No mock; returns `{ success: false, error: "AI service not configured" }` when OpenAI is not configured

---

## 11. Content That Can Be Mass-Produced Immediately

With `OPENAI_API_KEY` and Supabase configured:

| Content Type | Batch Presets | Single-Item |
|--------------|---------------|-------------|
| Questions | 50/track, 10/topic, etc. | ✓ |
| Study guides (full) | ✓ | ✓ |
| Study guide section packs | ✓ | ✓ |
| Flashcard decks | ✓ | ✓ |
| High-yield summaries | ✓ | ✓ |
| Common confusions | ✓ | ✓ |
| Board traps | ✓ | ✓ |
| Compare/contrast | ✓ | ✓ |

---

## 12. Bug Fixes Applied

1. **Batch audit logging:** Batch items now create `ai_generation_audit` records with `batch_job_id`; persistence updates `content_id` and `outcome` on save.
2. **Audit params:** `RecordGenerationAuditParams` extended with `batchJobId` for batch traceability.

---

## 13. Files Touched

- `src/lib/ai/audit-logging.ts` – Added `batchJobId` support
- `src/lib/ai/batch-engine.ts` – Added `recordGenerationAudit` before each save; pass `auditId` and `createdBy`
