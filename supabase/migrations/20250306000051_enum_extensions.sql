-- =============================================================================
-- Migration 051: Safe Enum Extensions (Idempotent)
-- =============================================================================
-- Consolidation pack for adaptive engine and AI content factory.
-- Adds only values that may be missing (e.g. migrations run out of order).
-- Uses ADD VALUE IF NOT EXISTS or safe PL/pgSQL. No data changes.
-- Ref: docs/SCHEMA_DISCOVERY_REPORT.md, docs/ENUM_SAFE_MIGRATION.md
-- =============================================================================

-- -----------------------------------------------------------------------------
-- content_status (workflow values from migration 027)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_status') THEN
    ALTER TYPE content_status ADD VALUE IF NOT EXISTS 'editor_review';
    ALTER TYPE content_status ADD VALUE IF NOT EXISTS 'sme_review';
    ALTER TYPE content_status ADD VALUE IF NOT EXISTS 'legal_review';
    ALTER TYPE content_status ADD VALUE IF NOT EXISTS 'qa_review';
    ALTER TYPE content_status ADD VALUE IF NOT EXISTS 'published';
    ALTER TYPE content_status ADD VALUE IF NOT EXISTS 'retired';
    ALTER TYPE content_status ADD VALUE IF NOT EXISTS 'needs_revision';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- admin_role_slug (review workflow roles from migration 027)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_role_slug') THEN
    ALTER TYPE admin_role_slug ADD VALUE IF NOT EXISTS 'sme_reviewer';
    ALTER TYPE admin_role_slug ADD VALUE IF NOT EXISTS 'legal_reviewer';
    ALTER TYPE admin_role_slug ADD VALUE IF NOT EXISTS 'qa_reviewer';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- ai_batch_job_status (queued, partial from migration 039)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ai_batch_job_status') THEN
    BEGIN
      ALTER TYPE ai_batch_job_status ADD VALUE 'queued';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE ai_batch_job_status ADD VALUE 'partial';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- high_yield_content_type: no extension needed
-- Migration 025 creates type with: high_yield_summary, common_confusion,
-- board_trap, compare_contrast_summary. All app usage matches. No new values.
-- -----------------------------------------------------------------------------
