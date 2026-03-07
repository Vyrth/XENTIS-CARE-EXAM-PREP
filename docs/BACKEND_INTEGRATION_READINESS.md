# Backend Integration Plan: Readiness Engine

This document describes how to integrate the readiness engine with Supabase/PostgreSQL.

## Overview

The readiness engine computes:
- **Readiness score** from weighted inputs
- **Mastery rollups** by system, domain, skill, topic, item type
- **Trends** from daily performance
- **Recommendations** from weak areas and activity
- **Remediation plans** from weak rollups
- **System exam unlock** from question counts per system

## Database Schema Additions

### 1. Response/Performance Tables

```sql
-- User responses (if not already present)
CREATE TABLE user_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  question_id UUID NOT NULL REFERENCES questions(id),
  correct BOOLEAN NOT NULL,
  confidence_range TEXT, -- e.g. "51-75%"
  system_id UUID REFERENCES systems(id),
  domain_id UUID REFERENCES domains(id),
  topic_id UUID REFERENCES topics(id),
  skill_id UUID REFERENCES skills(id),
  item_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_responses_user_created ON user_responses(user_id, created_at);
CREATE INDEX idx_user_responses_user_system ON user_responses(user_id, system_id);
CREATE INDEX idx_user_responses_user_domain ON user_responses(user_id, domain_id);
```

### 2. Study Progress

```sql
CREATE TABLE study_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  entity_type TEXT NOT NULL, -- 'study_guide' | 'video'
  entity_id UUID NOT NULL,
  progress_percent INT DEFAULT 0,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, entity_type, entity_id)
);
```

### 3. Exam Results (if not already present)

```sql
CREATE TABLE exam_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  session_id UUID NOT NULL,
  mode TEXT NOT NULL, -- 'pre_practice' | 'system' | 'readiness'
  system_id UUID REFERENCES systems(id),
  percent_correct DECIMAL(5,2),
  by_system JSONB,
  by_domain JSONB,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## Data Fetching Functions

### Readiness Inputs

```typescript
// lib/readiness/data.ts (to be implemented)

export async function getReadinessInputs(userId: string): Promise<ReadinessInputs> {
  const [
    questionAccuracy,
    domainPerformance,
    systemPerformance,
    skillPerformance,
    systemExamPerf,
    prePracticePerf,
    studyGuideCompletion,
    videoCompletion,
    confidenceCalibration,
    consistencyOverTime,
  ] = await Promise.all([
    getQuestionAccuracy(userId),
    getWeightedDomainPerformance(userId),
    getWeightedSystemPerformance(userId),
    getWeightedSkillPerformance(userId),
    getSystemExamPerformance(userId),
    getPrePracticeExamPerformance(userId),
    getStudyGuideCompletion(userId),
    getVideoCompletion(userId),
    getConfidenceCalibrationScore(userId),
    getConsistencyScore(userId),
  ]);

  return {
    questionAccuracy,
    domainPerformance,
    systemPerformance,
    skillPerformance,
    systemExamPerformance: systemExamPerf,
    prePracticeExamPerformance: prePracticePerf,
    studyGuideCompletion,
    videoCompletion,
    confidenceCalibration,
    consistencyOverTime,
  };
}
```

### Raw Performance for Mastery

```sql
-- System performance
SELECT system_id, COUNT(*) as total, SUM(CASE WHEN correct THEN 1 ELSE 0 END) as correct
FROM user_responses
WHERE user_id = $1 AND system_id IS NOT NULL
GROUP BY system_id;
```

### Daily Performance for Trends

```sql
SELECT DATE(created_at) as date,
  COUNT(*) as total,
  SUM(CASE WHEN correct THEN 1 ELSE 0 END) as correct
FROM user_responses
WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date;
```

### System Progress for Unlock

```sql
SELECT system_id, COUNT(*) as questions_answered
FROM user_responses
WHERE user_id = $1 AND system_id IS NOT NULL
GROUP BY system_id;
```

## API / Server Actions

1. **`getReadiness(userId)`** – Returns `{ score, band, inputs }`
2. **`getMastery(userId)`** – Returns rollups by system, domain, skill, item type
3. **`getRecommendations(userId)`** – Returns adaptive recommendations
4. **`getRemediationPlan(userId)`** – Returns remediation items
5. **`getSystemExamUnlockStatus(userId)`** – Returns unlocked/locked systems

## Migration Path

1. **Phase 1**: Use mock data; all logic runs client-side or in server components with mock imports.
2. **Phase 2**: Add Supabase tables and RPC functions; create `getReadinessInputs` etc. that query DB.
3. **Phase 3**: Replace mock imports with `getReadinessInputs(userId)` in server components; add loading/error states.
4. **Phase 4**: Add real-time subscriptions for progress (optional).

## Row Level Security (RLS)

```sql
ALTER TABLE user_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own responses"
  ON user_responses FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own responses"
  ON user_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

## Caching

- Readiness score: cache for 5–15 minutes; invalidate on new response or exam completion.
- Mastery rollups: cache per user; invalidate on new response.
- Recommendations: derive from mastery; no separate cache needed.
