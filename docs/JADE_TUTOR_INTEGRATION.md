# Jade Tutor Integration

Jade Tutor is the remediation brain of Xentis Care Exam Prep. It provides track-scoped, personalized tutoring using the learner's weak areas, missed questions, adaptive exam results, study guide usage, and flashcard performance.

## Files Changed

### Renames & UI
- `src/components/ai/AITutorChat.tsx` — placeholder: "Ask Jade Tutor anything..."
- `src/components/study/JadeTutorReviewPanel.tsx` — heading "Remediate with Jade Tutor", action labels aligned to requirements
- `src/components/study/JadeTutorWeakAreaPanel.tsx` — "Teach this concept simply", "Make a mini study plan for this weak area"
- `src/components/study/HighlightableMarkdown.tsx`, `HighlightableText.tsx` — "Jade Tutor" (replacing "Ask Jade")
- `src/app/(app)/videos/[videoId]/VideoLessonClient.tsx` — "ask Jade Tutor"
- `src/app/(app)/study-guides/[guideId]/StudyGuideReaderClient.tsx` — "ask Jade Tutor"
- `src/app/(app)/study-guides/page.tsx` — "ask Jade Tutor"
- `src/app/(app)/notebook/page.tsx` — "Jade Tutor ▾"
- `src/app/(app)/weak-areas/WeakAreaCenterClient.tsx` — "Remediate with Jade Tutor" buttons
- `src/app/(app)/results/[resultId]/rationale/[questionId]/page.tsx` — missed-question banner + "Remediate with Jade Tutor"

### CTAs
- `src/components/dashboard/WeakAreaCards.tsx` — "Remediate with Jade Tutor" link to `/weak-areas`
- `src/lib/readiness/recommendation-engine.ts` — "Remediate with Jade Tutor" recommendation when weak areas exist
- `src/components/adaptive/AdaptiveRecommendedActions.tsx` — "Remediate with Jade Tutor" link
- `src/components/adaptive/AdaptiveCompletionSummary.tsx` — "Remediate with Jade Tutor" CTA in Areas to Review

### Analytics & Context
- `src/lib/ai/jade-analytics.ts` — extended with `recentMistakes`, `studyGuideCompletion`, `flashcardPerf`; all same-track

## Jade Tutor Actions

| Requirement | Action | UI Location |
|-------------|--------|-------------|
| Explain why answer was wrong | `why_wrong` (explainQuestion with `explainMode: "why_others_wrong"`) | JadeTutorReviewPanel (when incorrect) |
| Teach this concept simply | `explain` (explainQuestion with `explainMode: "simple"`) | JadeTutorReviewPanel, JadeTutorWeakAreaPanel |
| Give me a mnemonic | `mnemonic` (generateMnemonic) | JadeTutorReviewPanel, JadeTutorWeakAreaPanel |
| Compare two confusing diagnoses/drugs | `compare` (compareConcepts) | JadeTutorReviewPanel (when system + topic) |
| Quiz me with 3 follow-up questions | `quiz` (quizFollowup) | JadeTutorReviewPanel, JadeTutorWeakAreaPanel |
| Make a mini study plan for this weak area | `remediation_plan` (weakAreaCoaching) | JadeTutorWeakAreaPanel |
| Convert this missed question into flashcards | `flashcards` (generateFlashcards) | JadeTutorReviewPanel |

## Context Filtering

### Track Enforcement
- **Location**: `src/lib/ai/jade-track-context.ts`
- **enforceJadeTrackContext()**: Ensures the client's track matches the user's primary track. If mismatched, the client track is corrected to avoid cross-track leakage.
- **Primary track**: Loaded via `getPrimaryTrack(userId)` from `user_exam_tracks` / `profiles.primary_exam_track_id`.

### Retrieval Filtering
- **Location**: `src/lib/ai/retrieval/index.ts` and `retrieval/retrieve-for-action.ts`
- **examTrack filter**: When `filter.examTrack` is set, retrieval uses `embedding_chunks.exam_track_id` (or equivalent) to return only same-track chunks.
- **No mock fallback**: If no DB chunks exist for the track, the system returns `[]` instead of falling back to mock/cross-track content.

### Analytics Context
- **Location**: `src/lib/ai/jade-analytics.ts`
- **loadAnalyticsForJade()**: Loads only data for the user's primary track:
  - `loadMasteryData(userId, primary.trackId)` — system/domain/skill/item mastery
  - `loadRecentMistakes(userId, primary.trackId)` — missed questions from exam_sessions + user_question_attempts (same-track only)
  - `loadStudyGuideCompletion(userId, primary.trackId)` — study_material_progress for track's published guides
  - `loadFlashcardPerformance(userId, primary.trackId)` — user_flashcard_progress for track's decks

### Rule
- RN users cannot get FNP explanations.
- PMHNP users cannot get RN med-surg content.
- All content is pulled from same-track published content, missed questions, guides, flashcards, and high-yield.
