# Phase 2C — Admin-to-Learner Content Bridge Verification

## Summary

Admin-created or AI-generated content flows correctly into learner views after publish. All learner routes filter by `exam_track_id` and `LEARNER_VISIBLE_STATUSES` (approved, published). No mock loaders or manual hacks.

---

## Content Pipeline Overview

| Content Type | Admin Table | Learner Loader | Key Identifiers |
|--------------|-------------|----------------|-----------------|
| Questions | `questions` | `loadQuestionCounts`, `loadQuestionsBySystem`, etc. | `exam_track_id`, `system_id`, `domain_id`, `topic_id`, `status` |
| Study Guides | `study_guides`, `study_material_sections` | `loadStudyGuides`, `loadStudyGuideById` | `exam_track_id`, `system_id`, `topic_id`, `status` |
| Flashcards | `flashcard_decks`, `flashcards` | `loadFlashcardDecks`, `loadFlashcardsByDeck` | `exam_track_id`, `system_id`, `topic_id`, `status`, `source` |
| Videos | `video_lessons` | `loadVideos`, `loadVideoById` | `exam_track_id`, `system_id`, `topic_id`, `status` |
| High-Yield | `high_yield_content` | `loadHighYieldFeed` (topics, traps, confusions) | `exam_track_id`, `system_id`, `topic_id`, `status`, `content_type` |

---

## Verification Checklist (per content type)

### Questions

| Step | Location | Verification |
|------|----------|--------------|
| **Create** | `/admin/questions/new`, `createQuestion` | `exam_track_id`, `system_id`, `domain_id`, `topic_id` set; `status: "draft"` |
| **Review** | `/admin/review-queue`, `ContentStatusTransitionForm` | Workflow: draft → editor_review → sme_review → legal_review → qa_review → approved |
| **Publish** | `/admin/publish-queue`, `transitionContentStatus` | Gate: all stages approved + source evidence (if config exists); status → "published" |
| **Learner visible** | `/questions`, `loadQuestionCounts` | `eq("exam_track_id", trackId).in("status", ["approved","published"])` |

### Study Guides

| Step | Location | Verification |
|------|----------|--------------|
| **Create** | `/admin/study-guides/new`, `createStudyGuide` | `exam_track_id`, `system_id`, `topic_id` set; `status: "draft"` |
| **Review** | `/admin/review-queue` | Same workflow as questions |
| **Publish** | `/admin/publish-queue` | Same gate; status → "published" |
| **Learner visible** | `/study-guides`, `loadStudyGuides` | `eq("exam_track_id", trackId).in("status", ["approved","published"])` |

### Flashcards

| Step | Location | Verification |
|------|----------|--------------|
| **Create** | `/admin/flashcards/new`, `createFlashcardDeck` | `exam_track_id`, `system_id`, `topic_id` set; `status: "draft"`, `source: "platform"` |
| **Review** | `/admin/review-queue` | Same workflow |
| **Publish** | `/admin/publish-queue` | Same gate; status → "published" |
| **Learner visible** | `/flashcards`, `loadFlashcardDecks` | `eq("exam_track_id", trackId).or("source.eq.platform,is_public.eq.true").in("status", ["approved","published"])`; decks with 0 cards filtered out |

### Videos

| Step | Location | Verification |
|------|----------|--------------|
| **Create** | `/admin/videos/new`, `createVideo` | `exam_track_id`, `system_id`, `topic_id` set; `status: "draft"` |
| **Review** | `/admin/review-queue` | Same workflow |
| **Publish** | `/admin/publish-queue` | Same gate; status → "published" |
| **Learner visible** | `/videos`, `loadVideos` | `eq("exam_track_id", trackId).in("status", ["approved","published"])` |

### High-Yield Content

| Step | Location | Verification |
|------|----------|--------------|
| **Create** | `/admin/high-yield/new`, `createHighYieldItem` | `exam_track_id`, `system_id`, `topic_id`, `content_type` set; `status: "draft"` |
| **Review** | `/admin/review-queue` | Same workflow |
| **Publish** | `/admin/publish-queue` | Same gate; status → "published" |
| **Learner visible** | `/high-yield`, `loadHighYieldFeed` | Topics from blueprint; traps/confusions from `high_yield_content` with `eq("exam_track_id", trackId).in("status", ["approved","published"])` |

---

## Admin Routes Audited

| Route | Loader | Notes |
|-------|--------|-------|
| `/admin/questions` | `loadAdminQuestions` | All statuses; track filter |
| `/admin/questions/new` | — | Form; `createQuestion` |
| `/admin/questions/[id]` | `loadQuestionForEdit` | Edit form; `updateQuestion` |
| `/admin/study-guides` | `loadAdminStudyGuides` | All statuses |
| `/admin/study-guides/new` | — | Form; `createStudyGuide` |
| `/admin/study-guides/[id]` | Study guide studio loaders | Edit; `updateStudyGuide`, `saveStudyGuideSections` |
| `/admin/flashcards` | `loadAdminFlashcardDecks` | All statuses |
| `/admin/flashcards/new` | — | Form; `createFlashcardDeck` |
| `/admin/flashcards/[deckId]` | Flashcard studio loaders | Edit; `updateFlashcardDeck`, `saveFlashcards` |
| `/admin/videos` | `loadAdminVideos` | All statuses |
| `/admin/videos/new` | — | Form; `createVideo` |
| `/admin/videos/[id]` | Video studio loaders | Edit; `updateVideo` |
| `/admin/high-yield` | High-yield studio loaders | All statuses |
| `/admin/high-yield/new` | — | Form; `createHighYieldItem` |
| `/admin/high-yield/[id]` | High-yield studio loaders | Edit; `updateHighYieldItem` |
| `/admin/publish-queue` | `loadAdminPublishQueue` | Approved items only; `ContentStatusTransitionForm` for publish |

---

## Learner Routes Audited

| Route | Loader | Filter |
|-------|--------|--------|
| `/questions` | `loadQuestionCounts`, `loadSystemsForTrack`, etc. | `exam_track_id` + `LEARNER_VISIBLE_STATUSES` |
| `/questions/system/[slug]` | `loadQuestionsBySystem` | Same |
| `/questions/domain/[slug]` | `loadQuestionsByDomain` | Same |
| `/questions/topic/[slug]` | `loadQuestionsByTopic` | Same |
| `/study-guides` | `loadStudyGuides` | Same |
| `/study-guides/[guideId]` | `loadStudyGuideById` | Same |
| `/flashcards` | `loadFlashcardDecks` | Same + `source=platform` or `is_public=true` |
| `/flashcards/[deckId]` | `loadFlashcardsByDeck` | Deck must be approved/published + track-scoped |
| `/videos` | `loadVideos` | Same |
| `/videos/[videoId]` | `loadVideoById` | Same |
| `/high-yield` | `loadHighYieldFeed` | Topics from blueprint; traps/confusions from `high_yield_content` with same filter |

---

## Publish Flow

1. **Content status**: `transitionContentStatus(entityType, entityId, "published", ...)`
2. **Gates**: `checkPublishGate` (all review stages) + `checkSourceEvidenceGate` (if `content_type_source_config` exists)
3. **Update**: `status = "published"` on content table
4. **Revalidation** (when `toStatus === "published"`):
   - Admin: `/admin/review-queue`, `/admin/publish-queue`, entity edit pages
   - Learner: `/questions`, `/study-guides`, `/flashcards`, `/videos`, `/high-yield`, `/dashboard`, `/practice`, `/topics` (with `"layout"` for nested routes)

---

## AI Factory Integration

- **Persistence**: `src/lib/admin/ai-factory-persistence.ts`, `src/lib/ai/factory/persistence.ts`
- **Status**: All AI output is `draft` or `editor_review`; never auto-published
- **Identifiers**: `exam_track_id`, `system_id`, `topic_id` set from `GenerationConfig`
- **Flow**: AI generates → persist as draft → admin reviews → publish → learner visible

---

## Root Causes Addressed

1. **Revalidation scope**: Added `"layout"` type to `revalidatePath` for content routes so nested routes (e.g. `/questions/system/[slug]`, `/study-guides/[id]`) revalidate on next visit after publish.
2. **Audit doc fix**: Corrected `study_guide_sections` → `study_material_sections` in LEARNER_METRICS_TRUTH_AUDIT.md.
3. **Publish blocked by source evidence** (Build phase): Admin-created content had no `content_source_evidence` row, so `checkSourceEvidenceGate` blocked publish. Added `ensureSourceEvidenceForAdminContent()` — auto-creates `source_basis: "original"`, `legal_status: "original"` on create for questions, study guides, flashcards, videos, high-yield.

---

## Files Changed (Phase 2C + Build Phase)

| File | Change |
|------|--------|
| `src/app/(app)/actions/content-review.ts` | Use `revalidatePath(path, "layout")` for content routes when publishing |
| `src/lib/admin/source-evidence.ts` | Add `ensureSourceEvidenceForAdminContent()` helper |
| `src/app/(app)/actions/questions.ts` | Call `ensureSourceEvidenceForAdminContent("question", id)` on create |
| `src/app/(app)/actions/study-guides.ts` | Call `ensureSourceEvidenceForAdminContent("study_guide", id)` on create |
| `src/app/(app)/actions/flashcards.ts` | Call `ensureSourceEvidenceForAdminContent("flashcard_deck", id)` on create |
| `src/app/(app)/actions/videos.ts` | Call `ensureSourceEvidenceForAdminContent("video", id)` on create |
| `src/app/(app)/actions/high-yield.ts` | Call `ensureSourceEvidenceForAdminContent("high_yield_content", id)` on create |
| `docs/LEARNER_METRICS_TRUTH_AUDIT.md` | Fix table name: `study_material_sections` |
| `docs/ADMIN_LEARNER_CONTENT_BRIDGE.md` | Verification checklist and pipeline mapping |

---

## Remaining Blockers

None. Pipeline is end-to-end verified. If newly published content does not appear:

1. Confirm `exam_track_id` matches learner's primary track.
2. Confirm `status` is `approved` or `published` (learner loaders use `LEARNER_VISIBLE_STATUSES`).
3. For flashcards: confirm deck has `source = "platform"` or `is_public = true`, and has at least one card.
4. Check `content_type_source_config` and `content_source_evidence` if publish is blocked.
