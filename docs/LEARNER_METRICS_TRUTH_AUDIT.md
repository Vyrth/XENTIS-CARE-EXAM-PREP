# Phase 2B — Learner Metrics Truth Audit

## Summary

All learner metrics shown in the UI come from real DB data. After a content/activity reset (`admin_reset_content_zero`), all metrics return zero/empty. No synthetic percentages or hidden computed defaults when no rows exist.

---

## Loader-to-Widget Mapping

### Metrics Routes (dashboard, progress, weak-areas, strength-report, confidence)

| UI Widget | Loader / Service | DB Tables Used | Zero-State Behavior |
|-----------|------------------|----------------|---------------------|
| **Dashboard: Questions Today** | `loadDashboardStats` | `exam_sessions`, `exam_session_questions`, `user_question_attempts` | `0` |
| **Dashboard: Study Minutes** | `loadDashboardStats` | `user_streaks` (fallback: `exam_sessions`, `user_question_attempts`) | `0` |
| **Dashboard: Streak** | `loadDashboardStats` | `user_streaks` (fallback: `exam_sessions`, `user_question_attempts`) | `0 days` |
| **Dashboard: Readiness Score** | `loadReadinessScore` | `user_readiness_snapshots` (fallback: derived from mastery) | `No data yet` when `!hasActivity` |
| **Dashboard: Continue Learning** | `loadStudyWorkflowRecommendations` | `loadMasteryData`, `loadHighYieldTopics`, `loadStudyGuides`, `loadLastPrePracticeDate`, `loadRecommendedContent` | When `!hasActivity`: empty (shows "No recommendations yet"). When `hasActivity`: only weak areas, high-yield, pre-practice due, study guides, recommended content. |
| **Dashboard: Readiness Gauge** | `loadReadinessScore` + `ReadinessGauge` | Same as above | `No data yet` when `score === 0 && !hasActivity` |
| **Dashboard: Recommended for You** | `useRecommendations` → `generateRecommendations` | Via `loadMasteryData` (weak areas), `loadLastPrePracticeDate`, confidence | When `!hasActivity`: empty (widget hidden). No synthetic "Complete Study Guides" when `studyGuideProgress` is undefined. |
| **Dashboard: Weak Area Cards** | `loadMasteryData` → `getWeakRollups` | `user_system_mastery`, `user_domain_mastery`, etc. (or derived from `user_question_attempts`, `exam_session_questions`) | Empty when no mastery rows |
| **Dashboard: Performance Trend** | `loadPerformanceTrends` | `user_performance_trends` (fallback: `exam_sessions`, `exam_session_questions`, `user_question_attempts`) | Empty array or days with `questionsAnswered: 0`, `scorePct: 0` |
| **Dashboard: High-Yield Feed** | `loadHighYieldTopics` | `exam_tracks`, `systems`, `topic_system_links`, `topics`, `exam_blueprints` | Empty when no topics/links |
| **Dashboard: Weak Area Overlay** | `getWeakRollups(systemRollups)` | Via `loadMasteryData` | Hidden when `weakSystems.length === 0` |
| **Progress: Overall Readiness** | `loadReadinessScore` | Same as dashboard | `No data yet` when `!hasActivity` |
| **Progress: Questions Answered** | `countTotalQuestionsAnswered(mastery)` | Via `loadMasteryData` (systems) | `0` |
| **Progress: Study Streak** | `loadDashboardStats` | Same as dashboard | `0 days` |
| **Progress: Study Minutes Today** | `loadDashboardStats` | Same as dashboard | `0` |
| **Progress: Performance Trend** | `loadPerformanceTrends` | Same as dashboard | Empty message when no activity |
| **Progress: By System** | `loadMasteryData` | Same as dashboard | Empty list, "No activity yet" |
| **Weak Areas** | `loadMasteryData`, `loadReadinessScore`, `getWeakRollups` | Same as dashboard | "No activity yet" when `!hasActivity` |
| **Strength Report** | `loadMasteryData`, `getStrongRollups` | Same as dashboard | "No activity yet" when `!hasActivity` |
| **Confidence: Calibration Score** | `loadConfidenceData` → `buildConfidenceBuckets` → `computeCalibrationScore` | `user_question_attempts`, `exam_sessions`, `exam_session_questions` | `No data yet` when `buckets.length === 0` |
| **Confidence: By Range** | Same | Same | Empty state message when no confidence data |

### Content Routes (flashcards, questions, study-guides, videos, high-yield)

| Route | Loader | DB Tables Used | Zero-State Behavior |
|-------|--------|----------------|---------------------|
| **Flashcards** | `loadFlashcardDecks` | `flashcard_decks`, `flashcards` (via content loaders) | `EmptyContentState` when no decks |
| **Questions** | `loadQuestionCounts`, `loadSystemsForTrack`, etc. | `questions`, `systems`, `domains`, `topics` | `EmptyContentState` when `counts.total === 0` |
| **Study Guides** | `loadStudyGuides` | `study_guides`, `study_material_sections` | `EmptyContentState` when no guides |
| **Videos** | `loadVideos` | `videos` | `EmptyContentState` when no videos |
| **High-Yield** | `loadHighYieldFeed` | `loadHighYieldTopics`, `high_yield_content`, `topic_summaries`, `loadStudyGuides` | Empty topics/traps/confusions when none exist |

---

## Loader Verification

### loadDashboardStats

- **Zero-state**: Returns `{ questionsToday: 0, questionsYesterday: 0, studyMinutesToday: 0, streakDays: 0 }` when `!userId` or when no matching rows.
- **No synthetic defaults**: All values are counts from DB or derived from activity dates.
- **Tables**: `exam_sessions`, `exam_session_questions`, `user_question_attempts`, `user_streaks`.

### loadReadinessScore

- **Zero-state**: Returns `{ score: 0, fromSnapshot: false }` when no snapshot and (no mastery or empty mastery).
- **deriveReadinessFromMastery**: When mastery arrays are empty, `avg([]) = 0`, `questionAccuracy = 0`. No synthetic percentages.
- **Tables**: `user_readiness_snapshots` (primary), or derived from mastery.

### loadPerformanceTrends

- **Zero-state**: Returns `[]` when `!userId || !trackId`. When no trends, derives from activity; days with no activity get `questionsAnswered: 0`, `questionsCorrect: 0`, `scorePct: 0`.
- **No synthetic percentages**: `scorePct` is `0` when `answered === 0`.
- **Tables**: `user_performance_trends` (primary), or `exam_sessions`, `exam_session_questions`, `user_question_attempts`.

### loadMasteryData

- **Zero-state**: Returns `{ systems: [], domains: [], skills: [], itemTypes: [], ...slugMaps }` when `!userId || !trackId` or when materialized tables + activity are empty.
- **computeMasteryFromActivity**: Returns `null` when no question attempts; caller falls through to empty result.
- **Tables**: `user_system_mastery`, `user_domain_mastery`, `user_skill_mastery`, `user_item_type_performance` (or derived from `user_question_attempts`, `exam_session_questions`, `questions`).

### loadStudyWorkflowRecommendations

- **Zero-state**: When `!hasActivity`, returns `[]`. Dashboard shows "No recommendations yet." No synthetic onboarding cards.
- **When hasActivity**: Only weak areas, high-yield, pre-practice due, study guides, recommended content from queue. No fake percentages.
- **Tables**: Via `loadMasteryData`, `loadHighYieldTopics`, `loadStudyGuides`, `loadLastPrePracticeDate`, `loadRecommendedContent`.

---

## Tables Cleared by admin_reset_content_zero

All tables used by the above loaders are truncated:

- `exam_sessions`, `exam_session_questions`, `user_question_attempts`
- `user_system_mastery`, `user_domain_mastery`, `user_skill_mastery`, `user_item_type_performance`
- `user_readiness_snapshots`, `user_performance_trends`
- `user_streaks`
- `recommended_content_queue`
- Plus content tables (questions, study_guides, etc.)

---

## Zero-State Routes Tested

After running `admin_reset_content_zero(true)`:

| Route | Expected |
|-------|----------|
| `/dashboard` | Questions: 0, Study minutes: 0, Streak: 0 days, Readiness: "No data yet", Continue Learning: "No recommendations yet", Readiness Gauge: "No data yet", Recommended for You: hidden, Performance: "No activity yet", Weak overlay: hidden, High-yield: empty or "will appear as content is added" |
| `/progress` | Readiness: "No data yet", Questions: 0, Streak: 0 days, Study minutes: 0, Performance: "No activity in the last 14 days", By System: "No activity yet" |
| `/weak-areas` | "No activity yet. Answer questions to see your weak areas." |
| `/strength-report` | "No activity yet. Answer questions to see your strengths." |
| `/confidence-calibration` | Calibration: "No data yet", By Range: empty state message |
| `/flashcards` | EmptyContentState when no decks |
| `/questions` | EmptyContentState when no questions |
| `/study-guides` | EmptyContentState when no guides |
| `/videos` | EmptyContentState when no videos |
| `/high-yield` | Empty topics/traps/confusions when none exist |

---

## Root Causes Addressed (Phase 2B Continuation)

1. **ReadinessGauge showed "0%" when no activity** — Added `hasActivity` prop; when `score === 0 && !hasActivity` now shows "No data yet".
2. **Continue Learning returned 3 synthetic cards when !hasActivity** — `computeStudyWorkflowRecommendations` now returns `[]` when `!hasActivity`.
3. **Recommended for You showed Pre-Practice + Complete Study Guides with no data** — `useRecommendations` returns `[]` when `hasActivity === false`; `generateRecommendations` only adds "Complete Study Guides" when `studyGuideProgress != null && studyGuideProgress < 50`.

---

## Files Changed (Phase 2B)

| File | Change |
|------|--------|
| `src/app/api/admin/reset-content/route.ts` | Added `revalidatePath` for `/progress`, `/weak-areas`, `/strength-report` |
| `src/components/dashboard/ReadinessGauge.tsx` | Added `hasActivity` prop; show "No data yet" when `score === 0 && !hasActivity` |
| `src/components/dashboard/DashboardReadinessClient.tsx` | Pass `hasActivity` to ReadinessGauge and useRecommendations; pass `undefined` for studyGuideProgress/videoProgress |
| `src/lib/readiness/study-workflow.ts` | Return `[]` when `!hasActivity` (no synthetic onboarding cards) |
| `src/hooks/useRecommendations.ts` | Return `[]` when `inputs.hasActivity === false`; `studyGuideProgress`/`videoProgress` optional |
| `src/lib/readiness/recommendation-engine.ts` | Only add "Complete Study Guides" when `studyGuideProgress != null && studyGuideProgress < 50` |
| `docs/LEARNER_METRICS_TRUTH_AUDIT.md` | Full widget-to-loader-to-table mapping; root causes; content routes |
