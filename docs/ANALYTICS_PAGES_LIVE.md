# Analytics Sub-Pages – Live Implementation

This document describes the live analytics pages: Progress, Weak Areas, Strength Report, and Confidence Calibration. All data is track-scoped and user-specific. **No mock data.**

## Overview

| Page | Data Source | Key Metrics |
|------|-------------|-------------|
| **Progress** | `loadMasteryData`, `loadReadinessScore`, `loadDashboardStats`, `loadPerformanceTrends` | Readiness, questions answered, streak, study minutes, 14-day trends, by-system |
| **Weak Areas** | `loadMasteryData` + rollups | Weak systems, domains, skills, item types; remediation plan |
| **Strength Report** | `loadMasteryData` + rollups | Strong systems, domains, skills, item types |
| **Confidence Calibration** | `loadConfidenceData` | Buckets by confidence range; overconfident/underconfident ranges |

---

## Progress Page

**Path**: `/progress`

- **Stat blocks**: Overall Readiness, Questions Answered, Study Streak, Study Minutes Today
- **Performance trends**: 14-day bar chart (questions answered, score %)
- **By System**: Progress bars per system
- **Empty states**: "No activity yet" when totalQuestions = 0; "No activity in the last 14 days" for trends

**Data**:
- `loadMasteryData` + `loadReadinessScore` (from dashboard loaders)
- `loadDashboardStats` (questions, streak, study minutes)
- `loadPerformanceTrends` (14 days)
- `countTotalQuestionsAnswered` (sum of system totals)

---

## Weak Areas Page

**Path**: `/weak-areas`

- **Weak areas**: Systems, domains, skills, item types below target (80%)

- **Remediation plan**: Suggested actions, estimated questions to close gap

- **Empty states**:
  - No activity: "No activity yet. Answer questions to see your weak areas."
  - All at target: "All areas at or above target!"

**Data**:
- `loadMasteryData` → `rollupBySystem`, `rollupByDomain`, `rollupBySkill`, `rollupByItemType`
- `getWeakRollups` (MIN_QUESTIONS_FOR_MASTERY = 5, target 80%)
- `generateRemediationPlan`

**Practice links**:
- System → `/questions/system/{slug}`
- Domain → `/questions?domain={slug}`
- Item type → `/questions?type={id}`

---

## Strength Report Page

**Path**: `/strength-report`

- **Strong areas**: Systems, domains, skills, item types at or above target

- **Empty states**:
  - No activity: "No activity yet. Answer questions to see your strengths."
  - None at target: "No areas at target yet. Focus on weak areas."

**Data**:
- Same mastery + rollups as Weak Areas
- `getStrongRollups` instead of `getWeakRollups`

---

## Confidence Calibration Page

**Path**: `/confidence-calibration`

- **Overall calibration score**: % of buckets calibrated (weighted by volume)
- **By confidence range**: 0–25%, 26–50%, 51–75%, 76–100%
- **Overconfident ranges**: High confidence, lower accuracy
- **Underconfident ranges**: Low confidence, higher accuracy

**Data**:
- `loadConfidenceData` from `src/lib/analytics/loaders.ts`
- Reads `user_question_attempts.response_data` and `exam_session_questions.response_data` for `confidence` or `confidenceRange`
- Buckets: 0–25, 26–50, 51–75, 76–100%
- Track-scoped: only questions in user's primary track

**Empty state**: "No confidence data yet. Answer questions with confidence ratings to see your calibration."

**Missing input**: Confidence is not yet captured in the question flow. When `response_data` includes `confidence` (number) or `confidenceRange` (string), the page will populate. Until then, the page shows the empty state.

---

## File Reference

| File | Purpose |
|------|---------|
| `src/lib/analytics/loaders.ts` | `loadConfidenceData`, `countTotalQuestionsAnswered` |
| `src/lib/dashboard/loaders.ts` | `loadMasteryData`, `loadReadinessScore`, `loadDashboardStats`, `loadPerformanceTrends` |
| `src/app/(app)/progress/page.tsx` | Progress page |
| `src/app/(app)/weak-areas/page.tsx` | Weak Areas page |
| `src/app/(app)/strength-report/page.tsx` | Strength Report page |
| `src/app/(app)/confidence-calibration/page.tsx` | Confidence Calibration page |
| `src/lib/readiness/mastery-rollups.ts` | `rollupBySystem`, `rollupByDomain`, `rollupBySkill`, `rollupByItemType`, `getWeakRollups`, `getStrongRollups` |
| `src/lib/readiness/remediation-plan.ts` | `generateRemediationPlan` |
| `src/lib/readiness/confidence-calibration.ts` | `buildConfidenceBuckets`, `computeCalibrationScore` |

---

## Sparse / Missing Analytics Inputs

| Input | Status | Notes |
|-------|--------|-------|
| **Confidence** | Not captured | Question flow does not yet prompt for confidence. `response_data` can store `confidence` or `confidenceRange` when implemented. |
| **Topic-level mastery** | Partial | `user_topic_mastery` exists but `loadMasteryData` does not load it. Weak/strong topics would need topic rollups. |
| **Improvement metrics** | Not implemented | Strength Report could show "improved from X% over last 7 days" with historical snapshots. |
| **Calibration trend** | Not implemented | Would need `user_confidence_snapshots` or similar time-series. |
