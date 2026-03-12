# Phase 3: Study Plan Persistence & Track Resolution Cleanup

**Date:** 2025-03-11

## Summary

Unified track resolution and study plan persistence so learner track, exam date, study minutes, and study mode persist correctly and drive all learner pages consistently.

## Canonical Track Resolver

**Source:** `src/lib/auth/track.ts`

**Resolution order:**
1. `profile.primary_exam_track_id` (profiles table)
2. `null` when not set (no fallback to other tracks)

**Functions:**
- `getPrimaryTrack(userId)` – returns `{ trackId, trackSlug }` or `null`
- `getLearnerTrackContext(userId)` – alias for `getPrimaryTrack`
- `requirePrimaryTrack(userId)` – returns track or safe default for redirect recovery only
- `clearOrphanedPrimaryTrack(userId)` – clears invalid FK when track was deleted

All learner pages use `getPrimaryTrack()` or `getLearnerTrackContext()`. No duplicate track state in query params, local state, or context unless explicitly synchronized.

## Study Plan Persistence

**API:** `PATCH /api/profile`

Updates: `exam_track_id`, `target_exam_date`, `study_minutes_per_day`, `preferred_study_mode`.

**Profile service:** `updateStudyPreferences()` in `src/lib/auth/profile.ts`

**Forms:**
- **Study Plan page** – `StudyPlanForm` – edit and save study plan
- **Profile page** – `StudyPreferencesForm` – edit and save study preferences
- **Onboarding** – `OnboardingForm` – pre-populates when user has existing data

## Old Bug Causes

1. **"Select a track" when one already chosen** – Onboarding form did not pre-populate from profile. Users with partial data (e.g. revisiting after session clear) saw empty dropdown. Fixed by passing `initialTrackId`, `initialTargetDate`, etc. from onboarding page.

2. **Track mismatch across pages** – Some code used `api/me` which returned `track: "rn"` as fallback when no track. Client components could treat "rn" as user's actual track. Fixed by returning `track: null` when no track; consumers use `track ?? "rn"` only for display/styling fallback.

3. **No study plan persistence** – Study plan page was read-only; profile had no edit form for study preferences. Fixed by adding `StudyPlanForm`, `StudyPreferencesForm`, and `PATCH /api/profile`.

4. **Duplicate track sources** – Track could come from profile, query string, or local state without sync. Canonical resolver is now `getPrimaryTrack()` only; all pages use it.

## Files Changed

| File | Change |
|------|--------|
| `src/lib/auth/track.ts` | Documented canonical resolution order |
| `src/lib/auth/profile.ts` | Added `updateStudyPreferences()` |
| `src/app/api/profile/route.ts` | New – PATCH for study preferences |
| `src/app/api/me/route.ts` | Return `track: null` when no track |
| `src/hooks/useTrack.ts` | Return `null` when no track |
| `src/app/(app)/study-plan/page.tsx` | Added `StudyPlanForm` |
| `src/components/study/StudyPlanForm.tsx` | New – edit study plan, persists to profile |
| `src/app/(app)/profile/page.tsx` | Added `StudyPreferencesForm` |
| `src/components/profile/StudyPreferencesForm.tsx` | New – edit study prefs, persists |
| `src/app/onboarding/page.tsx` | Pass initial values from profile to form |
| `src/app/onboarding/OnboardingForm.tsx` | Pre-populate track, date, minutes, mode |

## Learner Pages Using Canonical Track

All learner pages call `getPrimaryTrack(user?.id ?? null)` and use `primary?.trackId`, `primary?.trackSlug`:

- Dashboard, Progress, Study Plan, Profile
- Questions, Practice, Pre-Practice, Exam
- Study Guides, Videos, Flashcards
- Weak Areas, Strength Report, Confidence
- High Yield, AI Tutor, Adaptive Exam
