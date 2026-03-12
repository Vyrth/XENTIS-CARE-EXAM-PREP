# Adaptive AI for Xentis Care Exam Prep

Adaptive AI personalizes responses based on learner readiness analytics. The system converts user analytics into structured context for AI prompts and injects readiness-aware instructions into each AI action.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Dashboard / Weak-Area UI / Client                                │
│  (passes analytics in request body or fetches from /api/me/...)   │
└────────────────────────────┬────────────────────────────────────┘
                             │ analytics payload
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  buildAdaptiveContext(analyticsToAdaptiveInput(analytics))        │
│  → AdaptiveContextOutput: contextString, promptInstructions,      │
│    learnerProfile, remediationSuggestions                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  Prompt Injection Layer                                          │
│  - injectAdaptiveSystemPrompt(base, adaptive)                    │
│  - injectAdaptiveUserContext(prompt, adaptive)                   │
│  - appendAdaptiveNextStepInstruction(prompt, adaptive)           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  AI Actions (explain-highlight, mnemonic, weak-area-coach, etc.) │
│  Each receives adaptiveContext in options and injects into       │
│  system + user prompts                                           │
└─────────────────────────────────────────────────────────────────┘
```

## Files

| File | Purpose |
|------|---------|
| `src/lib/readiness/adaptive-context.ts` | Builds `AdaptiveContextOutput` from analytics |
| `src/lib/ai/adaptive/prompt-injection.ts` | Injects adaptive instructions into prompts |
| `src/lib/ai/adaptive/response-formatter.ts` | Wraps responses with remediation suggestions |
| `src/lib/ai/adaptive/index.ts` | Exports |
| `src/lib/readiness/recommendation-engine.ts` | Augmented with adaptive remediation suggestions |

## Example Adaptive Prompt Payloads

### Beginner learner (readinessBand: "not_ready", score < 50)

**System prompt addition:**
```
Adaptive guidance for this learner:
This learner is early in their prep. Use foundational explanations, avoid jargon, and build from basics.
```

**User prompt addition:**
```
Learner context (use to personalize your response):
---
Learner analytics:
Readiness: not_ready (42%)
Weak systems: Cardiovascular (38%); Pharmacology (45%)
Study guide completion: 25%
---
```

### Near-ready learner (readinessBand: "ready", score 70+)

**System prompt addition:**
```
Adaptive guidance for this learner:
This learner is close to exam-ready. Emphasize board traps, test-taking strategies, and common distractors.
```

### Weak in pharmacology

**System prompt addition:**
```
The learner is weak in pharmacology. Include medication-focused reminders, key distinctions, and nursing considerations when relevant.
```

### Weak in SATA / multiple-response items

**System prompt addition:**
```
The learner struggles with multiple-response and case-study items. Emphasize item-type reasoning: read each option independently, avoid all-or-nothing thinking.
```

### Overconfident (high confidence, lower accuracy)

**System prompt addition:**
```
The learner is overconfident in some areas (high confidence but lower accuracy). Gently correct overconfidence; encourage careful reasoning and reviewing missed questions.
```

### Underconfident

**System prompt addition:**
```
The learner is underconfident. Be reassuring, use step-by-step teaching, and reinforce correct thinking.
```

## How Answers Differ by Readiness Band

| Band | Explain Highlight | Mnemonic | Weak-Area Coach |
|------|-------------------|----------|-----------------|
| **beginner** | Foundational, avoids jargon, builds from basics | Simpler mnemonics, more scaffolding | Teach-from-zero tone, foundational path |
| **developing** | Balance basics + exam application | Standard mnemonics with board tips | Mix of content + practice recommendations |
| **near_ready** | Board traps, distractors, test-taking | High-yield recall, exam traps | Board traps, timeline to exam |
| **exam_ready** | Refinement, high-yield polish | Rapid recall focus | Polish, confidence, test-day tips |

## API Integration

### Request body (optional `analytics`)

```json
{
  "selectedText": "MONA for MI...",
  "examTrack": "rn",
  "analytics": {
    "readinessScore": 58,
    "readinessBand": "developing",
    "weakSystems": [{ "name": "Cardiovascular", "percent": 52 }],
    "weakSkills": [{ "name": "Pharmacology", "percent": 45 }],
    "weakItemTypes": [{ "name": "Select All That Apply", "percent": 40 }],
    "overconfidentRanges": ["Cardiovascular"],
    "confidenceCalibration": 55,
    "recentMistakes": ["heart failure", "ACE inhibitors"],
    "studyGuideCompletion": 60,
    "lastStudyMaterialsCompleted": ["CV Study Guide Ch 3"]
  }
}
```

### Response (when analytics provided)

```json
{
  "success": true,
  "data": { "simpleExplanation": "...", "boardTip": "...", ... },
  "remediationSuggestions": [
    "Practice 15-20 questions daily in Cardiovascular",
    "Review pharmacology study guide sections and drug classifications"
  ],
  "learnerProfile": "developing",
  "usage": { "prompt_tokens": 450, "completion_tokens": 180 }
}
```

## Dashboard and Weak-Area UI Integration

### 1. Fetch analytics before AI calls

```ts
// Option A: Fetch from analytics endpoint
const analytics = await fetch('/api/me/analytics').then(r => r.json());

// Option B: Use readiness/mastery data from dashboard context
const analytics = {
  readinessScore: readinessData.score,
  readinessBand: readinessData.band,
  weakSystems: masteryRollups.weakSystems,
  weakDomains: masteryRollups.weakDomains,
  weakSkills: masteryRollups.weakSkills,
  weakItemTypes: masteryRollups.weakItemTypes,
  overconfidentRanges: confidenceData.overconfidentRanges,
  underconfidentRanges: confidenceData.underconfidentRanges,
  confidenceCalibration: confidenceData.calibration,
  recentMistakes: recentMistakes.slice(0, 5),
  studyGuideCompletion: progress.studyGuidePercent,
  videoCompletion: progress.videoPercent,
  lastStudyMaterialsCompleted: lastCompleted,
};
```

### 2. Pass analytics to AI API routes

```ts
const res = await fetch('/api/ai/explain-highlight', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    selectedText,
    examTrack: 'rn',
    analytics,  // <-- include when available
  }),
});
```

### 3. Display remediation suggestions

```tsx
const { data, remediationSuggestions, learnerProfile } = await res.json();

if (remediationSuggestions?.length) {
  // Show "Suggested next steps" card with saveable items
  <RemediationSuggestionsCard
    suggestions={remediationSuggestions}
    onSave={(s) => saveToRemediationPlan(s)}
  />
}
```

### 4. Recommendation engine integration

When generating dashboard recommendations, pass adaptive context to augment with AI-derived remediation:

```ts
import { generateRecommendations } from '@/lib/readiness/recommendation-engine';
import { buildAdaptiveContext, analyticsToAdaptiveInput } from '@/lib/readiness/adaptive-context';

const adaptiveContext = buildAdaptiveContext(analyticsToAdaptiveInput(analytics));
const recs = generateRecommendations(ctx, getSystemSlug, getDomainSlug, {
  adaptiveContext,
});
```

## Saveable Remediation Suggestions

Remediation suggestions are derived from analytics and returned in API responses. They can be:

- Displayed in a "Suggested next steps" UI
- Saved to `user_remediation_plans` or similar
- Used to pre-populate study plan items

Examples:

- `"Practice 15-20 questions daily in Cardiovascular"`
- `"Review pharmacology study guide sections and drug classifications"`
- `"Practice multiple-response and case-study questions; read each option independently"`
- `"Complete at least 50% of study guides in weak systems"`
- `"Review missed questions in overconfident ranges; slow down and verify before answering"`

## Implementation Notes

1. **Analytics optional**: All AI routes work without analytics. Adaptive behavior is additive.
2. **Weak-area-coach**: Always builds adaptive context from request body (has full analytics).
3. **Other routes**: Accept optional `analytics` in body. Client should pass when available.
4. **Orchestrator**: The legacy `runAIAction` in `orchestrator.ts` supports `req.analytics` for the generic `/api/ai` route.
5. **Recommendation engine**: Pass `{ adaptiveContext }` to `generateRecommendations` to add AI remediation suggestions to dashboard recs.
