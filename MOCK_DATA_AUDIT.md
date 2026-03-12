# Mock Data Audit – Signed-In User Experience

## Summary

Audit and removal of mock/demo data from user-facing pages. Mock data is retained only in admin tools and explicit demos.

---

## 1. Remaining Mock Sources Found (Before Fixes)

| Page | Mock Source | Status |
|------|-------------|--------|
| **Study Plan** | `MOCK_SYSTEMS`, hardcoded `weeklyPlan` | ✅ Fixed |
| **Topics (Topic Hub)** | `MOCK_SYSTEMS`, `MOCK_TOPICS` | ✅ Fixed |
| **Questions** | `MOCK_TOPIC_BLUEPRINT`, `MOCK_BLUEPRINT_BY_TRACK`, `MOCK_TELEMETRY`, `MOCK_STUDENT_SIGNAL` | ✅ Fixed |
| **Weak Areas** | `MOCK_RAW_SYSTEM_PERFORMANCE`, `MOCK_RAW_DOMAIN_PERFORMANCE`, `MOCK_SYSTEMS`, `MOCK_DOMAINS` | ✅ Fixed |
| **Progress** | `MOCK_SYSTEMS`, `MOCK_RAW_SYSTEM_PERFORMANCE` | ✅ Fixed |
| **Strength Report** | `MOCK_RAW_SYSTEM_PERFORMANCE`, `MOCK_RAW_DOMAIN_PERFORMANCE`, `MOCK_SYSTEMS`, `MOCK_DOMAINS` | ✅ Fixed |
| **AI Tutor** | `MOCK_RAW_SYSTEM_PERFORMANCE`, `MOCK_RAW_DOMAIN_PERFORMANCE`, `MOCK_SYSTEMS`, `MOCK_DOMAINS` | ✅ Fixed |
| **Results Breakdown** | `MOCK_PERFORMANCE_BY_SYSTEM`, `MOCK_PERFORMANCE_BY_DOMAIN` | ✅ Fixed |
| **Exam Results** | `MOCK_PERFORMANCE_BY_SYSTEM` | ✅ Fixed |
| **ExamResultSummary** | `MOCK_SYSTEMS` | ✅ Fixed |
| **Notebook** | `MOCK_NOTES` | ✅ Fixed |
| **Confidence Calibration** | `MOCK_CONFIDENCE_DATA` | ✅ Fixed |
| **Study Guide Reader** | `MOCK_HY_SCORES` | ✅ Fixed |
| **LabReferenceDrawer** | `MOCK_LAB_REFERENCES`, `LAB_SETS` | ✅ Fixed |
| **question-bank.ts** | `MOCK_SYSTEMS`, `MOCK_QUESTIONS` fallback | ✅ Fixed |
| **Exam Review** | `MOCK_QUESTIONS` | ✅ Fixed |

---

## 2. Fixes Applied

### Dashboard
- Already live – uses `loadDashboardStats`, `loadMasteryData`, `loadHighYieldTopics`, `loadContinueLearningCards`.

### Study Plan
- Replaced `MOCK_SYSTEMS` with `loadSystemsForTrack(trackId)`.
- Replaced hardcoded `weeklyPlan` with `loadDashboardStats` and placeholder for weekly activity.
- Empty state: "No content available yet for your track" when no systems.

### Topics (Topic Hub)
- Replaced `MOCK_SYSTEMS` and `MOCK_TOPICS` with `loadSystemsForTrack` and `loadTopicsForTrack`.
- Empty state when no systems.

### Questions
- Replaced mock high-yield inputs with `loadHighYieldTopics(trackId, track)` from dashboard loaders.
- Uses DB blueprint and empty telemetry/student signal.

### Weak Areas
- Replaced mock performance with `loadMasteryData(userId, trackId)`.
- Uses `systemSlugMap` and `domainSlugMap` for slugs.

### Progress
- Replaced mock with `loadMasteryData`, `loadReadinessScore`, `loadDashboardStats`.
- Stats: readiness, total questions, streak from DB.

### Strength Report
- Replaced mock with `loadMasteryData`.

### AI Tutor
- Replaced mock with `loadMasteryData` for weak areas.

### Results Breakdown
- Added `loadBreakdownForExam(clientExamId, userId)` in exam actions.
- Loads session, recomputes score, fetches system/domain names from DB.
- Empty state when no completed exam.

### Exam Results (exam/[examId]/results)
- Converted to server component; uses `loadBreakdownForExam`.
- Empty state when no results.

### ExamResultSummary
- Added `systemNames` prop from `submitExamAndScore`.
- Removed `MOCK_SYSTEMS`; uses `loadSystemNamesByIds`.

### Notebook
- Removed `MOCK_NOTES`; uses only `hookNotes` from `useNotebook`.

### Confidence Calibration
- Removed `MOCK_CONFIDENCE_DATA`; uses empty array until confidence data exists.
- Empty state: "No content available yet for your track. Answer questions with confidence ratings to see your calibration."

### Study Guide Reader
- Removed `MOCK_HY_SCORES`; parent loads `loadHighYieldTopics` and passes `hyScoreByTopic`.

### LabReferenceDrawer
- Added `/api/lab-refs` to load from `lab_reference_sets` and `lab_reference_values`.
- Empty state when no lab sets.

### question-bank.ts
- Removed mock fallback; returns `[]` when API returns empty.
- `getQuestionById` returns `undefined`; `fetchQuestionById` returns `undefined` when not found.
- Exam page shows "No content available yet for your track" when `questionIds.length === 0`.

### Exam Review (exam/[examId]/review)
- Loads `questionIds` from `loadSessionFromStorage(examId)`.
- Empty state when no session.

---

## 3. Pages Fully Live vs Awaiting Content

### Fully Live (DB-backed)
- **Dashboard** – stats, mastery, high-yield, continue learning
- **Study Plan** – systems from DB; weekly activity placeholder
- **Topics** – systems and topics from DB
- **Questions** – counts, systems, domains, topics, high-yield from DB
- **Weak Areas** – mastery from `user_system_mastery`, `user_domain_mastery`
- **Progress** – mastery, readiness, stats from DB
- **Strength Report** – mastery from DB
- **AI Tutor** – weak areas from mastery
- **Results Breakdown** – from completed exam session
- **Exam Results** – from completed exam session
- **ExamResultSummary** – system names from DB
- **Notebook** – only real notes (no mock)
- **Lab Reference Drawer** – from `lab_reference_sets`, `lab_reference_values`
- **Study Guide Reader** – high-yield from DB

### Awaiting Content Population
- **Confidence Calibration** – no `user_confidence` or equivalent yet; shows empty state
- **Exam** – shows "No content available yet for your track" when question API returns empty
- **Exam Review** – shows empty state when no session in storage

---

## 4. Mock Data Retained (By Design)

- **Admin pages** – curriculum, questions, study-guides, videos, flashcards, review-queue, ai-prompts, recommendations, mastery-rules, issue-reports, media-rights
- **readiness-demo** – explicit demo page
- **Tests** – `__tests__` use mock data

---

## 5. Track Isolation (FNP vs RN)

- All loaders use `trackId` from `getPrimaryTrack`.
- `loadSystemsForTrack`, `loadTopicsForTrack`, `loadQuestionCounts`, `loadMasteryData`, etc. filter by `exam_track_id`.
- No FNP user sees RN seed content; content is track-scoped.
