# Admin Analytics Phase 3 — Real Learner Activity

## Summary

Admin analytics now reflect actual learner behavior and system performance. All metrics come from real DB queries; no mock data.

---

## 1. Root Causes Found

| Issue | Root Cause |
|-------|------------|
| Fake metrics on analytics page | Hardcoded values ("1,234", "12,456", etc.) in `page.tsx` |
| No learner metrics on overview | Overview loaders did not query learner activity tables |
| Fake system usage chart | Static "Cardiovascular 32%", etc. |
| No track breakdown | No track-scoped metrics |
| No weak/strong systems | No aggregation from exam_session_questions + user_question_attempts |
| No operational metrics | No AI factory queries |

---

## 2. Files Changed

| File | Change |
|------|--------|
| `src/lib/admin/analytics-loaders.ts` | **New** — Real loader for learner, content, track, weak/strong systems, operational metrics |
| `src/app/(app)/admin/analytics/page.tsx` | Replaced mock data with `loadAdminAnalytics()` + `loadQuestionUsageBySystem()`; added Suspense + skeleton |
| `src/lib/admin/overview-loaders.ts` | Added `loadLearnerSummary()`, `LearnerSummary`; included learner in `loadAdminOverviewMetrics()` |
| `src/app/(app)/admin/page.tsx` | Added learner metrics card (total learners, active 7d, sessions 7d, questions 7d) |

---

## 3. Admin Widgets → Source Tables

| Widget | Source | Tables |
|--------|--------|--------|
| Total learners | `profiles` | `profiles.primary_exam_track_id IS NOT NULL` |
| Active learners (7d) | Distinct users from sessions + attempts | `exam_sessions`, `user_question_attempts` |
| Completed sessions | Completed exam sessions | `exam_sessions.completed_at IS NOT NULL` |
| Questions answered | Exam + standalone attempts | `exam_session_questions`, `user_question_attempts` |
| Avg score | Session scratchpad | `exam_sessions.scratchpad_data.results.percentCorrect` |
| Avg readiness | Readiness snapshots | `user_readiness_snapshots.overall_score_pct` |
| Content usage: questions | Exam + attempts | `exam_session_questions`, `user_question_attempts` |
| Content usage: flashcards | Flashcard progress | `user_flashcard_progress` |
| Content usage: study guides | Study guide completion | `study_material_progress` (completed = true) |
| Content usage: videos | Video completion | `video_progress` (completed = true) |
| Content usage: high-yield | — | No engagement table yet → 0 |
| Track breakdown | Per-track aggregation | `profiles`, `exam_sessions`, `exam_session_questions`, `user_question_attempts`, `questions` |
| Question usage by system | Answers grouped by system | `exam_session_questions`, `user_question_attempts` → `questions` → `systems` |
| Top weak systems | Systems with &lt;65% accuracy | Same as above |
| Top strong systems | Systems with ≥80% accuracy | Same as above |
| Batch jobs | AI batch jobs | `ai_batch_jobs.status` |
| Campaigns | AI campaigns | `ai_generation_campaigns.status` |
| Shards | AI shards | `ai_generation_shards` |
| Recent failures | Error logs | `ai_batch_job_logs` (log_level = error) |
| Retries | Shard retry count | `ai_generation_shards.retry_count` |

---

## 4. Routes Verified

| Route | Status |
|-------|--------|
| `/admin` | Learner metrics card added; overview metrics unchanged |
| `/admin/analytics` | Full analytics page with real data |

---

## 5. Empty-State Behavior

| Scenario | Behavior |
|----------|----------|
| No learners | Shows "0" for all learner metrics |
| No exam sessions | Completed sessions = 0; avg score = "—" |
| No question attempts | Questions answered = 0; system usage chart empty |
| No track data | "No track data yet." |
| No system usage | "No question usage data yet." |
| No weak/strong systems | "No weak/strong systems identified yet (need ≥5 answers per system)." |
| Service role not configured | `safeQuery` returns fallback (zeros, empty arrays) |

---

## 6. Remaining Blockers

| Blocker | Notes |
|---------|-------|
| High-yield engagement | No `high_yield_engagement` or similar table; `highYield` shown as 0 |
| Publish throughput | Not implemented; could add from `content_status_transitions` if we track publish events |
| Session length | Not computed; avg session length not in metrics |

---

## Usage

- **Admin overview** (`/admin`): Shows learner summary (total, active 7d, sessions 7d, questions 7d).
- **Analytics** (`/admin/analytics`): Full metrics, content usage, track breakdown, question usage by system, weak/strong systems, operational metrics.

All queries use `createServiceClient()` and `safeQuery` when service role is not configured.
