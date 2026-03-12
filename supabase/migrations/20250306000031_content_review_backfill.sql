-- =============================================================================
-- Migration 031: Content Review Backfill
-- =============================================================================
-- Backfill legacy statuses after new enum values exist (migration 027).
-- Must run in separate migration: PostgreSQL disallows using newly added
-- enum values in the same transaction as ADD VALUE.
-- =============================================================================

-- Migrate legacy 'review' to 'editor_review'
UPDATE questions SET status = 'editor_review' WHERE status = 'review';
UPDATE study_guides SET status = 'editor_review' WHERE status = 'review';
UPDATE video_lessons SET status = 'editor_review' WHERE status = 'review';
UPDATE flashcard_decks SET status = 'editor_review' WHERE status = 'review';
UPDATE high_yield_content SET status = 'editor_review' WHERE status = 'review';

-- Migrate 'archived' to 'retired'
UPDATE questions SET status = 'retired' WHERE status = 'archived';
UPDATE study_guides SET status = 'retired' WHERE status = 'archived';
UPDATE video_lessons SET status = 'retired' WHERE status = 'archived';
UPDATE flashcard_decks SET status = 'retired' WHERE status = 'archived';
UPDATE high_yield_content SET status = 'retired' WHERE status = 'archived';

-- Add new admin roles (uses admin_role_slug enum values added in migration 027)
INSERT INTO admin_roles (slug, name, description) VALUES
  ('sme_reviewer', 'SME Reviewer', 'Subject matter expert content review'),
  ('legal_reviewer', 'Legal Reviewer', 'Legal and copyright review'),
  ('qa_reviewer', 'QA Reviewer', 'Quality assurance review')
ON CONFLICT (slug) DO NOTHING;
