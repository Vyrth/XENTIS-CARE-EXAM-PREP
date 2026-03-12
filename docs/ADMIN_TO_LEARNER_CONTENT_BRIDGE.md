# Phase 2C — Admin-to-Learner Content Bridge Verification

## Summary

Content created in admin flows through status transitions and becomes visible on learner pages only when status is `approved` or `published`. All learner loaders filter by `LEARNER_VISIBLE_STATUSES`; `exam_track_id`, `system_id`, and `topic_id` are preserved through creation and updates.

---

## Content Creation → DB Row

| Content Type | Admin Action | DB Table | Initial Status | Preserved Fields |
|--------------|--------------|----------|----------------|------------------|
| **Questions** | `createQuestion` | `questions` | `draft` | `exam_track_id`, `system_id`, `domain_id`, `topic_id`, `subtopic_id` |
| **Study Guides** | `createStudyGuide` | `study_guides` | `draft` | `exam_track_id`, `system_id`, `topic_id` |
| **Flashcards** | `createFlashcardDeck` | `flashcard_decks` | `draft` | `exam_track_id`, `system_id`, `topic_id` |
| **Videos** | `createVideo` | `video_lessons` | `draft` | `exam_track_id`, `system_id`, `topic_id` |
| **High-Yield** | `createHighYieldItem` | `high_yield_content` | `draft` | `exam_track_id`, `system_id`, `topic_id` |

---

## Status Flow

```
draft → editor_review → sme_review → legal_review → qa_review → approved → published
         ↑                    ↑           ↑            ↑
         └── needs_revision ──┴───────────┴────────────┘
```

- **Learner-visible**: `approved`, `published` (see `config/content.ts` → `LEARNER_VISIBLE_STATUSES`)
- **Transition**: `transitionContentStatus` in `content-review.ts` enforces valid transitions via `canTransition`
- **Publish gate**: When transitioning to `published`, `checkPublishGate` and `checkSourceEvidenceGate` must pass

---

## Learner Loaders (Published-Only)

| Content Type | Loader | Filter | Learner Route |
|--------------|--------|--------|---------------|
| **Questions** | `loadQuestionIds`, `loadQuestionCounts`, `loadQuestionsPage`, `loadQuestionMetadataForScoring` | `.in("status", LEARNER_VISIBLE_STATUSES)` | `/questions`, `/exam/*`, `/practice/*` |
| **Study Guides** | `loadStudyGuides`, `loadStudyGuideById` | `.in("status", LEARNER_VISIBLE_STATUSES)` | `/study-guides`, `/study-guides/[guideId]` |
| **Flashcards** | `loadFlashcardDecks`, `loadFlashcardsByDeck` | `.in("status", LEARNER_VISIBLE_STATUSES)` | `/flashcards`, `/flashcards/[deckId]` |
| **Videos** | `loadVideos`, `loadVideoById` | `.in("status", LEARNER_VISIBLE_STATUSES)` | `/videos`, `/videos/[videoId]` |
| **High-Yield** | `loadTrapsForTrack`, `loadConfusionsFromTopicSummaries` (curated), `loadHighYieldTopics` (blueprint) | `.in("status", LEARNER_VISIBLE_STATUSES)` for curated | `/high-yield`, dashboard feed |

---

## Verification Checklist (Per Content Type)

### Questions
- [ ] Admin: Create question with `exam_track_id`, `system_id`, `topic_id` → row created with `status: draft`
- [ ] Admin: Transition draft → editor_review → … → approved (or published)
- [ ] Learner: `/questions` shows question only when status in `[approved, published]`
- [ ] Learner: `/exam/*` and `/practice/*` include question in pool
- [ ] API: `GET /api/questions/[id]` returns 404 for draft
- [ ] API: `GET /api/questions/ids` excludes draft

### Study Guides
- [ ] Admin: Create guide with `exam_track_id`, `system_id`, `topic_id` → row created with `status: draft`
- [ ] Admin: Transition to approved/published
- [ ] Learner: `/study-guides` lists guide only when approved/published
- [ ] Learner: `/study-guides/[guideId]` loads guide; 404 for draft
- [ ] Dashboard: `loadStudyGuides` used by Continue Learning, high-yield feed

### Flashcards
- [ ] Admin: Create deck with `exam_track_id`, `system_id`, `topic_id` → row created with `status: draft`
- [ ] Admin: Transition to approved/published
- [ ] Learner: `/flashcards` lists deck only when approved/published
- [ ] Learner: `/flashcards/[deckId]` loads deck; 404 for draft
- [ ] Deck must have `cardCount > 0` to appear (filter in `loadFlashcardDecks`)

### Videos
- [ ] Admin: Create video with `exam_track_id`, `system_id`, `topic_id` → row created with `status: draft`
- [ ] Admin: Transition to approved/published
- [ ] Learner: `/videos` lists video only when approved/published
- [ ] Learner: `/videos/[videoId]` loads video; 404 for draft
- [ ] Related guides: `loadStudyGuides(trackId, { systemId })` for same system

### High-Yield Content
- [ ] Admin: Create item with `exam_track_id`, `system_id`, `topic_id` → row created with `status: draft`
- [ ] Admin: Transition to approved/published
- [ ] Learner: Traps and confusions from `high_yield_content` only when approved/published
- [ ] Topics: From blueprint + `topic_system_links` (not status-gated)
- [ ] Dashboard: High-yield feed uses `loadHighYieldFeed` → traps/confusions filtered by status

---

## Revalidation on Publish

When `transitionContentStatus` moves content to `published`, these paths are revalidated:

- `/questions`, `/study-guides`, `/flashcards`, `/videos`, `/high-yield`
- `/dashboard`, `/practice`, `/topics`
- Admin detail pages for the entity

---

## Files Changed (Phase 2C)

| File | Change |
|------|--------|
| `src/app/api/content/inventory/route.ts` | Added status filter for `flashcard_decks`; use `LEARNER_VISIBLE_STATUSES` for all content types |
| `docs/ADMIN_TO_LEARNER_CONTENT_BRIDGE.md` | **NEW** — This verification document |

---

## End-to-End Test Flow

1. **Create**: Admin creates question/guide/deck/video/high-yield with track + system + topic.
2. **Verify draft**: Learner routes do not show the item.
3. **Transition**: Admin moves through workflow to `approved` or `published`.
4. **Verify visible**: Learner routes show the item; `exam_track_id`/`system_id`/`topic_id` used for filtering and links.
5. **Reset**: Run `admin_reset_content_zero`; learner routes show empty/zero state.
