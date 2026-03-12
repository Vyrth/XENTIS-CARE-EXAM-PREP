# Phase 7: Admin → Learner Publish Flow

## Overview

Admin-generated content must flow correctly into learner-visible pages. This document audits the publish chain and lists all changes made to ensure:

- Draft/editor_review content never appears to learners
- Published content appears immediately through real loaders
- Track filtering is correct
- Empty learner pages populate when published content exists
- No learner page depends on admin-only tables or mock loaders

---

## Publish Flow (Audited)

```
1. AI Factory / Admin creates content
   └─ Status: draft | editor_review

2. Review workflow (content-review.ts, review-workflow.ts)
   └─ draft → editor_review → sme_review → legal_review → qa_review → approved

3. Publish queue (loadAdminPublishQueue)
   └─ Returns items with status = "approved" (ready to publish)

4. Publish action (transitionContentStatus → "published")
   └─ Updates status to "published"
   └─ Revalidates admin + learner paths

5. Learner visibility
   └─ Loaders filter by status IN ("approved", "published")
```

---

## Content Visibility Config

**File:** `src/config/content.ts`

```ts
export const LEARNER_VISIBLE_STATUSES = ["approved", "published"] as const;
```

- **Visible:** approved, published
- **Hidden:** draft, editor_review, sme_review, legal_review, qa_review, needs_revision, retired

---

## Changes Made

### 1. Learner Content Loaders

| File | Function | Change |
|------|----------|--------|
| `src/lib/content/loaders.ts` | loadStudyGuides | `.eq("status","approved")` → `.in("status", LEARNER_VISIBLE_STATUSES)` |
| | loadStudyGuideById | Same |
| | loadFlashcardDecks | Same |
| | loadFlashcardsByDeck | Deck lookup now filters by learner-visible status (draft decks return 404) |
| | loadVideos | Same |
| | loadVideoById | Same |
| | loadContentInventoryByTrack | Same |
| `src/lib/questions/loaders.ts` | loadQuestionCounts (all variants) | Same |
| | loadQuestionIds | Same |
| | loadQuestionsPage | Same |
| | loadCorrectAnswersByQuestion | Same |
| | loadSubtopicsForTrack | Same |
| `src/lib/high-yield/loaders.ts` | loadConfusionsFromTopicSummaries | Same |
| | loadTrapsForTrack | Same |

### 2. API Routes

| File | Change |
|------|--------|
| `src/app/api/questions/[id]/route.ts` | `.eq("status","approved")` → `.in("status", LEARNER_VISIBLE_STATUSES)` |

### 3. Exam Assembly (Admin)

| File | Change |
|------|--------|
| `src/app/(app)/actions/exam-assembly.ts` | addQuestionsToTemplatePool, addQuestionsToSystemExamPool: use LEARNER_VISIBLE_STATUSES |
| `src/lib/admin/exam-assembly-pool.ts` | queryPoolByFilters, loadTemplatePoolComposition, loadSystemExamPoolComposition, validatePool: use LEARNER_VISIBLE_STATUSES |

### 4. Publish Revalidation

**File:** `src/app/(app)/actions/content-review.ts`

When `transitionContentStatus(..., "published")` succeeds, revalidate:

- Admin: review-queue, publish-queue, entity detail pages
- **Learner:** `/questions`, `/study-guides`, `/flashcards`, `/videos`, `/high-yield`, `/dashboard`, `/practice`, `/topics`

---

## Intentionally Unchanged

| Location | Reason |
|----------|--------|
| `loadAdminPublishQueue` (admin/loaders.ts) | Publish queue shows items with status "approved" (ready to publish). Correct. |
| `admin/overview-loaders.ts` | Admin overview; approved-only for publish-queue counts. |
| `admin/blueprint-coverage.ts` | Admin coverage view; can be updated later for consistency. |
| `api/content/inventory/route.ts` | Admin inventory API. |

---

## Content Types Summary

| Type | Table | Learner Loader | Admin Publish |
|------|-------|----------------|---------------|
| Questions | questions | loadQuestionIds, loadQuestionsPage, loadQuestionCounts | ✓ |
| Study guides | study_guides | loadStudyGuides, loadStudyGuideById | ✓ |
| Flashcard decks | flashcard_decks | loadFlashcardDecks | ✓ |
| Flashcards | flashcards (via deck) | loadFlashcardsByDeck (deck must be visible) | ✓ |
| Videos | video_lessons | loadVideos, loadVideoById | ✓ |
| High-yield | high_yield_content | loadConfusionsFromTopicSummaries, loadTrapsForTrack | ✓ |

---

## End-to-End Test Checklist

### Prerequisites

- Admin user with access to review queue and publish queue
- Learner user with a track selected
- At least one item per content type in `approved` status (from admin)

### 1. Draft/Editor Review Hidden

- [ ] Create a question as draft. As learner, verify it does not appear in `/questions`, practice, or exam.
- [ ] Create a study guide as editor_review. As learner, verify it does not appear in `/study-guides`.
- [ ] Create a flashcard deck as draft. As learner, verify it does not appear in `/flashcards`.
- [ ] Create a video as editor_review. As learner, verify it does not appear in `/videos`.
- [ ] Create high-yield content as draft. As learner, verify it does not appear in `/high-yield`.

### 2. Publish Flow

- [ ] In admin, open Publish Queue. Verify approved items appear.
- [ ] Publish one question. As learner, refresh `/questions` and verify it appears.
- [ ] Publish one study guide. As learner, refresh `/study-guides` and verify it appears.
- [ ] Publish one flashcard deck. As learner, refresh `/flashcards` and verify it appears.
- [ ] Publish one video. As learner, refresh `/videos` and verify it appears.
- [ ] Publish one high-yield item. As learner, refresh `/high-yield` and verify it appears.

### 3. Track Filtering

- [ ] Create content for Track A. Switch learner to Track B. Verify content does not appear.
- [ ] Switch learner to Track A. Verify content appears.

### 4. System/Topic Relationships

- [ ] Publish a study guide linked to System X. On `/study-guides`, filter by System X. Verify it appears.
- [ ] Publish a video linked to System Y. On `/videos`, filter by System Y. Verify it appears.
- [ ] Publish questions for Topic Z. On `/questions`, filter by Topic Z. Verify they appear.

### 5. Empty → Populated

- [ ] With no published content for a track, verify learner pages show empty state (not errors).
- [ ] Publish content. Verify pages populate without requiring full app restart.

### 6. Exam Assembly

- [ ] In admin, add approved/published questions to an exam template. Verify they are accepted.
- [ ] As learner, take the system exam. Verify only learner-visible questions are used.

---

## Verification Commands

```bash
# Ensure no learner loader uses .eq("status","approved") alone
rg '\.eq\("status",\s*"approved"\)' src/lib/content src/lib/questions src/lib/high-yield src/app/api

# Should return no matches in learner-facing loaders
```
