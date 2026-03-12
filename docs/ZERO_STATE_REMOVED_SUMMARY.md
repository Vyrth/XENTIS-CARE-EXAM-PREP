# Phase 2: Zero-State Truthfulness – Removed Hardcoded Values

**Date:** 2025-03-11  
**Goal:** Every learner-facing metric must be DB-driven and show zero/empty states when there is no real data.

## Summary of Removed Hardcoded Values

| Location | Removed Value | Replacement |
|----------|---------------|-------------|
| `src/lib/dashboard/loaders.ts` | `studyMinutesGoal \|\| 60` | `studyMinutesGoal` (no fallback) |
| `src/lib/dashboard/loaders.ts` | `deriveReadinessFromMastery`: domainPerformance 70, systemPerformance 70, skillPerformance 65, systemExamPerformance 70, prePracticeExamPerformance 70, confidenceCalibration 70, consistencyOverTime 80 | All 0 when no data |
| `src/lib/readiness/confidence-calibration.ts` | `computeCalibrationScore`: return 100 when empty | Return 0 when no data |
| `src/app/(app)/dashboard/page.tsx` | `studyMinutesGoal = profile?.study_minutes_per_day ?? 60` | `studyMinutesGoal = profile?.study_minutes_per_day ?? 0` |
| `src/app/(app)/dashboard/page.tsx` | Readiness StatBlock: always show `X%` | Show "No data yet" when `!hasActivity && readinessScore === 0` |
| `src/app/(app)/dashboard/page.tsx` | Study Minutes subtext: always "of X goal" | "Set a goal in profile" when studyMinutesGoal === 0 |
| `src/app/(app)/progress/page.tsx` | `studyMinutesGoal = profile?.study_minutes_per_day ?? 60` | `studyMinutesGoal = profile?.study_minutes_per_day ?? 0` |
| `src/app/(app)/progress/page.tsx` | Study Minutes subtext: always "of X goal" | "Set a goal in profile" when studyMinutesGoal === 0 |
| `src/app/(app)/study-plan/page.tsx` | `studyMinutes = profile?.study_minutes_per_day ?? 60` | `studyMinutes = profile?.study_minutes_per_day ?? 0` |
| `src/app/(app)/confidence-calibration/page.tsx` | `computeCalibrationScore` return 100 when no buckets | Badge shows "No data yet" when buckets.length === 0 |

## New Files

- **`src/lib/learner/metrics.ts`** – Central learner metrics service  
  - `loadLearnerMetrics()` – single source of truth for learner metrics  
  - Zero-state: readiness=0, streak=0, studyMinutesToday=0, etc. when no data.
- **`src/lib/learner/index.ts`** – Module exports

## Zero-State Behavior

| Metric | Zero State |
|--------|------------|
| Readiness | 0 or "No data yet" |
| Questions answered | 0 |
| Study streak | 0 days |
| Study minutes today | 0 |
| Study minutes goal | 0 (no goal set) → "Set a goal in profile" |
| Confidence calibration | 0 or "No data yet" |
| Weak areas | Empty guidance state |
| Strength report | Empty guidance state |
| Recommendations | Generic onboarding only |

## Pages/Components Verified

- **Dashboard** – Uses zero-state from loaders; no fake readiness.
- **Progress** – Uses zero-state; no 60 fallback.
- **Weak-areas** – Already had proper empty state.
- **Strength-report** – Already had proper empty state.
- **Confidence** – Badge shows "No data yet" when no buckets.
- **Continue Learning** – `loadStudyWorkflowRecommendations` returns onboarding-style cards when `!hasActivity`.
- **PerformanceTrendCard** – Empty state when no data.
- **DashboardReadinessClient** – Empty state when `!hasActivity`.

## Unchanged (Intentional)

- **Onboarding form** – Default 60 in form for study_minutes_per_day is a suggested value for new users; not a display of fake data.
- **time_spent_seconds ?? 90** – Fallback for missing question duration; used for derived study minutes, not for display.
