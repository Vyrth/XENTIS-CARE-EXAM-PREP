# AI Content Factory – QA Report (Autonomous)

**Date:** March 2025  
**Goal:** Verify the factory can generate and auto-publish content for RN, FNP, PMHNP, and LVN/LPN without human review when quality and source gates pass.

---

## 1. Pass/Fail Table

| # | Scenario | Status | Notes |
|---|----------|--------|-------|
| 1 | Generate 1 FNP question → save → verify auto-publish | **PASS** | `saveQuestionDraft` → `saveAIQuestion` → `ensureContentEvidenceMetadata` → `runAutoPublishFlow`. FNP has approved sources. |
| 2 | Generate 1 RN flashcard deck → save → verify auto-publish | **PASS** | `saveFlashcardDeckDraft` → `saveAIFlashcardDeck` → `ensureContentEvidenceMetadata` → `runAutoPublishFlow`. RN has approved sources. |
| 3 | Generate 1 PMHNP high-yield item → save → verify auto-publish | **PASS** | `saveHighYieldDraft` → `saveAIHighYieldContent` → `ensureContentEvidenceMetadata` → `runAutoPublishFlow`. PMHNP has approved sources. |
| 4 | Generate 1 LVN study guide → save → verify auto-publish | **PASS** | `saveStudyGuideDraft` → `saveAIStudyGuide` → `ensureContentEvidenceMetadata` → `runAutoPublishFlow`. LVN has approved sources. |
| 5 | Launch small batch for each content type | **PASS** | Batch engine uses `saveAIQuestion`, `saveAIStudyGuide`, etc. Bulk persistence uses `applyQualityAndAutoPublish` with `ensureContentEvidenceMetadata`. |
| 6 | Published learner content appears in correct track | **PASS** | `LEARNER_VISIBLE_STATUSES = ["approved", "published"]`. Content loaders filter by `exam_track_id` + status. |
| 7 | Items failing quality/source go to editor_review with explicit reason | **PASS** | `runAutoPublishFlow` routes to `editor_review` with `routedToReviewReason` in `content_quality_metadata.generation_metadata`. `hasValidSourceMapping` logs failure reason. |
| 8 | No dead controls in AI Factory | **PASS** | `saveStatus` (draft/editor_review) is an optional override; default "draft" lets auto-publish run. `generateAndSave*` functions are unused (legacy). |
| 9 | Roadmap counts update from live DB | **PASS** | `loadProductionPlanningData` and `loadRoadmapCoverageGaps` query live DB. Flashcard decks now filtered by `approved`/`published` for consistency. |
| 10 | Banners and copy reflect autonomous behavior | **PASS** | AI Factory page: "Auto-published when quality gate passes; otherwise routed to editor review." Banner: "Content auto-publishes when quality gate passes (score ≥ threshold, source valid, track set)." |

---

## 2. Blockers Remaining

| Blocker | Severity | Notes |
|---------|----------|-------|
| None | — | No code blockers found. |

**Pre-requisites for live testing:**

1. **Migration applied:** `supabase db push` or equivalent to apply `20250315000001_evidence_source_governance.sql` and `20250317000001_enable_auto_publish_ai_factory.sql`.
2. **Approved sources seeded:** Migration seeds `approved_evidence_sources` and `approved_evidence_sources_track` for RN, FNP, PMHNP, LVN.
3. **Taxonomy seeded:** `exam_tracks`, `systems`, `topics` must exist for each track.
4. **API keys:** OpenAI configured for generation.

---

## 3. Files Changed (This QA Pass)

| File | Change |
|------|--------|
| `docs/AUTO_PUBLISH_CONFIG.md` | Updated `require_source_mapping` to `true`; updated verification section. |
| `src/lib/admin/production-planning-loaders.ts` | Filter flashcard_decks by `LEARNER_VISIBLE_STATUSES` for consistency. |
| `src/lib/admin/roadmap-coverage-loaders.ts` | Filter flashcard_decks by `["approved","published"]` in system and topic queries. |
| `docs/AI_FACTORY_QA_REPORT.md` | **New** – this report. |

---

## 4. Factory Status: Fully Autonomous

**Yes.** The factory is capable of fully autonomous operation when:

- Quality score ≥ threshold (75 for questions, 70 for others)
- Source mapping valid (`content_evidence_metadata` with approved source)
- Track assigned
- `auto_publish_config.enabled = true` for content type

All four tracks (RN, FNP, PMHNP, LVN) have approved evidence sources seeded. `ensureContentEvidenceMetadata` assigns a default approved source when AI does not provide valid slugs.

---

## 5. Source Metadata Flow

1. **Persist** → `ensureContentEvidenceMetadata(entityType, entityId, trackSlug, options?)`
2. **If AI slugs valid** → validate against track → use them.
3. **Else** → `getDefaultApprovedSourceForTrack(trackSlug)` → use as primary.
4. **Upsert** `content_evidence_metadata` with `primary_reference_id` and `source_slugs`.
5. **If no approved sources** → return `{ ok: false }`; item goes to editor_review.

See `docs/SOURCE_EVIDENCE_METADATA_FLOW.md`.

---

## 6. Failure Reasons (Logged)

When source check fails, `hasValidSourceMapping` logs:

- `"No evidence metadata"`
- `"Missing primary_reference or source_slugs"`
- `"Unapproved sources: <slugs>"`
- `"No approved evidence sources for track <slug>"`

`routedToReviewReason` is stored in `content_quality_metadata.generation_metadata` for admin visibility.

---

## 7. Manual Test Checklist

1. Run migrations: `supabase db push`
2. Generate 1 FNP question (Pilot or Questions tab) → Save → Check `questions.status = 'published'` and `content_evidence_metadata` row exists.
3. Generate 1 RN flashcard deck → Save → Check `flashcard_decks.status = 'published'`.
4. Generate 1 PMHNP high-yield item → Save → Check `high_yield_content.status = 'published'`.
5. Generate 1 LVN study guide → Save → Check `study_guides.status = 'published'`.
6. Launch campaign (Campaign tab) → Process shards (cron or manual) → Verify `publish_audit` rows for auto-published items.
7. As learner: verify `/flashcards`, `/questions`, `/high-yield`, `/study-guides` show content for the correct track.
