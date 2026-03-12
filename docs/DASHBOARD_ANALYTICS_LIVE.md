# Dashboard Analytics – Live Implementation

This document describes the live dashboard analytics for Xentis Care Exam Prep. All values are sourced from database-backed user data. **No mock or demo data is shown to normal users.**

## Overview

- **Track-specific**: All analytics are scoped to the signed-in user's primary track.
- **Empty states**: Proper messaging when no data exists (e.g., "No activity yet", "Start practicing").
- **Fallbacks**: When materialized tables are empty, analytics are derived from raw activity data.

---

## Data Sources

### Persisted Tables (Primary)

| Table | Purpose |
|-------|---------|
| `user_readiness_snapshots` | Point-in-time readiness score (overall_score_pct) |
| `user_system_mastery` | Questions answered/correct per system |
| `user_domain_mastery` | Questions answered/correct per domain |
| `user_skill_mastery` | Questions answered/correct per skill |
| `user_item_type_performance` | Questions answered/correct per question type |
| `user_streaks` | Daily activity (questions_answered, minutes_studied) |
| `user_performance_trends` | Time-series by day/week |

### Raw Activity (Fallback / Derivation)

| Table | Purpose |
|-------|---------|
| `exam_sessions` | Exam attempts, session duration |
| `exam_session_questions` | Per-question correctness in exams |
| `user_question_attempts` | Standalone question attempts |

---

## Derived vs Persisted Analytics

| Metric | Primary Source | Fallback (Derived) |
|--------|----------------|---------------------|
| **Readiness score** | `user_readiness_snapshots` | Computed from mastery rollups via `deriveReadinessFromMastery` |
| **Mastery (systems, domains, skills, item types)** | `user_*_mastery`, `user_item_type_performance` | Aggregated from `user_question_attempts` + `exam_session_questions` joined with `questions` |
| **Questions today** | — | `exam_session_questions` (sessions started today) + `user_question_attempts` (created today) |
| **Study minutes today** | `user_streaks` (activity_type = minutes_studied/study) | Sum of exam session duration + `user_question_attempts.time_spent_seconds` (or 90s default) |
| **Current streak** | `user_streaks` (consecutive activity_date) | Consecutive days with `exam_sessions` or `user_question_attempts` |
| **Performance trends** | `user_performance_trends` (period_type = day) | Aggregated by date from `exam_session_questions` + `user_question_attempts` |

---

## Dashboard Widgets

### Stat Blocks (Top Row)

- **Questions Today** – Count from exam sessions + standalone attempts
- **Study Minutes** – From `user_streaks` or derived from session/attempt duration
- **Current Streak** – Consecutive days with activity
- **Readiness Score** – From snapshot or computed from mastery

### Continue Learning

- Real system data from `systems` (track-filtered)
- Links to practice, pre-practice exam, study guides

### Readiness & Recommendations

- **Readiness Gauge** – Score, band, target
- **Weak Area Cards** – Systems/domains below target (from mastery rollups)
- **Adaptive Recommendation Widget** – From `generateRecommendations` (weak systems, weak domains, pre-practice exam, etc.)
- **Empty state**: "No activity yet" when user has answered zero questions

### Recent Performance

- **PerformanceTrendCard** – Last 7 days of questions answered and score %
- Uses `user_performance_trends` when available; otherwise derived from exam/attempt data

### Weak Area Overlay

- Systems below target with high-yield scores
- Links to practice by system/domain

### High-Yield Study Feed

- Topics from `exam_blueprints`, `topic_system_links`, `topics`
- Real DB content; empty state when no topics for track

---

## File Reference

| File | Purpose |
|------|---------|
| `src/lib/dashboard/loaders.ts` | `loadDashboardStats`, `loadReadinessScore`, `loadMasteryData`, `loadHighYieldTopics`, `loadContinueLearningCards`, `loadPerformanceTrends`, `computeMasteryFromActivity` |
| `src/app/(app)/dashboard/page.tsx` | Dashboard page – orchestrates loaders, passes data to components |
| `src/components/dashboard/DashboardReadinessClient.tsx` | Readiness gauge, weak areas, recommendations, empty state |
| `src/components/dashboard/ReadinessGauge.tsx` | Score display |
| `src/components/dashboard/WeakAreaCards.tsx` | Focus areas with practice/study links |
| `src/components/dashboard/AdaptiveRecommendationWidget.tsx` | Recommended next actions |
| `src/components/dashboard/PerformanceTrendCard.tsx` | 7-day performance trend |
| `src/hooks/useMastery.ts` | Rollups, weak/strong areas |
| `src/hooks/useRecommendations.ts` | Adaptive recommendations |
| `src/lib/readiness/readiness-score.ts` | `computeReadinessScore`, `getReadinessBandInfo` |
| `src/lib/readiness/mastery-rollups.ts` | `rollupBySystem`, `getWeakRollups`, etc. |
| `src/lib/readiness/recommendation-engine.ts` | `generateRecommendations` |

---

## Mock Data Isolation

- **Dashboard** does not import any `MOCK_*` constants.
- **Readiness demo** (`/readiness-demo`) is a separate page that explicitly uses mock data for demonstration.
- **Admin pages** use mock data for admin-only features (review queue, curriculum, etc.) – not user-facing dashboard.
