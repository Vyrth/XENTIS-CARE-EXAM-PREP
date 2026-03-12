# Study Loop Production Readiness Summary

## Full Study Loop (9 Steps)

1. **User opens dashboard** → sees real track-specific recommendations  
2. **Starts practice or study content** → questions, study guides, videos, flashcards  
3. **Answers real questions** → exam sessions (pre-practice, custom, system)  
4. **Gets real scoring and review** → results, breakdown, rationale  
5. **Uses Jade Tutor** → explain, mnemonics, weak-area coaching  
6. **Saves notes or flashcards** → notebook (user_notes), flashcard decks  
7. **Generates new analytics** → mastery, trends, readiness  
8. **Returns to dashboard** → updated recommendations  

---

## Fully Live ✅

| Stage | Data Flow | Persistence |
|-------|-----------|-------------|
| **Dashboard** | `loadDashboardStats`, `loadMasteryData`, `loadHighYieldTopics`, `loadStudyWorkflowRecommendations`, `loadLastPrePracticeDate`, `loadPerformanceTrends` | `exam_sessions`, `exam_session_questions`, `user_question_attempts`, `user_system_mastery`, `user_domain_mastery`, `user_skill_mastery`, `user_item_type_performance`, `user_readiness_snapshots`, `user_performance_trends`, `recommended_content_queue` |
| **Practice / Study** | `loadQuestionCounts`, `loadSystemsForTrack`, `loadStudyGuides`, `loadVideos`, `loadFlashcardDecks` | `questions`, `systems`, `domains`, `topics`, `study_guides`, `video_lessons`, `flashcard_decks`, `flashcards` |
| **Answer questions** | `fetchQuestionIdsForExam`, `submitExamAndScore`, `saveExamSession` | `exam_sessions`, `exam_session_questions` |
| **Review** | `loadBreakdownForExam`, `useExamSession`, `useQuestion` | Uses `exam_sessions`, `exam_session_questions` |
| **Jade Tutor** | `/api/ai/*` routes, `enforceJadeTrackContext` | `ai_interaction_logs`, `ai_saved_outputs` |
| **Save notes** | `useNotebook` → `/api/notebook/notes` | `user_notes` |
| **Save flashcards** | `/api/flashcards/save-deck` | `flashcard_decks`, `flashcards`, `ai_saved_outputs` |
| **Analytics** | `loadMasteryData`, `loadReadinessScore`, `loadPerformanceTrends` | Materialized tables or derived from `exam_session_questions` + `user_question_attempts` |
| **Return to dashboard** | Nav links, workflow recommendations | — |

---

## Partially Live ⚠️

| Component | Status | Notes |
|-----------|--------|-------|
| **Materialized mastery** | Derived when empty | `user_system_mastery`, etc. are populated by triggers/jobs when available. When empty, `computeMasteryFromActivity` derives from raw activity. No sync job yet. |
| **AI retrieval (RAG)** | Fallback to mock | `ai_chunks` used when populated; otherwise `retrieveChunksMock`. Needs content embedding pipeline. |
| **High-yield traps/confusions** | Fallback to mock | `MOCK_TOP_TRAPS`, `MOCK_COMMON_CONFUSIONS` when DB empty. |
| **Study guide progress** | Not loaded | `study_material_progress` exists but no loader. Workflow uses `studyGuideCompletion: undefined`. |
| **Video progress** | Not loaded | `video_progress` exists but no loader. |

---

## Code Fixes Applied (This Audit)

1. **Notebook persistence** — `useNotebook` now uses `/api/notebook/notes` → `user_notes`. Notes persist across sessions.
2. **Flashcard save from Jade** — Rationale page and AI Tutor `onSaveFlashcards` now use `/api/flashcards/save-deck` instead of `/api/ai/save`. Creates real decks and redirects to deck.
3. **Loading states** — Added `loading.tsx` for study-guides, videos, flashcards.
4. **Dead route** — `/results/[resultId]` now redirects to `/results/[resultId]/breakdown`.
5. **Notebook error handling** — Loading and error states with retry.

---

## Still Needs Content Population (Not Code)

| Item | Action |
|------|--------|
| **Questions** | Populate `questions` for each track. |
| **Study guides** | Populate `study_guides`, `study_material_sections`. |
| **Videos** | Populate `video_lessons`. |
| **AI chunks** | Run embedding pipeline to populate `ai_chunks` for RAG. |
| **Blueprint weights** | Populate `exam_blueprints`, `topic_system_links` for high-yield. |
| **Materialized mastery** | Add DB triggers or cron to refresh `user_system_mastery`, etc. from `exam_session_questions` + `user_question_attempts`. |

---

## Track Enforcement

- All content loaders filter by `exam_track_id` / `trackId`.
- `getPrimaryTrack()` used in dashboard, exam, flashcards, AI routes.
- `enforceJadeTrackContext()` in all AI API routes.
- Pre-practice and recommendations use track-specific hrefs (`/pre-practice/{track}`).

---

## Dead Ends Removed

- `/results/[resultId]` → redirects to breakdown.
- Flashcard save from Jade → creates deck and navigates to it.
- Notebook → persists to DB, no longer in-memory only.

---

## Browse-Mode Question Attempts

The question detail page (`/questions/[id]`) is **read-only** — it shows question and rationale but does not support answering. All answering happens via the exam flow (`/exam/*`), which persists to `exam_sessions` and `exam_session_questions`. The `recordQuestionAttempt` function exists for future standalone quiz flows (e.g. post-video quiz) but is not currently used. No code change required for the main study loop.
