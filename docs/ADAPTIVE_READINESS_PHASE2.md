# Phase 2 — Adaptive Readiness, Weak Areas, and Recommendations

**Date:** March 2025  
**Goal:** Use real learner performance from completed exam sessions to drive readiness, weak areas, strengths, and study recommendations.

---

## 1. Root Causes Found & Fixes

### 1.1 Readiness Used Only Partial Data (FIXED)

- **Root cause:** `deriveReadinessFromMastery` set `prePracticeExamPerformance`, `systemExamPerformance`, `studyGuideCompletion`, `videoCompletion`, `confidenceCalibration`, `consistencyOverTime` to 0 regardless of actual data.
- **Fix:** Added loaders for each component; pass real values when available. Zero when insufficient data.

### 1.2 Pre-Practice and System Exam Scores Not in Readiness (FIXED)

- **Root cause:** No loader for last pre-practice or system exam scores.
- **Fix:** `loadPrePracticeExamScore` reads `scratchpad_data.results.percentCorrect` from last completed pre_practice session. `loadSystemExamPerformance` averages last 3 system_exam sessions.

### 1.3 Study Guide and Video Completion Not in Readiness (FIXED)

- **Root cause:** Not loaded for readiness computation.
- **Fix:** `loadStudyGuideCompletionPercent` from `study_material_progress`; `loadVideoCompletionPercent` from `video_progress`.

### 1.4 Confidence Calibration Not in Readiness (FIXED)

- **Root cause:** Confidence calibration score not included in readiness inputs.
- **Fix:** Load `loadConfidenceData`, build buckets, compute calibration score; pass to readiness when available.

### 1.5 Consistency Over Time Not in Readiness (FIXED)

- **Root cause:** Not derived from performance trends.
- **Fix:** `consistencyOverTime` = (days with activity / 14) * 100 from `loadPerformanceTrends`.

### 1.6 Study Workflow Missing studyGuideCompletion (FIXED)

- **Root cause:** `loadStudyWorkflowRecommendations` passed `studyGuideCompletion: undefined`.
- **Fix:** Load `loadStudyGuideCompletionPercent` and pass to `computeStudyWorkflowRecommendations`.

### 1.7 Jade Tutor Missing Confidence Context (FIXED)

- **Root cause:** `loadAnalyticsForJade` did not include confidence calibration or overconfident ranges.
- **Fix:** Load confidence data; compute calibration score and overconfident ranges; add to AnalyticsPayload.

---

## 2. Files Changed

| File | Change |
|------|--------|
| `src/lib/dashboard/loaders.ts` | Added `loadPrePracticeExamScore`, `loadSystemExamPerformance`, `loadStudyGuideCompletionPercent`, `loadVideoCompletionPercent`; enhanced `deriveReadinessFromMastery` with optional extras; `loadReadinessScore` loads and passes real data; `loadStudyWorkflowRecommendations` passes `studyGuideCompletion` |
| `src/lib/ai/jade-analytics.ts` | Added `confidenceCalibration` and `overconfidentRanges` to analytics payload |

---

## 3. Formulas / Data Sources

### Readiness Score (0–100)

| Component | Weight | Source |
|-----------|--------|--------|
| questionAccuracy | 0.25 | Mastery: total correct / total from systems + domains |
| domainPerformance | 0.20 | Avg % correct per domain |
| systemPerformance | 0.20 | Avg % correct per system |
| skillPerformance | 0.10 | Avg % correct per skill |
| systemExamPerformance | 0.10 | Avg % from last 3 completed system_exam sessions (scratchpad_data.results.percentCorrect) |
| prePracticeExamPerformance | 0.05 | Last completed pre_practice session percentCorrect |
| studyGuideCompletion | 0.04 | study_material_progress.completed / study_material_sections for track |
| videoCompletion | 0.03 | video_progress.completed / video_lessons for track |
| confidenceCalibration | 0.02 | Weighted % of confidence buckets within ±15% of expected |
| consistencyOverTime | 0.01 | (days with questions in last 14) / 14 * 100 |

### Weak Areas

- **Source:** `loadMasteryData` → materialized tables or `computeMasteryFromActivity` (exam_session_questions + user_question_attempts)
- **Threshold:** `MIN_QUESTIONS_FOR_MASTERY` (5); below `MASTERY_TARGET_PERCENT` (80%)
- **Rollups:** system, domain, skill, item_type

### Strengths

- Same source; `atTarget` = total >= 5 and percent >= 80%

### Recommendations

- **Source:** `computeStudyWorkflowRecommendations` from weak rollups, high-yield, pre-practice due, study guides, recommended_content_queue
- **Thresholds:** `RECOMMENDATION_THRESHOLDS.weakSystemPercent` (65), weakDomainPercent (65), weakItemTypePercent (60)
- **Empty state:** No synthetic cards when `!hasActivity`

### Confidence Calibration

- **Source:** `loadConfidenceData` from exam_session_questions + user_question_attempts where response_data has confidence/confidenceRange
- **Calibrated:** actual % within ±15% of expected midpoint for range

### Jade Tutor Context

- **Source:** `loadAnalyticsForJade` → loadMasteryData, loadRecentMistakes, loadStudyGuideCompletion, loadFlashcardPerformance, loadConfidenceData
- **Payload:** readinessScore, readinessBand, weakSystems/Domains/Skills/ItemTypes, recentMistakes, studyGuideCompletion, confidenceCalibration, overconfidentRanges

---

## 4. Routes Verified

| Route | Data Source | Empty State |
|-------|-------------|-------------|
| `/dashboard` | loadMasteryData, loadReadinessScore, loadStudyWorkflowRecommendations, loadPerformanceTrends | "No data yet", "No recommendations yet" |
| `/progress` | loadMasteryData, loadReadinessScore, loadPerformanceTrends | "No data yet", "No activity yet" |
| `/weak-areas` | loadMasteryData, getWeakRollups | "No activity yet. Answer questions to see your weak areas." |
| `/strength-report` | loadMasteryData, getStrongRollups | "No activity yet", "No areas at target yet" |
| `/confidence-calibration` | loadConfidenceData, buildConfidenceBuckets | "No confidence data yet" |
| `/ai-tutor` | loadMasteryData, loadStudyWorkflowRecommendations | Weak areas from real mastery |

---

## 5. Empty-State Behavior Verified

| Scenario | Behavior |
|----------|----------|
| No activity | Readiness: "No data yet"; Recommendations: "No recommendations yet"; Weak areas: "No activity yet" |
| No mastery rows | `computeMasteryFromActivity` from exam_session_questions + user_question_attempts |
| No pre-practice completed | prePracticeExamPerformance = 0 |
| No system exams completed | systemExamPerformance = 0 |
| No study guides | studyGuideCompletion = undefined → 0 |
| No confidence in response_data | confidenceCalibration = undefined → 0 |
| No trends | consistencyOverTime = undefined → 0 |

---

## 6. Remaining Blockers / Notes

1. **Confidence in question flow:** Confidence calibration requires `response_data.confidence` or `confidenceRange` in exam_session_questions / user_question_attempts. If the question UI does not capture confidence, buckets will be empty.

2. **Materialized mastery tables:** `user_system_mastery`, `user_domain_mastery`, etc. may be empty; `computeMasteryFromActivity` provides real-time derivation. A cron/trigger to refresh materialized tables would improve performance.

3. **Main AI orchestrator:** The main `/api/ai` route passes analytics to `runAIAction`, but the orchestrator does not inject `buildAdaptiveContext` into prompts. Individual routes (explain-highlight, mnemonic, generate-flashcards, notebook-summary, weak-area-coach) do use adaptive context.

4. **recommended_content_queue:** Recommendations from this table require rows to be populated (e.g. by a recommendation job). Empty when no queue entries.
