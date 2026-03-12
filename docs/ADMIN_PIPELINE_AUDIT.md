# Admin Content Production Pipeline Audit

**Date:** March 2025  
**Scope:** Create → Edit → Review → Legal → QA → Publish → Post-publish inventory

---

## 1. Pipeline Stages Overview

| Stage | Location | Status |
|-------|----------|--------|
| **Create** | `/admin/questions/new`, `/admin/study-guides/new`, `/admin/videos/new`, `/admin/flashcards/new`, `/admin/high-yield/new` | Production-ready |
| **Edit** | `/admin/questions/[id]`, `/admin/study-guides/[id]`, `/admin/videos/[id]`, etc. | Production-ready |
| **Review** | `/admin/review-queue?lane=editor|sme|legal|qa|needs_revision` | View-only; links to edit |
| **Legal** | Source evidence panel on question/study-guide/video edit pages | Production-ready |
| **QA** | Same review lanes; no dedicated QA UI | Works via review queue |
| **Publish** | `/admin/publish-queue` | Production-ready; now includes flashcard_deck, high_yield_content |
| **Post-publish inventory** | `/admin/content-inventory`, `/admin/missing-content` | Production-ready |

### Status Transitions

- **DB enum:** `content_status` (draft → editor_review → sme_review → legal_review → qa_review → approved → published → retired, needs_revision)
- **Transitions:** `src/types/admin.ts`, `src/lib/admin/workflow.ts`
- **Legal gate:** `content_source_evidence` table; `legal_status` must pass before publish
- **Publish:** Only from Publish Queue via `ContentStatusTransitionForm`; edit pages show status badge but no inline transitions

---

## 2. Production-Ready Areas

| Area | Details |
|------|---------|
| **Question production** | QuestionProductionStudio with Save & Create Next, Clone, AI draft, track-scoped systems/topics |
| **Study guide production** | StudyGuideProductionStudio with Save & Create Next, Clone, AI draft, Jade chunks |
| **Video production** | VideoProductionStudio with Save & Create Next, Clone, transcript sections, Jade chunks |
| **Flashcard production** | FlashcardProductionStudio with track-scoped systems |
| **High-yield production** | HighYieldProductionStudio |
| **Bulk question import** | BulkImportWorkflow with mapping, validation, default track from URL |
| **Content inventory** | Per-track counts, Add/Import links with track context |
| **Publish queue** | Questions, study guides, videos, flashcard decks, high-yield content |
| **Review workflow** | Multi-lane backlog (editor, SME, legal, QA, needs_revision) |
| **Source evidence** | Legal gate on questions, study guides, videos, high-yield |
| **Launch readiness** | Per-track checklist (13 items) with drill-down |

---

## 3. Friction Points (Addressed)

| Friction | Resolution |
|----------|------------|
| No Save & Create Next for guides/videos | Added to StudyGuideProductionStudio and VideoProductionStudio |
| No duplicate for guides/videos | Added Clone guide / Clone video links; cloneFrom support on new pages |
| Publish queue omitted flashcard_deck, high_yield_content | Added to loadAdminPublishQueue and EDIT_LINKS |
| Bulk import default track | Pre-fill from `?trackId=` when opening from content inventory |
| Content inventory → bulk import | Added Import link with trackId for Questions row |

---

## 4. Remaining Friction

| Friction | Impact | Recommendation |
|----------|--------|----------------|
| Status transitions only on Publish Queue | Users must leave edit page to advance status | Add inline `ContentStatusTransitionForm` to Production Studios |
| Review queue view-only | No bulk approve or quick transitions | Add transition buttons per item in review queue |
| Full page reload on transition | Jarring UX | Use client-side state update or router.refresh() |
| Admin overview uses mock counts | Dashboard shows MOCK_* data | Replace with live DB queries |
| Dead forms (NewStudyGuideForm, NewVideoForm) | Redirect to non-existent routes | Remove or fix redirects |

---

## 5. Track Safety

| Risk | Status | Notes |
|------|--------|------|
| System select not track-scoped | Mitigated | Production Studios filter systems by `examTrackId` |
| Bulk import default track | Mitigated | Pre-fill from URL; validation fails if track empty |
| System resolution by track | Correct | `resolveSystemId(slug, trackId)` uses track-scoped key |
| Exam assembly pool | Correct | Filters `q.exam_track_id === trackId` |
| Topic/system filtering | Correct | Filtered by track in all Production Studios |
| track-inventory legacy statuses | Minor | Uses `review`/`archived`; migration maps to new enum |

---

## 6. Mock / Incomplete Implementations

| File | Issue |
|------|-------|
| `src/app/(app)/admin/page.tsx` | Uses MOCK_QUESTIONS_ADMIN, MOCK_REVIEW_QUEUE, MOCK_PUBLISH_QUEUE, MOCK_USER_ISSUES |
| `src/app/(app)/admin/curriculum/page.tsx` | Uses MOCK_SYSTEMS, MOCK_DOMAINS, MOCK_TOPICS |
| `src/app/(app)/admin/media-rights/page.tsx` | Uses MOCK_MEDIA_RIGHTS |
| `src/app/(app)/admin/ai-prompts/page.tsx` | Uses MOCK_AI_PROMPTS |
| `src/app/(app)/admin/issue-reports/page.tsx` | Uses MOCK_USER_ISSUES |
| `src/app/(app)/admin/recommendations/page.tsx` | Uses MOCK_RECOMMENDATIONS |
| `NewStudyGuideForm.tsx`, `NewVideoForm.tsx` | Unused; redirect to non-existent routes |
| `StudyGuideEditorForm.tsx`, `VideoEditorForm.tsx` | Unused; pages use Production Studios |

---

## 7. Speed Improvements Implemented

| Feature | Location |
|---------|----------|
| Save & Create Next | QuestionProductionStudio, StudyGuideProductionStudio, VideoProductionStudio |
| Clone question | `/admin/questions/new?cloneFrom=...&trackId=...` |
| Clone guide | `/admin/study-guides/new?cloneFrom=...&trackId=...` |
| Clone video | `/admin/videos/new?cloneFrom=...&trackId=...` |
| Quick track default | `?trackId=` on all create pages |
| Bulk import default track | `?trackId=` on `/admin/questions/import` |
| Content inventory Import link | Questions row → `/admin/questions/import?trackId=...` |
| AI draft | QuestionProductionStudio, StudyGuideProductionStudio |
| Keyboard shortcut | Ctrl+Shift+Enter for Save & Create Next (questions) |

---

## 8. Recommended Next Steps

1. **Replace admin overview mock data** with live DB queries (draft count, review queue count, etc.).
2. **Add inline status transitions** to Production Studios so users can advance content without leaving the edit page.
3. **Add transition buttons** to Review Queue for quick approve/reject.
4. **Remove or fix dead forms** (NewStudyGuideForm, NewVideoForm).
5. **Align track-inventory status breakdown** with `content_status` enum (editor_review, sme_review, retired).
6. **Add bulk status transition** for selecting multiple items in review/publish queues.
