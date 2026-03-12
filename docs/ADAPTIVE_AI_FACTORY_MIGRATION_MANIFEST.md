# Adaptive Engine + AI Factory Migration Manifest

**Purpose:** Canonical execution order for adaptive exam (CAT) and AI Content Factory migrations.

**Reference:** `docs/SCHEMA_DISCOVERY_REPORT.md`, `docs/SQL_MIGRATION_PATTERNS.md`, `docs/ENUM_SAFE_MIGRATION.md`

---

## Prerequisites

- `exam_tracks` seeded (migration 019)
- `questions`, `study_guides`, `video_lessons`, `flashcard_decks`, `high_yield_content` tables exist
- `ai_batch_jobs` (migration 034), `ai_generation_audit` (migration 029) exist

---

## Migration Order (Exact Execution Sequence)

Supabase runs migrations in lexicographic order by filename. This is the sequence for the adaptive + AI factory stack:

| # | Migration File | Description |
|---|----------------|-------------|
| 0 | **Schema discovery** | Run `supabase/schema_inspection.sql` against target DB before migration. Compare with `docs/SCHEMA_DISCOVERY_REPORT.md`. |
| 1 | `20250306000038_adaptive_exam_engine.sql` | Adaptive exam engine (CAT): configs, calibration, sessions, items, blueprint progress. Creates tables if not exist. |
| 2 | `20250306000040_adaptive_exam_core.sql` | Adaptive exam core hardening: `uq_adaptive_exam_configs_track_slug`, constraints. Uses `CREATE TABLE IF NOT EXISTS`. |
| 3 | `20250306000041_adaptive_exam_indexes.sql` | Adaptive exam indexes for sessions, items, calibration. |
| 4 | `20250306000042_adaptive_exam_rls.sql` | RLS policies for adaptive_exam_configs, adaptive_exam_sessions, adaptive_exam_items, question_calibration. |
| 5 | `20250306000043_adaptive_exam_seed.sql` | Seed one adaptive config per track (rn-cat, fnp-cat, pmhnp-cat, lvn-cat). |
| 6 | `20250306000044_ai_factory_core.sql` | AI factory core: ai_generation_campaigns, ai_generation_shards, content_dedupe_registry. |
| 7 | `20250306000045_ai_factory_indexes.sql` | AI factory indexes for campaigns, shards, dedupe registry. |
| 8 | `20250306000046_ai_factory_rls.sql` | RLS policies for ai_generation_campaigns, ai_generation_shards. |
| 9 | `20250306000047_batch_plan_hardening.sql` | Batch plan hardening: campaign_id, shard_id, generated_count, saved_count, failed_count, etc. |
| 10 | `20250306000048_batch_plan_logs_hardening.sql` | ai_batch_job_logs: batch_plan_id, campaign_id, shard_id, log_level, error_code, attempt_number. |
| 11 | `20250306000049_content_dedupe_support.sql` | Content dedupe support (stem hash, registry extensions). |
| 12 | `20250306000050_blueprint_support.sql` | track_blueprint_targets, question difficulty metadata. |
| 13 | `20250306000051_enum_extensions.sql` | Enum extensions: content_status, admin_role_slug, ai_batch_job_status. **No data changes.** |
| 14 | `20250306000052_enum_backfills.sql` | Enum backfills: review→editor_review, archived→retired, admin_roles insert. **Must run after 051.** |
| 15 | `20250306000053_adaptive_and_ai_factory_seed.sql` | Seed adaptive configs, track_blueprint_targets, ai_generation_campaigns template. |
| 16 | `20250308000039_production_batch_pipeline.sql` | ai_batch_job_status queued/partial, ai_master_batches, idempotency, sharding. |
| 17 | `20250308000040_ai_campaigns.sql` | ai_campaigns table (24h orchestrator), campaign_id on ai_batch_jobs. |
| 18 | `20250308000041_ai_bulk_dead_letter.sql` | AI bulk dead letter / error handling (if present). |

---

## Dependency Graph

```
038 (adaptive_exam_engine)
  └── 040 (adaptive_exam_core) ── 041 (indexes) ── 042 (rls) ── 043 (seed)
  └── 044 (ai_factory_core) ── 045 (indexes) ── 046 (rls)
  └── 047 (batch_plan_hardening) [depends on 044 for campaign_id, shard_id]
  └── 048 (batch_plan_logs_hardening) [depends on 044, 047]
  └── 049 (content_dedupe_support)
  └── 050 (blueprint_support)
  └── 051 (enum_extensions) ── 052 (enum_backfills) [051 must precede 052]
  └── 053 (seed) [depends on 040, 044, 050]
  └── 20250308000039 (production_batch_pipeline)
  └── 20250308000040 (ai_campaigns)
  └── 20250308000041 (ai_bulk_dead_letter)
```

---

## Critical Ordering Rules

1. **051 before 052:** PostgreSQL disallows using newly added enum values in the same transaction as `ADD VALUE`. Backfills must run in a separate migration.
2. **044 before 047, 048:** batch_plan_hardening and batch_plan_logs_hardening reference ai_generation_campaigns and ai_generation_shards.
3. **040 before 043, 053:** Adaptive seed migrations insert into adaptive_exam_configs.

---

## Related Docs

| Doc | Purpose |
|-----|---------|
| `docs/SCHEMA_DISCOVERY_REPORT.md` | Enum values, column names, ON CONFLICT safety |
| `docs/SQL_MIGRATION_PATTERNS.md` | Safe patterns, enum safety |
| `docs/ENUM_SAFE_MIGRATION.md` | Why 051 and 052 are separate |
| `supabase/schema_inspection.sql` | Live DB verification queries |
