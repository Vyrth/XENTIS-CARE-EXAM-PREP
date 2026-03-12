# SQL Migration Patterns

Standardized safe migration patterns for Xentis Care Exam Prep. Use these before building the adaptive engine and AI content pipeline.

**Related:** `docs/SCHEMA_DISCOVERY_REPORT.md`, `docs/MIGRATION_SAFETY_RULES.md`, `supabase/sql/_migration_helpers.sql`

---

## 1. Safe Templates

### 1.1 Create Table If Not Exists

```sql
CREATE TABLE IF NOT EXISTS my_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_track_id UUID NOT NULL REFERENCES exam_tracks(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  status content_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(exam_track_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_my_table_track ON my_table(exam_track_id);
```

**Rules:** Use `IF NOT EXISTS`. Include `display_order` (not `sort_order`). Use `slug`/`id` (not `code`).

---

### 1.2 Alter Table Add Column If Not Exists

```sql
ALTER TABLE flashcard_decks
  ADD COLUMN IF NOT EXISTS deck_type TEXT DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS status content_status DEFAULT 'draft';

CREATE INDEX IF NOT EXISTS idx_flashcard_decks_status ON flashcard_decks(status) WHERE status IS NOT NULL;
```

**Rules:** Always use `ADD COLUMN IF NOT EXISTS`. Add indexes separately with `IF NOT EXISTS`.

---

### 1.3 Create Index If Not Exists

```sql
CREATE INDEX IF NOT EXISTS idx_questions_exam_track ON questions(exam_track_id);
CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);
CREATE INDEX IF NOT EXISTS idx_questions_system ON questions(system_id) WHERE system_id IS NOT NULL;
```

**Rules:** Always use `IF NOT EXISTS`. Use partial indexes (`WHERE ...`) for nullable FKs when appropriate.

---

### 1.4 Create Policy Only If Missing

Use `pg_policies` to check before creating:

```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'my_table'
      AND policyname = 'Users can view own rows'
  ) THEN
    CREATE POLICY "Users can view own rows"
      ON my_table FOR SELECT
      USING (user_id = auth.uid());
  END IF;
END $$;
```

See §3 for full policy patterns.

---

### 1.5 Create Enum Value Safely

```sql
-- Add value only if it does not exist (PostgreSQL 9.1+)
ALTER TYPE content_status ADD VALUE IF NOT EXISTS 'published';
ALTER TYPE admin_role_slug ADD VALUE IF NOT EXISTS 'sme_reviewer';
```

**Critical:** Do NOT use the newly added enum value in the same migration. Split into:
- **Migration A:** `ALTER TYPE ... ADD VALUE IF NOT EXISTS 'new_value';`
- **Migration B:** `UPDATE ... SET status = 'new_value' WHERE ...;` or `INSERT ... VALUES ('new_value', ...);`

---

### 1.6 Backfill Using Follow-Up Migration

**Migration 1 (enum extension):**
```sql
ALTER TYPE content_status ADD VALUE IF NOT EXISTS 'editor_review';
ALTER TYPE content_status ADD VALUE IF NOT EXISTS 'retired';
```

**Migration 2 (backfill — separate file):**
```sql
-- Migrate legacy 'review' to 'editor_review'
UPDATE questions SET status = 'editor_review' WHERE status = 'review';
UPDATE study_guides SET status = 'editor_review' WHERE status = 'review';
UPDATE video_lessons SET status = 'editor_review' WHERE status = 'review';
UPDATE flashcard_decks SET status = 'editor_review' WHERE status = 'review';
UPDATE high_yield_content SET status = 'editor_review' WHERE status = 'review';

-- Migrate 'archived' to 'retired'
UPDATE questions SET status = 'retired' WHERE status = 'archived';
-- ... repeat for other tables
```

---

### 1.7 Checking for Unique Constraints Before ON CONFLICT

Before using `ON CONFLICT`, verify a unique constraint exists:

```sql
-- Query to check: does (exam_track_id, slug) have a unique constraint?
SELECT tc.constraint_name, tc.constraint_type, kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'study_guides'
  AND tc.constraint_type IN ('UNIQUE', 'PRIMARY KEY')
ORDER BY kcu.ordinal_position;
```

**Tables with ON CONFLICT support:** See `docs/SCHEMA_DISCOVERY_REPORT.md` §5.

**Tables without:** study_material_sections, flashcard_decks, flashcards, high_yield_content, batch_plans, content_reviews, ai_batch_job_logs.

---

### 1.8 Checking Table Existence Before Inserts

```sql
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_roles') THEN
    INSERT INTO admin_roles (slug, name, description) VALUES
      ('super_admin', 'Super Admin', 'Full platform access'),
      ('content_editor', 'Content Editor', 'Edit content')
    ON CONFLICT (slug) DO NOTHING;
  END IF;
END $$;
```

---

### 1.9 Checking Column Existence Before Updates

```sql
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'questions'
      AND column_name = 'status'
  ) THEN
    UPDATE questions SET status = 'editor_review' WHERE status = 'review';
  END IF;
END $$;
```

---

## 2. Enum Safety in PostgreSQL

### 2.1 Why Split Migrations?

PostgreSQL does not allow using a newly added enum value in the same transaction as `ALTER TYPE ... ADD VALUE`. The new value is not visible until the transaction commits.

### 2.2 Recommended Pattern

| Step | Migration | Content |
|------|-----------|---------|
| 1 | `20250306000027_enum_extension.sql` | `ALTER TYPE content_status ADD VALUE IF NOT EXISTS 'published';` |
| 2 | `20250306000028_enum_backfill.sql` | `UPDATE questions SET status = 'published' WHERE status = 'approved';` |

### 2.3 Unsafe (Do Not Do)

```sql
-- BAD: Same transaction
ALTER TYPE content_status ADD VALUE 'published';
UPDATE questions SET status = 'published' WHERE status = 'approved';  -- Fails: type not yet committed
```

### 2.4 Safe Alternative: Use IF NOT EXISTS

`ADD VALUE IF NOT EXISTS` is idempotent. Running the enum migration twice is safe.

```sql
ALTER TYPE content_status ADD VALUE IF NOT EXISTS 'published';
-- Separate migration file for UPDATE
```

---

## 3. Safe Policy Creation (pg_policies)

### 3.1 Check Before Create

```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'flashcard_decks'
      AND policyname = 'Users can view platform and own decks'
  ) THEN
    CREATE POLICY "Users can view platform and own decks"
      ON flashcard_decks FOR SELECT
      USING (user_id IS NULL OR user_id = auth.uid());
  END IF;
END $$;
```

### 3.2 Drop and Recreate (When Policy Logic Changes)

```sql
DROP POLICY IF EXISTS "Old policy name" ON my_table;
CREATE POLICY "New policy name"
  ON my_table FOR SELECT
  USING (user_id = auth.uid());
```

### 3.3 List Existing Policies

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'flashcard_decks';
```

---

## 4. Safe Constraint Checks (pg_constraint, pg_indexes)

### 4.1 Check Unique Constraint Exists

```sql
SELECT conname, contype, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.study_guides'::regclass
  AND contype IN ('u', 'p');  -- u=unique, p=primary
```

### 4.2 Check Index Exists

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'questions';
```

### 4.3 Conditional Unique Constraint

```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.my_table'::regclass
      AND conname = 'uq_my_table_track_slug'
  ) THEN
    ALTER TABLE my_table ADD CONSTRAINT uq_my_table_track_slug UNIQUE (exam_track_id, slug);
  END IF;
END $$;
```

### 4.4 Conditional Foreign Key

```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.ai_generation_audit'::regclass
      AND conname = 'ai_generation_audit_batch_job_id_fkey'
  ) THEN
    ALTER TABLE ai_generation_audit
      ADD COLUMN IF NOT EXISTS batch_job_id UUID REFERENCES ai_batch_jobs(id) ON DELETE SET NULL;
  END IF;
END $$;
```

---

## 5. Do Not Do This

### 5.1 Using sort_order When Table Has display_order

```sql
-- BAD
INSERT INTO systems (exam_track_id, slug, name, sort_order) VALUES (...);
SELECT * FROM study_guides ORDER BY sort_order;

-- GOOD
INSERT INTO systems (exam_track_id, slug, name, display_order) VALUES (...);
SELECT * FROM study_guides ORDER BY display_order;
```

**Rule:** All Xentis tables use `display_order`. Never assume `sort_order`.

---

### 5.2 Inserting Into question_types(code, ...) When code Does Not Exist

```sql
-- BAD
INSERT INTO question_types (code, name, display_order) VALUES ('sba', 'Single Best Answer', 1);

-- GOOD
INSERT INTO question_types (slug, name, display_order) VALUES ('single_best_answer', 'Single Best Answer', 1)
ON CONFLICT (slug) DO NOTHING;
```

**Rule:** `question_types` has `slug` (question_type_slug enum), not `code`. See SCHEMA_DISCOVERY_REPORT.md.

---

### 5.3 Joining Enum Column to Text Without Explicit Cast

```sql
-- BAD (can fail or behave unexpectedly)
SELECT * FROM exam_tracks WHERE slug = some_text_variable;
-- If some_text_variable is TEXT and slug is exam_track_slug enum

-- GOOD
SELECT * FROM exam_tracks WHERE slug = some_text_variable::exam_track_slug;
-- Or ensure variable is already typed
```

**Rule:** When comparing enum columns to variables or literals, cast explicitly: `::exam_track_slug`, `::content_status`, etc.

---

### 5.4 Using ON CONFLICT Without a Supporting Unique Constraint

```sql
-- BAD (study_material_sections has NO unique on study_guide_id, slug)
INSERT INTO study_material_sections (study_guide_id, slug, title, content_markdown, display_order)
VALUES (...)
ON CONFLICT (study_guide_id, slug) DO NOTHING;  -- Fails: no such constraint

-- GOOD
INSERT INTO study_material_sections (study_guide_id, slug, title, content_markdown, display_order)
SELECT sg.id, 'key-concepts', 'Key Concepts', '...', 1
FROM study_guides sg
WHERE NOT EXISTS (
  SELECT 1 FROM study_material_sections sms
  WHERE sms.study_guide_id = sg.id AND sms.slug = 'key-concepts'
);
```

**Rule:** Verify unique constraint exists before ON CONFLICT. See SCHEMA_DISCOVERY_REPORT.md §5.

---

### 5.5 Using Integer for Enum Column Values (e.g. confusion_frequency)

```sql
-- BAD (confusion_frequency is confusion_frequency enum: 'common', 'very_common', 'extremely_common')
INSERT INTO high_yield_content (..., confusion_frequency) VALUES (..., 1);

-- GOOD
INSERT INTO high_yield_content (..., confusion_frequency) VALUES (..., 'common');
-- Or
INSERT INTO high_yield_content (..., confusion_frequency) VALUES (..., 'very_common'::confusion_frequency);
```

**Rule:** `confusion_frequency` is an enum. Use string values, not integers. Same for `content_status`, `admin_role_slug`, `high_yield_content_type`, etc.

---

### 5.6 Assuming is_active Column

```sql
-- BAD
SELECT * FROM batch_plans WHERE is_active = true;

-- GOOD (use status or omit)
SELECT * FROM batch_plans WHERE status = 'planned';
```

**Rule:** No table has `is_active`. Use `status` or omit.

---

## 6. Quick Reference

| Operation | Pattern |
|-----------|---------|
| Create table | `CREATE TABLE IF NOT EXISTS` |
| Add column | `ADD COLUMN IF NOT EXISTS` |
| Create index | `CREATE INDEX IF NOT EXISTS` |
| Add enum value | `ALTER TYPE x ADD VALUE IF NOT EXISTS 'y'` (separate migration for data) |
| Create policy | Check `pg_policies` first, then `CREATE POLICY` |
| ON CONFLICT | Only when UNIQUE/PRIMARY KEY exists |
| Ordering column | `display_order` |
| Identifier column | `slug` or `id` (not `code`) |
