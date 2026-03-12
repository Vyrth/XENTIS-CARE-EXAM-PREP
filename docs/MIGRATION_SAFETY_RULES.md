# Migration Safety Rules

Rules for all future migrations in Xentis Care Exam Prep. Follow these to prevent schema mismatch errors and production failures.

---

## 1. Always Inspect Before Alter

- **Before writing any migration**, consult `docs/SCHEMA_DISCOVERY_REPORT.md`.
- Run `supabase/schema_inspection.sql` against the target database when possible.
- Do not assume column names, types, or constraints. Verify against the report or live schema.

---

## 2. Use IF EXISTS / IF NOT EXISTS

- **CREATE TABLE**: Prefer `CREATE TABLE IF NOT EXISTS` when the table may already exist (e.g., batch_plans, ai_batch_jobs).
- **CREATE INDEX**: Always use `CREATE INDEX IF NOT EXISTS` for indexes.
- **ADD COLUMN**: Use `ADD COLUMN IF NOT EXISTS` for new columns.
- **DROP**: Use `DROP ... IF EXISTS` when removing objects.

Example:
```sql
ALTER TABLE flashcard_decks
  ADD COLUMN IF NOT EXISTS deck_type TEXT DEFAULT 'standard';
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_status ON flashcard_decks(status);
```

---

## 3. ON CONFLICT Only With Real Unique Constraints

- **Never use ON CONFLICT** unless the table has a UNIQUE constraint or PRIMARY KEY on the conflict columns.
- See `docs/SCHEMA_DISCOVERY_REPORT.md` §5 for the ON CONFLICT safety table.

**Tables that CANNOT use ON CONFLICT** (no suitable unique constraint):
- study_material_sections
- flashcard_decks
- flashcards
- high_yield_content
- batch_plans
- content_reviews
- ai_batch_job_logs

**Tables that CAN use ON CONFLICT** (examples):
- exam_tracks ON CONFLICT (slug)
- systems ON CONFLICT (exam_track_id, slug)
- admin_roles ON CONFLICT (slug)
- content_type_review_config ON CONFLICT (content_type)

---

## 4. Enum Alterations: Separate Steps

PostgreSQL disallows using newly added enum values in the same transaction as `ADD VALUE`.

**Correct pattern:**
```sql
-- Migration A: Add enum value
ALTER TYPE content_status ADD VALUE IF NOT EXISTS 'published';

-- Migration B (separate): Use the value (UPDATE, INSERT, etc.)
UPDATE questions SET status = 'published' WHERE status = 'approved';
```

**Incorrect:**
```sql
-- Same migration: will fail
ALTER TYPE content_status ADD VALUE 'published';
UPDATE questions SET status = 'published' WHERE ...;  -- Error in same tx
```

Use `ADD VALUE IF NOT EXISTS` when available (PostgreSQL 9.1+).

---

## 5. Never Assume Column Names

- **Do not assume** `code`, `sort_order`, `is_active` exist. They do not in this schema.
- **Use** `display_order` for ordering (not `sort_order`).
- **Use** `slug` or `id` for identifiers (not `code`).
- **Use** `status` for workflow state (not `is_active`).

Verify in SCHEMA_DISCOVERY_REPORT.md before referencing any column.

---

## 6. Prefer Additive Migrations

- Prefer adding columns/tables over modifying or dropping.
- When changing column types, use a multi-step approach:
  1. Add new column
  2. Backfill data
  3. Migrate application to use new column
  4. (Optional) Drop old column in a later migration

---

## 7. Idempotent Seeds

- All seed scripts must be idempotent (safe to run multiple times).
- Use `ON CONFLICT ... DO NOTHING` where a unique constraint exists.
- Use `WHERE NOT EXISTS` for tables without suitable unique constraints.

Example (study_material_sections has no UNIQUE):
```sql
INSERT INTO study_material_sections (study_guide_id, slug, title, content_markdown, display_order)
SELECT sg.id, 'key-concepts', 'Key Concepts', '...', 1
FROM study_guides sg
WHERE NOT EXISTS (SELECT 1 FROM study_material_sections sms WHERE sms.study_guide_id = sg.id AND sms.slug = 'key-concepts');
```

Example (admin_roles has UNIQUE on slug):
```sql
INSERT INTO admin_roles (slug, name, description) VALUES
  ('super_admin', 'Super Admin', 'Full platform access')
ON CONFLICT (slug) DO NOTHING;
```

---

## 8. Naming Conventions to Follow

| Convention | Rule |
|------------|------|
| Ordering | `display_order` (INT, default 0) |
| Identifiers | `slug` (TEXT or enum), `id` (UUID PK) |
| Timestamps | `created_at`, `updated_at` (TIMESTAMPTZ) |
| Status | `status` (content_status or similar enum) |
| Track reference | `exam_track_id` (UUID FK to exam_tracks) |
| Table names | `snake_case` |
| Index names | `idx_<table>_<column(s)>` |
| Constraint names | `uq_<table>_<columns>` or `fk_<table>_<ref>` |

---

## 9. Checklist Before Creating a Migration

- [ ] Consulted SCHEMA_DISCOVERY_REPORT.md
- [ ] Used IF EXISTS / IF NOT EXISTS where appropriate
- [ ] Verified ON CONFLICT usage against a real unique constraint
- [ ] Separated enum ADD VALUE from UPDATE/INSERT that uses the new value
- [ ] Did not assume code, sort_order, or is_active
- [ ] Used display_order for ordering
- [ ] Migration is additive where possible
- [ ] Seeds are idempotent
