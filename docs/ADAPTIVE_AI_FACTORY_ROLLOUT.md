# Adaptive Engine + AI Factory Rollout Guide

**Purpose:** Step-by-step rollout, verification, and troubleshooting for the adaptive + AI factory migration stack.

**Prerequisite:** Read `docs/ADAPTIVE_AI_FACTORY_MIGRATION_MANIFEST.md` for migration order.

---

## 1. Local Dry Run

See **[Local vs Remote Supabase Commands](LOCAL_VS_REMOTE_SUPABASE.md)** to avoid mixing workflows.

### 1.1 Reset and replay (destructive)

```bash
# WARNING: Destroys local DB only. Use only for testing.
npm run db:local:migrate   # or: npx supabase db reset
```

This replays all migrations from scratch. Verify no errors in output.

### 1.2 Lint migrations

```bash
npx supabase db lint
```

Resolve any reported issues before pushing.

### 1.3 Diff against remote (if linked)

```bash
npx supabase db diff --linked
```

Review schema drift. Ensure remote has no conflicting manual changes.

---

## 2. Run Migrations (remote — supabase db push)

### 2.1 Link project (if not already)

```bash
npx supabase link --project-ref <your-project-ref>
```

### 2.2 Push migrations to remote

```bash
npm run db:remote:push   # or: npx supabase db push
```

- Applies only **pending** migrations (not yet in `supabase_migrations`).
- Runs in a single transaction per migration.
- If any migration fails, that migration is not recorded; you must fix and re-push.

### 2.3 Alternative: Migrate via Supabase Dashboard

1. Open **SQL Editor** in Supabase Dashboard.
2. Run each pending migration file manually in order (see manifest).
3. **Not recommended** for production—use `db push` for atomic application.

---

## 3. Verify Tables

```sql
-- Tables that must exist after rollout
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'adaptive_exam_configs',
    'question_calibration',
    'adaptive_exam_sessions',
    'adaptive_exam_items',
    'adaptive_exam_blueprint_progress',
    'ai_generation_campaigns',
    'ai_generation_shards',
    'content_dedupe_registry',
    'track_blueprint_targets',
    'ai_master_batches',
    'ai_campaigns',
    'ai_generation_idempotency'
  )
ORDER BY table_name;
```

Expected: 12 rows (or fewer if some migrations not yet applied).

---

## 4. Verify Columns

### 4.1 batch_plans

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'batch_plans'
  AND column_name IN (
    'campaign_id', 'shard_id', 'content_type', 'shard_key',
    'target_count', 'generated_count', 'saved_count', 'failed_count',
    'duplicate_count', 'retry_count', 'started_at', 'completed_at', 'last_error'
  )
ORDER BY column_name;
```

Expected: All listed columns present.

### 4.2 ai_batch_job_logs

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'ai_batch_job_logs'
  AND column_name IN (
    'batch_job_id', 'batch_plan_id', 'campaign_id', 'shard_id',
    'log_level', 'error_code', 'attempt_number'
  )
ORDER BY column_name;
```

Expected: All listed columns present.

### 4.3 ai_batch_jobs

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'ai_batch_jobs'
  AND column_name IN ('queued', 'partial', 'idempotency_key', 'master_batch_id', 'shard_key');
```

Note: `queued` and `partial` are enum values in `ai_batch_job_status`, not columns. Verify via:

```sql
SELECT enumlabel FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ai_batch_job_status')
ORDER BY enumsortorder;
```

Expected enum values: `pending`, `running`, `completed`, `failed`, `cancelled`, `queued`, `partial`.

---

## 5. Verify Policies

### 5.1 List RLS policies on new tables

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'adaptive_exam_configs',
    'adaptive_exam_sessions',
    'adaptive_exam_items',
    'question_calibration',
    'ai_generation_campaigns',
    'ai_generation_shards'
  )
ORDER BY tablename, policyname;
```

### 5.2 No duplicate policy names

```sql
SELECT policyname, COUNT(*) AS cnt
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY policyname
HAVING COUNT(*) > 1;
```

Expected: 0 rows (no duplicates).

---

## 6. Verify Seed Rows

### 6.1 Adaptive configs per track

```sql
SELECT et.slug, et.name, aec.slug AS config_slug, aec.min_questions, aec.max_questions
FROM exam_tracks et
LEFT JOIN adaptive_exam_configs aec ON aec.exam_track_id = et.id
WHERE et.slug IN ('rn', 'fnp', 'pmhnp', 'lvn')
ORDER BY et.slug;
```

Expected: 4 rows, each with a matching config (e.g. `rn-cat`, `fnp-cat`, etc.).

### 6.2 track_blueprint_targets

```sql
SELECT exam_track_id, content_type, target_count
FROM track_blueprint_targets
WHERE domain_id IS NULL AND system_id IS NULL AND topic_id IS NULL
ORDER BY exam_track_id, content_type;
```

Expected: Up to 16 rows (4 tracks × 4 content types: question, study_guide, flashcard_deck, high_yield).

### 6.3 AI campaign template

```sql
SELECT id, name, status
FROM ai_generation_campaigns
WHERE name = '24-hour launch campaign template';
```

Expected: 1 row, `status = 'draft'`.

---

## 7. Rollback Considerations

### 7.1 No automatic rollback

Supabase does not provide automatic rollback. Once a migration is applied, it is recorded in `supabase_migrations.schema_migrations`.

### 7.2 Manual rollback (last resort)

1. **Create a reverse migration** that:
   - Drops new tables (in reverse dependency order)
   - Removes new columns
   - Drops new policies
   - Reverts enum values (PostgreSQL does not support removing enum values easily—avoid if possible)

2. **Restore from backup** if the migration caused data loss or corruption.

### 7.3 Safe migrations

Migrations 038–053 are designed to be additive:
- `CREATE TABLE IF NOT EXISTS`
- `ADD COLUMN IF NOT EXISTS`
- `ADD VALUE IF NOT EXISTS` for enums
- `WHERE NOT EXISTS` for seeds

Rollback is rarely needed if migrations are idempotent.

---

## 8. Inspect Failed Migrations

### 8.1 Check migration history

```sql
SELECT version, name
FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 20;
```

### 8.2 Identify last successful migration

The last row in `schema_migrations` is the last successfully applied migration. The next file in the manifest is the one that failed.

### 8.3 Common failure causes

| Error | Cause | Fix |
|-------|-------|-----|
| `relation "X" does not exist` | Migration order wrong or dependency missing | Ensure prerequisite migrations ran |
| `column "Y" of relation "X" already exists` | Migration re-run or duplicate | Use `ADD COLUMN IF NOT EXISTS`; migration may be safe to skip |
| `unsafe use of new value "Z" of enum` | Enum value used in same migration as ADD VALUE | Split: one migration for ADD VALUE, next for data changes |
| `duplicate key value violates unique constraint` | Seed conflict | Use `WHERE NOT EXISTS` or `ON CONFLICT DO NOTHING` |

### 8.4 Repair and re-push

1. Fix the failing migration file (or create a repair migration).
2. If the failed migration was partially applied, you may need to manually undo partial changes before re-pushing.
3. Run `npm run db:remote:push` again.

---

## 9. Avoid Rerunning Unsafe SQL Manually

### 9.1 Do NOT manually run

- `UPDATE ... SET status = 'editor_review'` in the same session as `ALTER TYPE content_status ADD VALUE`
- `INSERT INTO admin_roles` for new enum values before the enum extension migration has committed
- Any migration that uses newly added enum values in the same transaction as `ADD VALUE`

### 9.2 Safe manual fixes

- `CREATE INDEX IF NOT EXISTS` — idempotent
- `ADD COLUMN IF NOT EXISTS` — idempotent
- `INSERT ... WHERE NOT EXISTS` — idempotent
- `INSERT ... ON CONFLICT DO NOTHING` — idempotent (only when unique constraint exists)

### 9.3 Always use migrations

Prefer creating a new migration file to fix issues rather than running ad-hoc SQL. This keeps the schema history consistent.

---

## 10. Post-Migration Verification Checklist

Run the following and record results:

### 10.1 Select counts from new tables

```sql
SELECT 'adaptive_exam_configs' AS tbl, COUNT(*) AS cnt FROM adaptive_exam_configs
UNION ALL
SELECT 'question_calibration', COUNT(*) FROM question_calibration
UNION ALL
SELECT 'adaptive_exam_sessions', COUNT(*) FROM adaptive_exam_sessions
UNION ALL
SELECT 'ai_generation_campaigns', COUNT(*) FROM ai_generation_campaigns
UNION ALL
SELECT 'ai_generation_shards', COUNT(*) FROM ai_generation_shards
UNION ALL
SELECT 'track_blueprint_targets', COUNT(*) FROM track_blueprint_targets
UNION ALL
SELECT 'content_dedupe_registry', COUNT(*) FROM content_dedupe_registry;
```

### 10.2 Verify configs per track

```sql
SELECT et.slug, COUNT(aec.id) AS config_count
FROM exam_tracks et
LEFT JOIN adaptive_exam_configs aec ON aec.exam_track_id = et.id
WHERE et.slug IN ('rn', 'fnp', 'pmhnp', 'lvn')
GROUP BY et.slug;
```

Expected: Each track has 1 config.

### 10.3 Verify indexes exist

```sql
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'adaptive_exam_configs', 'adaptive_exam_sessions', 'adaptive_exam_items',
    'ai_generation_campaigns', 'ai_generation_shards', 'track_blueprint_targets'
  )
ORDER BY tablename, indexname;
```

### 10.4 Verify no duplicate policy names

```sql
SELECT policyname, COUNT(*) FROM pg_policies
WHERE schemaname = 'public' GROUP BY policyname HAVING COUNT(*) > 1;
```

Expected: 0 rows.

### 10.5 Verify batch_plans includes generated_count, saved_count, etc.

```sql
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'batch_plans'
  AND column_name IN ('generated_count', 'saved_count', 'failed_count', 'campaign_id', 'shard_id');
```

Expected: 5 rows.

### 10.6 Verify ai_batch_job_logs includes batch_plan_id, campaign_id, shard_id

```sql
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'ai_batch_job_logs'
  AND column_name IN ('batch_plan_id', 'campaign_id', 'shard_id');
```

Expected: 3 rows.

---

## Checklist Summary

| # | Check | Query / Action |
|---|-------|----------------|
| 1 | Table counts | `SELECT COUNT(*)` from new tables |
| 2 | Configs per track | 4 tracks × 1 config each |
| 3 | Indexes exist | `pg_indexes` for new tables |
| 4 | No duplicate policies | `pg_policies` GROUP BY policyname |
| 5 | batch_plans columns | generated_count, saved_count, campaign_id, shard_id |
| 6 | ai_batch_job_logs columns | batch_plan_id, campaign_id, shard_id |
| 7 | Seed: 24h template | 1 row in ai_generation_campaigns |
| 8 | Seed: blueprint targets | Up to 16 track-level rows |
