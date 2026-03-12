# Learner Experience Fix – Implementation Report

## Pages Updated

| Page | Changes |
|------|---------|
| **Flashcards** | `loadFlashcardDecks` now filters by `status IN ('approved','published')`; empty state shows "In the meantime, try" links to questions, study guides, high-yield |
| **Flashcards [deckId]** | Improved empty state: "Deck not available" with friendly message and links back to flashcards + practice questions |
| **Study Guides** | Uses `EmptyContentState` with "coming next" suggestions (unchanged loader; already filtered by approved) |
| **Videos** | Uses `EmptyContentState` with "coming next" suggestions (unchanged loader; already filtered by approved) |
| **Questions** | Uses `EmptyContentState` with "coming next" suggestions; removed raw seed instructions from production |
| **High-Yield** | Empty state shows "Try these instead" links to Practice Questions and Study Guides |
| **EmptyContentState** | Added "In the meantime, try" links; dev note shows inventory counts only (no seed instructions in prod); supports `questions` contentType |

## How Track Scoping Is Enforced

- **Source of truth**: `getPrimaryTrack(userId)` from `@/lib/auth/track` uses `profile.primary_exam_track_id` and resolves slug via `exam_tracks`.
- **Layout guard**: `(app)/layout.tsx` redirects to onboarding if `!profile.primary_exam_track_id`.
- **Dashboard**: Redirects to onboarding if `!primary`.
- **All content loaders**:
  - `loadStudyGuides(trackId)` – `.eq("exam_track_id", trackId).eq("status", "approved")`
  - `loadFlashcardDecks(trackId)` – `.eq("exam_track_id", trackId).in("status", ["approved", "published"])`
  - `loadVideos(trackId)` – `.eq("exam_track_id", trackId).eq("status", "approved")`
  - `loadQuestionCounts(trackId)` – `.eq("exam_track_id", trackId).eq("status", "approved")`
  - `loadHighYieldFeed(trackId, trackSlug)` – track-scoped; high_yield_content uses `.eq("exam_track_id", trackId).eq("status", "approved")`

## How Empty States Behave

- **Flashcards, Study Guides, Videos, Questions**: Use `EmptyContentState` with:
  - Friendly title and description
  - "In the meantime, try" links (practice questions, study guides, high-yield)
  - Dev-only inventory counts (guides, decks, videos, questions, high-yield) — no seed instructions in production
- **High-Yield**: Card with "Try these instead" links to Practice Questions and Study Guides
- **Flashcard deck detail**: "Deck not available" with links back to flashcards and practice questions

## Published-Only Content for Learners

| Content Type | Filter |
|--------------|--------|
| Study guides | `status = 'approved'` |
| Flashcard decks | `status IN ('approved', 'published')` |
| Videos | `status = 'approved'` |
| Questions | `status = 'approved'` |
| High-yield content | `status = 'approved'` |

Draft and editor_review content is not shown to learners.

## Content Inventory (Dev Mode)

`loadContentInventoryByTrack` now returns:
- `guides` – approved study guides
- `decks` – approved/published flashcard decks
- `videos` – approved videos
- `questions` – approved questions
- `highYield` – approved high-yield content

Shown only when `isDev` is true in `EmptyContentState`.

## What Still Needs Generated Content

To fully populate learner pages:

1. **Questions** – Seed or generate approved questions per track
2. **Study guides** – Create and approve guides per system/track
3. **Flashcard decks** – Create decks with cards and set status to approved
4. **Videos** – Add and approve video lessons
5. **High-yield** – Add approved high_yield_content (topics, traps, confusions) or rely on topic_summaries/mock fallbacks

The high-yield page can show topics from blueprint + topic_system_links and falls back to mock traps/confusions when no approved high_yield_content exists.
