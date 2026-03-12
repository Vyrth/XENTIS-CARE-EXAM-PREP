# Phase 9: Learner Dashboard and App Stabilization

## Overview

Final QA sweep to fix broken states without changing core architecture. Ensures all learner routes load correctly, show proper empty states, and avoid redirect loops, hydration issues, and role leakage.

---

## Issues Fixed

### 1. Layout: Orphaned Track Handling

**Problem:** When `profile.primary_exam_track_id` pointed to a non-existent `exam_track` (e.g. after migration or reset), `getPrimaryTrack` returned null. Only the dashboard redirected; other pages (questions, flashcards, etc.) rendered with `trackId: null`, causing empty or inconsistent behavior.

**Fix:** App layout now verifies the track exists via `getPrimaryTrack`. If null, clears orphaned FK and redirects to onboarding. All learner pages now receive a valid track or never render.

**File:** `src/app/(app)/layout.tsx`

### 2. Dashboard: Continue Learning Empty State

**Problem:** When `continueLearningCards` was empty, the message said "Complete onboarding to set your exam track" and linked to onboarding—even when the user had already completed onboarding and had a valid track.

**Fix:** Updated empty state to "No recommendations yet. Explore practice questions and study guides to get started" with link to `/questions`.

**File:** `src/app/(app)/dashboard/page.tsx`

---

## Routes Audited (No Changes Needed)

| Route | Status | Notes |
|-------|--------|-------|
| `/questions` | OK | Uses `loadQuestionCounts`, `EmptyContentState` when no questions |
| `/flashcards` | OK | Uses `loadFlashcardDecks`, `EmptyContentState` when no decks |
| `/videos` | OK | Uses `loadVideos`, `EmptyContentState` when no videos |
| `/study-guides` | OK | Uses `loadStudyGuides`, `EmptyContentState` when no guides |
| `/ai-tutor` (Jade Tutor) | OK | Uses `loadMasteryData`, `loadStudyWorkflowRecommendations`; passes to `AITutorPageClient` |
| `/progress` | OK | Uses `loadMasteryData`, `loadDashboardStats`, `loadPerformanceTrends`; real activity only |
| `/weak-areas` | OK | Uses `loadMasteryData`, `loadReadinessScore`; real performance only |
| `/strength-report` | OK | Uses `loadMasteryData`; real performance only |
| `/adaptive-exam` | OK | Loads config from `adaptive_exam_configs`; redirects to onboarding if no track |
| `/pre-practice` | OK | Redirects to `/pre-practice/[track]`; `guardTrackParam` enforces track |
| `/pre-practice/[track]` | OK | Uses `loadPrePracticeTemplate`, `loadQuestionCounts`; empty states for no template or &lt;150 questions |

---

## Manual QA Route List

Run in order. Ensure no console warnings, redirect loops, or hydration errors.

### Prerequisites

- Logged-in learner with completed onboarding and valid track
- Optionally: fresh DB (Phase 8 reset) for empty-state testing

### Core Routes

1. **`/dashboard`**
   - [ ] Loads once, no redirect loop
   - [ ] Stats show 0 or real values (no fake data)
   - [ ] Continue Learning: cards or empty state (not "Complete onboarding" when track is set)
   - [ ] Readiness: "No data yet" or real %
   - [ ] High-yield: empty state or real topics

2. **`/questions`**
   - [ ] Loads with empty state or published questions by system/domain/topic
   - [ ] No 404 or broken filters

3. **`/flashcards`**
   - [ ] Loads with empty state or published decks
   - [ ] Deck links work when decks exist

4. **`/videos`**
   - [ ] Loads with empty state or published videos
   - [ ] Video links work when videos exist

5. **`/study-guides`**
   - [ ] Loads with empty state or published guides
   - [ ] Guide links work when guides exist

### Jade Tutor

6. **`/ai-tutor`**
   - [ ] Loads; chat UI visible
   - [ ] Suggested next steps appear when no messages
   - [ ] Sending a message returns structured answer (no errors)
   - [ ] No role leakage (learner-only content)

### Progress & Analytics

7. **`/progress`**
   - [ ] Uses real activity only (0 or real counts)
   - [ ] Performance trend chart: empty or real data
   - [ ] By System: empty or real bars

8. **`/weak-areas`**
   - [ ] "No activity yet" or real weak areas
   - [ ] No fake weak areas when no activity

9. **`/strength-report`**
   - [ ] "No activity yet" or real strong areas
   - [ ] No fake strengths when no activity

### Exams

10. **`/adaptive-exam`**
    - [ ] Loads; shows config or "No adaptive exam config" empty state
    - [ ] Start exam creates valid session
    - [ ] No infinite loops

11. **`/pre-practice`**
    - [ ] Redirects to `/pre-practice/[track]` (e.g. `/pre-practice/rn`)

12. **`/pre-practice/[track]`**
    - [ ] Loads; shows lobby, "No Pre-Practice exam" or "Not enough questions" as appropriate
    - [ ] Start Tutorial works when exam is available

### Edge Cases

13. **Orphaned track**
    - [ ] With `primary_exam_track_id` pointing to deleted track: redirect to onboarding, no loop
    - [ ] After clearing: onboarding shows, user can re-select track

14. **Console**
    - [ ] No repeated redirect warnings
    - [ ] No hydration mismatch
    - [ ] No "node cannot be found" errors

15. **Role**
    - [ ] Admin link only visible to admins
    - [ ] Learner pages show no admin-only content

---

## Remaining Blockers

None identified. If issues appear:

- **Redirect loop:** Check layout guard order and `AUTH_ROUTES.ONBOARDING` path
- **Empty state wrong:** Verify `LEARNER_VISIBLE_STATUSES` in loaders
- **Jade Tutor errors:** Check `/api/ai` and `OPENAI_API_KEY`
- **Adaptive exam 404:** Ensure `adaptive_exam_configs` seeded for track

---

## Changed Files

| File | Change |
|------|--------|
| `src/app/(app)/layout.tsx` | Added orphaned track check; clear and redirect when track missing |
| `src/app/(app)/dashboard/page.tsx` | Fixed Continue Learning empty state message and link |
