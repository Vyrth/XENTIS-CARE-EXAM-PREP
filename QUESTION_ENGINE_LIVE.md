# Question Engine – Fully Live Implementation

## Summary

The question engine is now fully database-backed with track-filtered loading, persisted session state, and support for all question types. Mock dependencies have been removed from the user-facing flow.

---

## 1. Real Question Loading and Saving

### API: `GET /api/questions/[id]`
- **Track-filtered**: Verifies question belongs to user's primary track via `getPrimaryTrack`
- **Query param `revealAnswers`**: When `false` (exam mode), does not send `correctAnswer`, `isCorrect`, or `rationale` to prevent cheating
- **Full question payload**:
  - `stem`, `leadIn`, `instructions` (from `stem_metadata`)
  - `options` (from `question_options`)
  - `imageUrl` (from `question_exhibits` or `stem_metadata`)
  - `caseStudyTabs` (from `question_interactions`)
  - `chartTableData` (from `question_exhibits.exhibit_data` or `stem_metadata`)
  - `matrixRows`, `matrixCols`, `clozeBlanks`, `hotspotRegions`, `highlightTargets`, `bowTieLeft`, `bowTieRight`, `selectN` (from `stem_metadata`)
  - `difficulty` (from `question_adaptive_profiles`)

### `fetchQuestionById(id, { revealAnswers })`
- Exam page uses `revealAnswers: false`
- Rationale/review uses `revealAnswers: true` (default)

---

## 2. Track-Filtered Question Engine

- **`/api/questions/ids`**: Uses `loadQuestionIds(trackId, filters, limit, seed)` – track-scoped
- **`/api/questions/[id]`**: `.eq("exam_track_id", trackId)` – track-scoped
- **`/api/questions/browse`**: Uses `loadQuestionsPage(trackId, ...)` – track-scoped
- **Entitlement**: `canAnswerQuestions(userId)` caps daily limit for free users

---

## 3. Persisted Session/Question State

### `exam_sessions` + `exam_session_questions`
- **Save flow**:
  - On session create: `saveExamSession(session)` 
  - Every 30s during exam: reads from `loadSessionFromStorage` and calls `saveExamSession`
  - On submit: `saveExamSession(session, scoresMap)` with `is_correct` per question
- **Response types persisted**: `single`, `multiple`, `ordered`, `numeric`, `dropdown`, `hotspot`, `highlight`, `matrix`
- **Columns**: `response_data` (JSONB), `is_answered`, `is_flagged`, `is_correct` (after scoring)

### `user_question_attempts`
- **Server action**: `recordQuestionAttempt(userId, questionId, response, isCorrect, timeSpentSeconds)`
- Ready for standalone practice flows (e.g. single-question practice from browse)

### Session API: `GET /api/exam/session?examId=xxx`
- Loads session from DB for rationale/review when localStorage is empty (cross-device)

---

## 4. Removal of Mock Question Dependencies

- **`question-bank.ts`**: No mock fallback; returns `[]` when API empty
- **`fetchQuestionById`**: No mock; returns `undefined` when not found
- **Exam page**: Uses `revealAnswers: false`; shows "No content available yet for your track" when empty
- **Admin/AI retrieval**: Mock data retained only in admin tools and AI retrieval fallback (by design)

---

## 5. Question Types: Fully Live vs Partially Live

| Type | Renderer | API Support | Answer Capture | Scoring |
|------|----------|-------------|----------------|---------|
| **single_best_answer** | ✅ | ✅ | ✅ | ✅ |
| **multiple_response** | ✅ | ✅ | ✅ | ✅ |
| **select_n** | ✅ | ✅ (selectN from stem_metadata) | ✅ | ✅ (as multiple) |
| **image_based** | ✅ | ✅ (imageUrl) | ✅ | ✅ (as single) |
| **chart_table_exhibit** | ✅ | ✅ (chartTableData) | ✅ | ✅ (as single/multiple) |
| **matrix** | ✅ | ✅ (matrixRows, matrixCols) | ✅ | ✅ (matrix type) |
| **dropdown_cloze** | ✅ | ✅ (clozeBlanks) | ✅ | ⚠️ (needs correctAnswer format) |
| **ordered_response** | ✅ | ✅ | ✅ | ✅ |
| **hotspot** | ✅ | ✅ (hotspotRegions) | ✅ | ⚠️ (needs correctAnswer format) |
| **highlight_text_table** | ✅ | ✅ (highlightTargets) | ✅ | ⚠️ (needs correctAnswer format) |
| **case_study** | ✅ | ✅ (caseStudyTabs) | ✅ | ✅ (as single/multiple) |
| **dosage_calc** | ✅ | ✅ | ✅ | ✅ (numeric) |
| **bow_tie_analog** | ✅ | ✅ (bowTieLeft, bowTieRight) | ✅ | ⚠️ (needs correctAnswer format) |

**Fully live**: single_best_answer, multiple_response, select_n, image_based, ordered_response, case_study, dosage_calc  
**Partially live**: chart_table_exhibit, matrix – structure supported; dropdown_cloze, hotspot, highlight, bow_tie – scoring may need correctAnswer stored in `stem_metadata` for complex formats.

---

## 6. Review and Rationale Pages

- **Rationale page**: Uses `useExamSession(resultId)` – loads from localStorage first, then `/api/exam/session` if empty
- **Rationale page**: Uses `useQuestion(questionId, { revealAnswers: true })` – shows correct answer and rationale
- **Breakdown page**: Uses `loadBreakdownForExam(clientExamId, userId)` – real data from DB

---

## 7. Loading, Error, and Empty States

- **Exam page**: "Loading exam...", "No content available yet for your track", "Loading question...", "Question not found."
- **Rationale page**: "Loading...", "Question not found."
- **API**: 401 Unauthorized, 400 No track, 404 Question not found
