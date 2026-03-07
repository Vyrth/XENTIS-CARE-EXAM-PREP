# Xentis Care Exam Prep — Schema Design Notes

## Enum Strategy

**Approach:** PostgreSQL native `CREATE TYPE ... AS ENUM` for fixed, stable value sets.

| Use Case | Choice | Rationale |
|----------|--------|-----------|
| **Stable, rarely changed** | Enum (e.g., `exam_track_slug`, `question_type_slug`) | Type safety, compact storage, schema clarity |
| **May need metadata** | Lookup table (e.g., `question_types`) | `question_types` has config JSONB, display_order |
| **Frequently extended** | Lookup table | Easier to add rows without migrations |

**Enums used:**
- `exam_track_slug`: lvn, rn, fnp, pmhnp
- `question_type_slug`: single_best_answer, multiple_response, etc.
- `exam_session_status`: in_progress, completed, abandoned, expired
- `subscription_status`: active, canceled, past_due, trialing, incomplete
- `content_status`: draft, review, approved, archived
- `media_asset_type`: image, video, pdf, audio
- `mastery_level`: not_started, learning, developing, proficient, mastered
- `recommendation_priority`: low, medium, high, critical
- `admin_role_slug`: super_admin, content_editor, support, analytics_viewer

**Adding new enum values:** `ALTER TYPE enum_name ADD VALUE 'new_value';` (requires migration)

---

## Partitioning & Scaling Notes

### Tables to Consider for Partitioning

| Table | Partition Key | When | Notes |
|-------|---------------|------|-------|
| `ai_interaction_logs` | `created_at` (monthly) | >1M rows | Append-only, time-based queries |
| `user_question_attempts` | `user_id` (hash) or `created_at` | >10M rows | High write volume |
| `exam_session_questions` | `exam_session_id` | Large exams | Less critical |
| `user_performance_trends` | `period_start` (monthly) | >5M rows | Time-series |

### Partitioning Example (ai_interaction_logs)

```sql
-- Convert to partitioned table (future migration)
CREATE TABLE ai_interaction_logs_partitioned (
  LIKE ai_interaction_logs INCLUDING ALL
) PARTITION BY RANGE (created_at);

CREATE TABLE ai_interaction_logs_2025_03
  PARTITION OF ai_interaction_logs_partitioned
  FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');
```

### Indexing for Scale

- **user_id + created_at DESC**: Most user-scoped tables. Composite index for "recent activity" queries.
- **Partial indexes**: `WHERE completed_at IS NULL` for queues; `WHERE status = 'approved'` for content.
- **Covering indexes**: Consider `INCLUDE` for hot columns to avoid heap lookups.

### Connection Pooling

- Use Supabase connection pooler (PgBouncer) for serverless.
- Long-running analytics queries: use direct connection or background jobs.

---

## JSONB Usage

| Table | Column | Purpose |
|-------|--------|---------|
| `questions` | stem_metadata | Hotspot coords, matrix layout, cloze structure |
| `question_options` | option_metadata | Complex option data (hotspot, matrix cells) |
| `exam_sessions` | scratchpad_data | Whiteboard/scratchpad state |
| `exam_session_questions` | response_data | User response (selected options, numeric, etc.) |
| `system_study_bundles` | bundle_content | IDs of guides, videos, decks |
| `user_remediation_plans` | plan_data | Structured remediation items |
| `ai_saved_outputs` | output_data | Mnemonics, flashcards, summaries |

**Rule:** Use JSONB only when structure varies by type or is truly flexible. Prefer normalized columns for queryable/filterable data.

---

## RLS Summary

| Pattern | Tables |
|---------|--------|
| **Own data only** | profiles, user_notes, user_highlights, exam_sessions, mastery tables, etc. |
| **Authenticated read** | Content (questions, study_guides, video_lessons, taxonomy) |
| **Public read** | subscription_plans (pricing page) |
| **Admin only** | user_admin_roles (write) |

**Service role** bypasses RLS for webhooks, background jobs, admin operations.

---

## Migration Order Summary

1. `001` — Extensions, enums
2. `002` — Taxonomy
3. `003` — Assessment base (question_types, lab refs)
4. `004` — Questions
5. `005` — Exam templates, system exams
6. `006` — Learning content
7. `007` — Legal, governance, media_assets, question_exhibits FK
8. `008` — Profiles, user base, auth trigger
9. `009` — User learning progress
10. `010` — Readiness, analytics
11. `011` — Adaptive recommendations
12. `012` — AI
13. `013` — Billing
14. `014` — RLS policies
15. `015` — updated_at triggers

---

## Seed Data Required

Before app use, seed:

1. **exam_tracks** — lvn, rn, fnp, pmhnp
2. **question_types** — All 13 item types from enum
3. **admin_roles** — super_admin, content_editor, support, analytics_viewer
4. **subscription_plans** — Per-track plans with Stripe price IDs
5. **domains, systems** — Per-track taxonomy (from board blueprints)
