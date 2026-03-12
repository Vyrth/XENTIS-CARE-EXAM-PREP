-- =============================================================================
-- Migration 027: Content Review Workflow
-- =============================================================================
-- Multi-lane review pipeline: editorial, SME, legal, QA, publish.
-- Review notes, required checks per stage, publish gating.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Extend content_status enum with full workflow values
-- -----------------------------------------------------------------------------
ALTER TYPE content_status ADD VALUE IF NOT EXISTS 'editor_review';
ALTER TYPE content_status ADD VALUE IF NOT EXISTS 'sme_review';
ALTER TYPE content_status ADD VALUE IF NOT EXISTS 'legal_review';
ALTER TYPE content_status ADD VALUE IF NOT EXISTS 'qa_review';
ALTER TYPE content_status ADD VALUE IF NOT EXISTS 'published';
ALTER TYPE content_status ADD VALUE IF NOT EXISTS 'retired';
ALTER TYPE content_status ADD VALUE IF NOT EXISTS 'needs_revision';

-- -----------------------------------------------------------------------------
-- Extend admin_role_slug for review lanes
-- -----------------------------------------------------------------------------
ALTER TYPE admin_role_slug ADD VALUE IF NOT EXISTS 'sme_reviewer';
ALTER TYPE admin_role_slug ADD VALUE IF NOT EXISTS 'legal_reviewer';
ALTER TYPE admin_role_slug ADD VALUE IF NOT EXISTS 'qa_reviewer';

-- -----------------------------------------------------------------------------
-- content_review_notes
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS content_review_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  role_slug TEXT NOT NULL,
  content TEXT NOT NULL,
  action TEXT,
  from_status TEXT,
  to_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_review_notes_entity ON content_review_notes(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_content_review_notes_author ON content_review_notes(author_id);
CREATE INDEX IF NOT EXISTS idx_content_review_notes_created ON content_review_notes(created_at DESC);

-- -----------------------------------------------------------------------------
-- content_review_checks (required approvals per stage)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS content_review_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  stage_slug TEXT NOT NULL,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  checked_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes TEXT,
  CONSTRAINT uq_content_review_checks_entity_stage UNIQUE(entity_type, entity_id, stage_slug)
);

CREATE INDEX IF NOT EXISTS idx_content_review_checks_entity ON content_review_checks(entity_type, entity_id);

-- -----------------------------------------------------------------------------
-- content_type_review_config (which stages are required per content type)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS content_type_review_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL UNIQUE,
  requires_editor BOOLEAN NOT NULL DEFAULT true,
  requires_sme BOOLEAN NOT NULL DEFAULT true,
  requires_legal BOOLEAN NOT NULL DEFAULT true,
  requires_qa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO content_type_review_config (content_type, requires_editor, requires_sme, requires_legal, requires_qa)
VALUES
  ('question', true, true, true, true),
  ('study_guide', true, true, true, true),
  ('video', true, true, true, true),
  ('flashcard_deck', true, true, false, true),
  ('high_yield_content', true, true, false, true)
ON CONFLICT (content_type) DO NOTHING;
