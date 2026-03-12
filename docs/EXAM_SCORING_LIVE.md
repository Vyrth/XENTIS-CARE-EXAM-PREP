# Exam Scoring – Live Implementation

This document describes the live scoring pipeline, result persistence, and review flow for Xentis Care Exam Prep.

## Overview

- **No mock/demo calculations** – All scores are computed from persisted session data.
- **Data sources**: `exam_session_questions`, `user_question_attempts` (for standalone attempts), question answer keys from `question_options`.
- **Persistence**: Final results are stored in `exam_sessions.scratchpad_data.results` and `exam_session_questions` (per-question correctness, flags, responses).

---

## Scoring Pipeline

### Entry Points

1. **`submitExamAndScore(session)`** – Called when the user completes an exam. Computes score, persists to DB, returns `ExamScoreResult`.
2. **`loadBreakdownForExam(clientExamId, userId)`** – Loads a completed session and recomputes breakdown for results/breakdown pages.

### Flow

```
ExamSession (responses, flags, questionIds)
    ↓
loadQuestionMetadataForScoring(trackId, questionIds)
    → correctAnswer, systemId, domainId, type per question
    ↓
computeScore(session, getCorrect, getSystem, getDomain, getType)
    → ExamScoreResult
    ↓
saveExamSession(session, scoresMap)  [when completed]
    → exam_sessions (status=completed, scratchpad_data.results)
    → exam_session_questions (is_correct, is_flagged, response_data)
```

---

## Supported Item-Type Scoring

| Item Type | Response Shape | Correct Answer Shape | Scoring Logic |
|-----------|----------------|----------------------|---------------|
| `single_best_answer` | `{ type: "single", value: string }` | `string` or `string[]` | Exact match or membership |
| `multiple_select` | `{ type: "multiple", value: string[] }` | `string[]` | Set equality (order-independent) |
| `ordered_response` | `{ type: "ordered", value: string[] }` | `string[]` | Exact ordered match |
| `dosage_calc` | `{ type: "numeric", value: number }` | `number` | Numeric within 0.01 tolerance |
| `hotspot` | `{ type: "hotspot", value: string[] }` | `string[]` | Sorted array equality |
| `highlight` | `{ type: "highlight", value: string[] }` | `string[]` | Sorted array equality |
| `dropdown` | `{ type: "dropdown", value: Record<string,string> }` | `Record<string,string>` | Key-value equality |
| `matrix` | `{ type: "matrix", value: Record<string,string> }` | `Record<string,string>` | Key-value equality |

**Notes:**

- `loadQuestionMetadataForScoring` derives correct answers from `question_options` where `is_correct = true`. For `dosage_calc`, the option key is parsed as a number.
- Dropdown/matrix correct answers require `stem_metadata` or `option_metadata` if the schema stores them per-blank; otherwise they fall back to single-option keys where applicable.
- Unknown or unsupported response types return `correct: false`.

---

## Persisted Results

### `exam_sessions.scratchpad_data.results`

```json
{
  "rawScore": 42,
  "maxScore": 50,
  "percentCorrect": 84,
  "flaggedCount": 3
}
```

### `exam_session_questions`

- `response_data` – User response (type + value)
- `is_flagged` – Boolean
- `is_correct` – Boolean (from scoring)
- `display_order` – Order in exam

---

## Result Summary & Breakdown Pages

### Result Summary (`ExamResultSummary`)

- Score % (from `result.percentCorrect`)
- Correct / total (from `result.rawScore`, `result.maxScore`)
- Time spent (from `result.timeSpentSeconds`)
- Flagged count (from `result.flaggedCount`)
- By System (from `result.bySystem`)
- By Question Type (from `result.byItemType`)

### Breakdown Page (`/results/[resultId]/breakdown`)

- Summary card: Score, Correct, Time, Flagged
- **Areas to Review** – Systems/domains below 70% (weak areas)
- By Question Type
- By System (with target %)
- By Domain

---

## Rationale Page

- **Path**: `/results/[resultId]/rationale/[questionId]`
- Uses `useExamSession` (localStorage + API fallback) for session data
- Displays:
  - Correct explanation (from question metadata)
  - **Your answer** – Formatted user response from `examSession.responses[questionId]`
  - Correct answer

---

## Partially Completed / Paused Exams

- **`getExamSessionStatus(clientExamId, userId)`** – Returns `{ exists, completed, questionCount }`
- Results page checks status: if `!completed`, shows “This exam is not yet completed…” and “Continue Exam” link to `/exam/[examId]`
- Scoring runs only when `session.completedAt` is set

---

## Exam Modes Supported

| Mode | Supported |
|------|-----------|
| Pre-practice exams | ✅ |
| Practice exams | ✅ |
| System exams | ✅ |
| Review sets | ✅ (if session has `questionIds` and responses) |

All modes use the same `computeScore` pipeline and `loadQuestionMetadataForScoring`.

---

## File Reference

| File | Purpose |
|------|---------|
| `src/lib/exam/scoring.ts` | `computeScore`, `scoreItem`, `ExamScoreResult` |
| `src/lib/questions/loaders.ts` | `loadQuestionMetadataForScoring` |
| `src/app/(app)/actions/exam.ts` | `saveExamSession`, `submitExamAndScore`, `loadBreakdownForExam`, `getExamSessionStatus` |
| `src/components/exam/ExamResultSummary.tsx` | Result summary UI |
| `src/app/(app)/results/[resultId]/breakdown/page.tsx` | Breakdown + weak areas |
| `src/app/(app)/results/[resultId]/rationale/[questionId]/page.tsx` | Rationale + user answer |
| `src/app/(app)/exam/[examId]/results/page.tsx` | Exam results (handles partial) |
| `src/components/exam/ExamReviewNavigator.tsx` | Review navigator (real session data) |
