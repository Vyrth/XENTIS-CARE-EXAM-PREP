# Adaptive Exam Service Layer

Backend service for computer-adaptive practice exams using IRT-style theta estimation and blueprint balancing.

## Files Created

| File | Purpose |
|------|---------|
| `src/lib/adaptive/adaptive-session.ts` | Session lifecycle: create, complete, get |
| `src/lib/adaptive/adaptive-engine.ts` | Main orchestrator: getNext, submit, blueprint, calibration |
| `src/lib/adaptive/adaptive-selection.ts` | Question selection (re-exports from selection, blueprint) |
| `src/lib/adaptive/adaptive-scoring.ts` | Theta, SE, stop rules (re-exports from scoring) |
| `src/lib/adaptive/adaptive-index.ts` | Barrel export for service layer |

## Service APIs

### Session

| Function | Description |
|----------|-------------|
| `createAdaptiveExamSession({ userId, examTrackId, configSlug? })` | Create new session; resolves config by slug or default |
| `completeAdaptiveExamSession(sessionId, userId, stopReason, ...)` | Mark session completed with result metadata |
| `getAdaptiveSession(sessionId, userId)` | Get session, verify ownership |

### Engine

| Function | Description |
|----------|-------------|
| `getNextAdaptiveQuestion({ sessionId, userId })` | Select next question, create item, update session, update calibration |
| `submitAdaptiveAnswer({ sessionId, itemId, userId, answerPayload, timeSpentSeconds? })` | Score answer, update theta/SE, blueprint, complete if stop |
| `updateBlueprintProgress(supabase, sessionId, taxonomy, isCorrect)` | Upsert blueprint progress for domain/system/topic |

### Scoring

| Function | Description |
|----------|-------------|
| `updateThetaEstimate(input)` | One-step theta + SE update from item response |
| `updateStandardError(currentSE, fisherInfo)` | Posterior SE from Fisher information |
| `shouldStopAdaptiveExam(input)` | Evaluate stop rules |
| `computeReadinessFromTheta(input)` | Theta + SE → 0–100 readiness score |
| `getConfidenceBand(theta, SE, passingTheta)` | at_risk | borderline | likely_pass | strong_pass |

### Selection

| Function | Description |
|----------|-------------|
| `rankCandidatesForAdaptive(candidates, context)` | Rank by theta proximity + blueprint + exposure |
| `thetaProximityScore(difficultyB, thetaEstimate)` | Prefer questions near theta |
| `exposurePenaltyScore(exposureCount, maxBeforePenalty)` | Penalize over-exposed questions |
| `computeBlueprintBoost(...)` | Boost underrepresented domains/systems |
| `isBlueprintSatisfied(progress, targets, questionCount)` | All targets met? |

## Question Selection Logic

1. **Track**: Only questions for `exam_track_id`.
2. **Status**: `approved` or `published` (skip retired, draft, etc.).
3. **No repeats**: Exclude questions already in `adaptive_exam_items` for this session.
4. **Blueprint**: Boost underrepresented domains/systems from `exam_blueprints`.
5. **Theta proximity**: Prefer `difficulty_b` near current `theta_estimate`.
6. **Exposure**: Penalize questions with high `exposure_count` in `question_calibration`.
7. **Calibration**: Slight bonus for questions with calibration data.

## Stop Rules

Order of evaluation:

1. **max_reached**: `questionCount >= maxQuestions` → stop.
2. **min_not_met**: `questionCount < minQuestions` → continue.
3. **precision_met**: `standardError <= targetStandardError` → stop.
4. **blueprint_met**: All blueprint targets satisfied → stop.
5. Otherwise → continue.

## Scoring (Approximate)

- **Theta update**: Newton-Raphson style step with residual (correct - P(correct)).
- **SE update**: Posterior variance from Fisher information.
- **Stop when**: `min_questions` reached and `standardError <= target_se`, or `max_questions` reached.

## question_calibration Update

When a question is served via `getNextAdaptiveQuestion`:

- `exposure_count` += 1
- `last_served_at` = now
- If no calibration row exists, insert default row with `calibration_source: "adaptive_exam_serve"`.
