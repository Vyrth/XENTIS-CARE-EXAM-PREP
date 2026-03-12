-- =============================================================================
-- Migration Helper Snippets (Reference Only)
-- =============================================================================
-- Copy-paste into migrations as needed. Do NOT run this file automatically.
-- See docs/SQL_MIGRATION_PATTERNS.md for full documentation.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. CREATE TABLE IF NOT EXISTS
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 2. ALTER TABLE ADD COLUMN IF NOT EXISTS
-- -----------------------------------------------------------------------------
ALTER TABLE flashcard_decks
  ADD COLUMN IF NOT EXISTS deck_type TEXT DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS status content_status DEFAULT 'draft';
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_status ON flashcard_decks(status) WHERE status IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 3. CREATE INDEX IF NOT EXISTS
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_questions_exam_track ON questions(exam_track_id);
CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);
CREATE INDEX IF NOT EXISTS idx_questions_system ON questions(system_id) WHERE system_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 4. CREATE POLICY ONLY IF MISSING (pg_policies check)
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 5. ADD ENUM VALUE SAFELY (separate migration for data updates)
-- -----------------------------------------------------------------------------
ALTER TYPE content_status ADD VALUE IF NOT EXISTS 'published';
ALTER TYPE admin_role_slug ADD VALUE IF NOT EXISTS 'sme_reviewer';

-- -----------------------------------------------------------------------------
-- 6. BACKFILL (run in separate migration after enum extension)
-- -----------------------------------------------------------------------------
-- UPDATE questions SET status = 'editor_review' WHERE status = 'review';
-- UPDATE study_guides SET status = 'editor_review' WHERE status = 'review';
-- UPDATE video_lessons SET status = 'editor_review' WHERE status = 'review';
-- UPDATE flashcard_decks SET status = 'editor_review' WHERE status = 'review';
-- UPDATE high_yield_content SET status = 'editor_review' WHERE status = 'review';

-- -----------------------------------------------------------------------------
-- 7. CHECK UNIQUE CONSTRAINT EXISTS (before ON CONFLICT)
-- -----------------------------------------------------------------------------
-- Run this query to verify:
SELECT tc.constraint_name, tc.constraint_type, kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'study_guides'
  AND tc.constraint_type IN ('UNIQUE', 'PRIMARY KEY')
ORDER BY kcu.ordinal_position;

-- -----------------------------------------------------------------------------
-- 8. INSERT WITH ON CONFLICT (only when unique constraint exists)
-- -----------------------------------------------------------------------------
INSERT INTO admin_roles (slug, name, description) VALUES
  ('super_admin', 'Super Admin', 'Full platform access')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO systems (exam_track_id, slug, name, description, display_order)
SELECT et.id, 'cardiovascular', 'Cardiovascular', 'Heart and circulation', 1
FROM exam_tracks et WHERE et.slug = 'rn'
ON CONFLICT (exam_track_id, slug) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 9. INSERT WITH WHERE NOT EXISTS (when no unique constraint)
-- -----------------------------------------------------------------------------
INSERT INTO study_material_sections (study_guide_id, slug, title, content_markdown, display_order)
SELECT sg.id, 'key-concepts', 'Key Concepts', '...', 1
FROM study_guides sg
WHERE NOT EXISTS (
  SELECT 1 FROM study_material_sections sms
  WHERE sms.study_guide_id = sg.id AND sms.slug = 'key-concepts'
);

-- -----------------------------------------------------------------------------
-- 10. CHECK TABLE EXISTS BEFORE INSERT
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_roles') THEN
    INSERT INTO admin_roles (slug, name, description) VALUES
      ('super_admin', 'Super Admin', 'Full platform access')
    ON CONFLICT (slug) DO NOTHING;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 11. CHECK COLUMN EXISTS BEFORE UPDATE
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 12. CHECK CONSTRAINT EXISTS (pg_constraint)
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 13. CHECK INDEX EXISTS (pg_indexes)
-- -----------------------------------------------------------------------------
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'questions';

-- -----------------------------------------------------------------------------
-- 14. DROP POLICY IF EXISTS + CREATE POLICY
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Old policy name" ON my_table;
CREATE POLICY "New policy name"
  ON my_table FOR SELECT
  USING (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 15. EXPLICIT ENUM CAST (when joining/comparing)
-- -----------------------------------------------------------------------------
SELECT * FROM exam_tracks WHERE slug = 'rn'::exam_track_slug;
SELECT * FROM high_yield_content WHERE content_type = 'common_confusion'::high_yield_content_type;
INSERT INTO high_yield_content (..., confusion_frequency) VALUES (..., 'common'::confusion_frequency);
