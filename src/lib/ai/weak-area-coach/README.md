# Weak Area Coach API

Uses learner analytics to explain weaknesses and recommend what to do next. Board-prep coaching tone.

## Endpoint

```
POST /api/ai/weak-area-coach
```

## Request

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | string | Yes | Current user ID (must match session) |
| `examTrack` | string | Yes | One of: `lvn`, `rn`, `fnp`, `pmhnp` |
| `weakSystems` | array | No | `[{ name, percent, targetPercent?, correct?, total? }]` |
| `weakDomains` | array | No | Same shape |
| `weakSkills` | array | No | Same shape |
| `weakItemTypes` | array | No | Same shape |
| `readinessBand` | string | No | e.g. `not_ready`, `developing`, `ready`, `exam_ready` |
| `recentMistakes` | array | No | Topic names from recent missed questions |
| `currentStudyPlan` | string | No | Brief description of current plan |
| `coachingMode` | string | No | One of: `explain_weakness`, `remediation_plan`, `teach_from_zero`, `exam_readiness`. Default: `explain_weakness` |

## Response

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether the request succeeded |
| `data` | object | WeakAreaCoachResponse |
| `usage` | object | Token usage if available |

### WeakAreaCoachResponse

```ts
{
  summaryOfWeakAreas: string;
  likelyCausesOfMistakes: string;
  whatLearnerProbablyConfusing: string;
  recommendedContentToReview: string;
  recommendedQuestionVolume: string;
  suggestedNextStep: string;
  mnemonicSuggestion?: string;
}
```

## Example Request

```json
{
  "userId": "user-uuid",
  "examTrack": "rn",
  "weakSystems": [
    { "name": "Cardiovascular", "percent": 62, "targetPercent": 80, "correct": 28, "total": 45 },
    { "name": "Renal", "percent": 54, "targetPercent": 80, "correct": 15, "total": 28 }
  ],
  "weakDomains": [
    { "name": "Health Promotion", "percent": 72, "correct": 52, "total": 72 }
  ],
  "readinessBand": "developing",
  "coachingMode": "remediation_plan"
}
```

## Example Response

```json
{
  "success": true,
  "data": {
    "summaryOfWeakAreas": "Your weakest areas are Cardiovascular (62%) and Renal (54%), both below the 80% target. Health Promotion is closer but could improve.",
    "likelyCausesOfMistakes": "Cardiovascular and Renal often trip students on pathophysiology, drug interactions, and prioritization. You may be rushing through calculation or delegation questions.",
    "whatLearnerProbablyConfusing": "Common confusions: heart failure vs. MI management, acute vs. chronic renal failure, fluid overload vs. dehydration signs.",
    "recommendedContentToReview": "Cardiovascular study guide sections on heart failure, MI drugs (MONA), and EKG basics. Renal: AKI vs. CKD, fluid/electrolyte balance.",
    "recommendedQuestionVolume": "15-20 Cardiovascular questions daily, 10-15 Renal. Aim for 25-35 total in weak areas per day.",
    "suggestedNextStep": "Start with 15 Cardiovascular questions today, then review the heart failure section in your study guide.",
    "mnemonicSuggestion": "For MI drugs: MONA - Morphine, Oxygen, Nitro, Aspirin. For renal: 'BUN and Creatinine go up together in AKI' - if only BUN rises, think GI bleed or steroids."
  },
  "usage": { "prompt_tokens": 180, "completion_tokens": 220 }
}
```

## Context Builder (Analytics → AI-Ready)

Use `buildCoachContext` from `@/lib/readiness/context-builder` to convert mastery analytics into concise context:

```ts
import { buildCoachContext } from "@/lib/readiness/context-builder";

const context = buildCoachContext({
  weakSystems: mastery.weakSystems,  // MasteryRollup[]
  weakDomains: mastery.weakDomains,
  weakSkills: mastery.weakSkills,
  weakItemTypes: mastery.weakItemTypes,
  readinessBand: readiness.band,
  readinessScore: readiness.score,
  recentMistakes: ["Heart failure", "Fluid overload"],
  currentStudyPlan: "Focusing on cardio this week",
});
// Handles sparse data - returns helpful fallback when analytics are limited
```

## Integrating with Weak Area Center Page

1. **Fetch coaching** when user clicks "Get AI Coaching" or similar:

```ts
const res = await fetch("/api/ai/weak-area-coach", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    userId: session.user.id,
    examTrack: track,
    weakSystems: weakSystems.map((s) => ({
      name: s.name,
      percent: s.percent,
      targetPercent: s.targetPercent,
      correct: s.correct,
      total: s.total,
    })),
    weakDomains: weakDomains.map((d) => ({ ... })),
    readinessBand: readiness.band,
    coachingMode: "remediation_plan",
  }),
});
const json = await res.json();
```

2. **Display** `data.summaryOfWeakAreas`, `data.likelyCausesOfMistakes`, etc. in a card or modal.

3. **Feed dashboard widgets**: Use `suggestedNextStep` and `recommendedQuestionVolume` for recommendation tiles.

4. **Save to user_remediation_plans**: Use `toRemediationPlanData` from `@/lib/readiness/remediation-plan` with remediation items + `suggestedNextStep` from response:

```ts
import { generateRemediationPlan, toRemediationPlanData } from "@/lib/readiness";

const plan = generateRemediationPlan(weakAreas, getEntityName);
const planData = toRemediationPlanData(plan, {
  suggestedNextStep: coachingData.suggestedNextStep,
  summary: coachingData.summaryOfWeakAreas,
});
// Insert into user_remediation_plans with plan_data: planData
```

## Coaching Modes

| Mode | Description |
|------|-------------|
| `explain_weakness` | Explain why areas are weak, what learner is missing |
| `remediation_plan` | Concrete plan: what to study, how many questions, order |
| `teach_from_zero` | Foundational guidance, assume building from scratch |
| `exam_readiness` | Assess readiness, what must improve before exam |

## Sparse Analytics

When analytics are sparse (new user, little practice), `buildCoachContext` returns a fallback message. The AI will provide general board-prep guidance and encourage more practice.
