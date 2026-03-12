-- =============================================================================
-- Migration 052: Enum Backfills (Data Only)
-- =============================================================================
-- Must run AFTER 051 (enum extensions). PostgreSQL disallows using newly added
-- enum values in the same transaction as ADD VALUE.
-- Idempotent: safe to run multiple times; only affects rows with legacy values.
-- Ref: docs/ENUM_SAFE_MIGRATION.md, migration 031
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Migrate legacy content_status: review → editor_review
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'questions' AND column_name = 'status') THEN
    UPDATE questions SET status = 'editor_review'::content_status WHERE status = 'review';
  END IF;
END $$;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'study_guides') THEN
    UPDATE study_guides SET status = 'editor_review'::content_status WHERE status = 'review';
  END IF;
END $$;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'video_lessons') THEN
    UPDATE video_lessons SET status = 'editor_review'::content_status WHERE status = 'review';
  END IF;
END $$;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'flashcard_decks') THEN
    UPDATE flashcard_decks SET status = 'editor_review'::content_status WHERE status = 'review';
  END IF;
END $$;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'high_yield_content') THEN
    UPDATE high_yield_content SET status = 'editor_review'::content_status WHERE status = 'review';
  END IF;
END $$;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'content_reviews') THEN
    UPDATE content_reviews SET status = 'editor_review'::content_status WHERE status = 'review';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Migrate legacy content_status: archived → retired
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'questions' AND column_name = 'status') THEN
    UPDATE questions SET status = 'retired'::content_status WHERE status = 'archived';
  END IF;
END $$;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'study_guides') THEN
    UPDATE study_guides SET status = 'retired'::content_status WHERE status = 'archived';
  END IF;
END $$;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'video_lessons') THEN
    UPDATE video_lessons SET status = 'retired'::content_status WHERE status = 'archived';
  END IF;
END $$;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'flashcard_decks') THEN
    UPDATE flashcard_decks SET status = 'retired'::content_status WHERE status = 'archived';
  END IF;
END $$;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'high_yield_content') THEN
    UPDATE high_yield_content SET status = 'retired'::content_status WHERE status = 'archived';
  END IF;
END $$;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'content_reviews') THEN
    UPDATE content_reviews SET status = 'retired'::content_status WHERE status = 'archived';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Add review workflow admin roles (uses admin_role_slug from 051)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_roles') THEN
    INSERT INTO admin_roles (slug, name, description) VALUES
      ('sme_reviewer', 'SME Reviewer', 'Subject matter expert content review'),
      ('legal_reviewer', 'Legal Reviewer', 'Legal and copyright review'),
      ('qa_reviewer', 'QA Reviewer', 'Quality assurance review')
    ON CONFLICT (slug) DO NOTHING;
  END IF;
END $$;
