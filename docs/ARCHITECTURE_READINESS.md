# Readiness Engine Architecture

## Goals

- Tell users how ready they are for the exam
- Identify strengths and weaknesses (systems, domains, skills, item types)
- Track confidence mismatch
- Recommend what to study next and which questions to serve
- Unlock 50+ question system exams after study progression
- Support remediation plans

## Components

```
┌─────────────────────────────────────────────────────────────────┐
│                     READINESS ENGINE                              │
├─────────────────────────────────────────────────────────────────┤
│  Config (readiness.ts)                                            │
│  - READINESS_BANDS, READINESS_WEIGHTS, MASTERY_TARGET_PERCENT    │
│  - SYSTEM_EXAM_UNLOCK_MIN_QUESTIONS, etc.                         │
├─────────────────────────────────────────────────────────────────┤
│  Core Services                                                    │
│  ├── readiness-score.ts    → computeReadinessScore, getReadinessBand│
│  ├── mastery-rollups.ts   → rollupBySystem/Domain/Skill/ItemType  │
│  ├── trend-aggregation.ts → aggregateDailyTrend, consistencyScore │
│  ├── confidence-calibration.ts → buildConfidenceBuckets, score   │
│  ├── recommendation-engine.ts → generateRecommendations           │
│  ├── adaptive-queue.ts    → selectAdaptiveQuestions               │
│  ├── content-queue.ts     → selectRecommendedContent              │
│  ├── remediation-plan.ts → generateRemediationPlan               │
│  └── system-completion.ts → isSystemExamUnlocked, getUnlockedSystems│
├─────────────────────────────────────────────────────────────────┤
│  Hooks                                                           │
│  ├── useReadiness(inputs) → { score, band, label, color }        │
│  ├── useMastery(data)     → rollups, weak*, strong*              │
│  └── useRecommendations(ctx) → AdaptiveRecommendation[]          │
├─────────────────────────────────────────────────────────────────┤
│  UI Components                                                   │
│  ├── ReadinessGauge       → score, band, target                  │
│  ├── WeakAreaCards        → weak areas with practice/study links  │
│  ├── AdaptiveRecommendationWidget → recommendation cards         │
│  └── DashboardReadinessClient → orchestrates gauge + weak + recs  │
└─────────────────────────────────────────────────────────────────┘
```

## Readiness Inputs (Weighted)

| Input | Weight | Source |
|-------|--------|--------|
| questionAccuracy | 0.25 | Overall correct/total from responses |
| domainPerformance | 0.20 | Weighted avg by domain |
| systemPerformance | 0.20 | Weighted avg by system |
| skillPerformance | 0.10 | Weighted avg by skill |
| systemExamPerformance | 0.10 | System exam results |
| prePracticeExamPerformance | 0.05 | Pre-practice exam results |
| studyGuideCompletion | 0.04 | study_progress |
| videoCompletion | 0.03 | study_progress |
| confidenceCalibration | 0.02 | Confidence vs accuracy buckets |
| consistencyOverTime | 0.01 | Std dev of daily performance |

## Readiness Bands

| Band | Score | Label |
|------|-------|-------|
| not_ready | 0-49 | Not Ready |
| developing | 50-69 | Developing |
| ready | 70-84 | Ready |
| exam_ready | 85-100 | Exam Ready |

## Mastery Rollups

- **Topic**: Performance per topic (system + domain)
- **Subtopic**: (Future) finer granularity
- **System**: Performance per body system
- **Domain**: Performance per NCLEX domain
- **Skill**: Performance per skill (assessment, pharmacology, etc.)
- **Item type**: Performance per question type (SBA, MR, dosage, etc.)

Each rollup: `{ id, type, name, correct, total, percent, targetPercent, atTarget }`

## Recommendation Engine

Generates recommendations from:
- Weak systems → practice questions
- Weak domains → content + questions
- Weak item types → targeted practice
- No recent pre-practice exam → schedule exam
- Low study guide completion → complete guides
- Overconfident ranges → confidence calibration review

## Adaptive Question Queue

Selects next questions by:
1. Preferring weak systems
2. Preferring weak item types
3. Mixing for variety

## System Exam Unlock

- User must answer ≥ 50 questions in a system to unlock its 50+ question exam
- Configurable via `SYSTEM_EXAM_UNLOCK_MIN_QUESTIONS`

## File Layout

```
src/
├── config/readiness.ts
├── types/readiness.ts
├── lib/readiness/
│   ├── index.ts
│   ├── readiness-score.ts
│   ├── mastery-rollups.ts
│   ├── trend-aggregation.ts
│   ├── confidence-calibration.ts
│   ├── recommendation-engine.ts
│   ├── adaptive-queue.ts
│   ├── content-queue.ts
│   ├── remediation-plan.ts
│   └── system-completion.ts
├── hooks/
│   ├── useReadiness.ts
│   ├── useMastery.ts
│   └── useRecommendations.ts
├── components/dashboard/
│   ├── ReadinessGauge.tsx
│   ├── WeakAreaCards.tsx
│   ├── AdaptiveRecommendationWidget.tsx
│   └── DashboardReadinessClient.tsx
└── data/mock/readiness.ts
```
