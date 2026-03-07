# High-Yield Intelligence Architecture

## Purpose

Help students focus on what matters most for the board exam and what learners commonly struggle with.

## Inputs

### 1. Official Blueprint Weighting by Track

- **Source**: NCSBN test plans, NCLEX blueprints, certification exam blueprints
- **Storage**: `blueprint_weights` (system, topic) per track
- **Example**: RN Cardiovascular ~12%, PMHNP Psychiatric ~45%

### 2. Internal Performance Telemetry

- Most-missed systems
- Most-missed topics
- Weak skills (assessment, pharmacology, prioritization)
- Low-confidence correct answers (guessed right)
- Slow item types (dosage calc, multiple response)

### 3. Curated First-Party Student Signal

- Saved notes count per topic
- Common issue reports
- Frequently requested AI explanations
- Common confusion tags

### 4. Optional Public Sentiment (Legally Safe)

- Internal summarized tags and themes only
- No verbatim scraping of copyrighted competitor content or forum posts

## Data Model Additions

```sql
-- Blueprint weights (from official sources)
CREATE TABLE blueprint_weights (
  id UUID PRIMARY KEY,
  track TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- 'system' | 'topic'
  entity_id UUID NOT NULL,
  weight_percent DECIMAL(5,2) NOT NULL,
  source TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Telemetry aggregates (from response_analytics)
CREATE TABLE high_yield_telemetry (
  id UUID PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  track TEXT,
  miss_rate DECIMAL(5,2),
  avg_time_seconds INT,
  low_confidence_correct INT,
  total_attempts INT,
  period_start DATE,
  period_end DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Student signal aggregates
CREATE TABLE high_yield_student_signal (
  id UUID PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  track TEXT,
  saved_notes_count INT DEFAULT 0,
  explanation_requests_count INT DEFAULT 0,
  issue_reports_count INT DEFAULT 0,
  confusion_tags TEXT[],
  period_start DATE,
  period_end DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Top traps (curated)
CREATE TABLE top_traps (
  id UUID PRIMARY KEY,
  topic_id UUID REFERENCES topics(id),
  track TEXT NOT NULL,
  trap_description TEXT NOT NULL,
  correct_approach TEXT NOT NULL,
  frequency TEXT, -- 'common' | 'very_common' | 'extremely_common'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Common confusions (curated)
CREATE TABLE common_confusions (
  id UUID PRIMARY KEY,
  topic_id UUID REFERENCES topics(id),
  track TEXT NOT NULL,
  concept_a TEXT NOT NULL,
  concept_b TEXT NOT NULL,
  key_difference TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## Ranking Formula Proposal

Configurable in `config/high-yield.ts`:

```
score = (
  blueprintWeight * 0.35 +
  missRate * 0.25 +
  studentSignal * 0.20 +
  lowConfidenceCorrect * 0.10 +
  slowItemType * 0.10
)
```

- **Blueprint**: Normalize to 0-100 (max weight in track = 100)
- **Miss rate**: Higher miss = higher score (more important to study)
- **Student signal**: Notes + explanation requests, normalized
- **Low-confidence correct**: Guessed right = may not know
- **Slow item type**: Time pressure = difficulty

**Thresholds** (configurable):
- Top tier: ≥75
- High yield: ≥60
- Notable: ≥45

## Components

| Component | Location | Description |
|-----------|----------|-------------|
| Ranking service | `lib/high-yield/ranking-service.ts` | `getHighYieldTopics()` |
| High-yield card | `components/high-yield/HighYieldCard.tsx` | Single topic card |
| Study feed | `components/high-yield/HighYieldStudyFeed.tsx` | Dashboard feed |
| High-yield flag | `components/high-yield/HighYieldFlag.tsx` | Badge in guides/questions |
| Weak-area overlay | `components/high-yield/WeakAreaOverlay.tsx` | Weak + high-yield priority |
| Top traps card | `components/high-yield/TopTrapsCard.tsx` | Common pitfalls |
| Common confusion card | `components/high-yield/CommonConfusionCard.tsx` | X vs Y distinctions |

## Examples by Track

### LVN/LPN
- **High-yield**: Pharmacology, basic ADLs, delegation, safety
- **Top traps**: Scope of practice, medication administration
- **Confusions**: LVN vs RN scope, delegation vs assignment

### RN
- **High-yield**: Cardiovascular, Pharmacology, Safe Care, Prioritization
- **Top traps**: COPD O2, HFrEF vs HFpEF, BUN:Cr ratio
- **Confusions**: HFrEF vs HFpEF, COPD vs Asthma, Prerenal vs Intrinsic AKI

### FNP
- **High-yield**: Pharmacology, chronic disease management, differential diagnosis
- **Top traps**: Drug interactions, screening guidelines
- **Confusions**: Similar presentations (chest pain differentials)

### PMHNP
- **High-yield**: Psychiatric/Mental Health (45%+), Pharmacology, psychopharmacology
- **Top traps**: SSRI vs SNRI, serotonin syndrome
- **Confusions**: Depression vs bipolar, antipsychotic side effects
