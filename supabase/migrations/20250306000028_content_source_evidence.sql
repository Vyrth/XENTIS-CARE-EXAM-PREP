-- =============================================================================
-- Migration 028: Content Source Evidence
-- =============================================================================
-- Per-content provenance: original, licensed, internal, legal status.
-- Supports copyright-safe production and publish gating.
-- Legal metadata is internal-only (never exposed to learner APIs).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- content_source_evidence
-- -----------------------------------------------------------------------------
-- One row per content entity. Tracks source basis and legal status.
CREATE TABLE IF NOT EXISTS content_source_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  -- Source basis: how was this content created?
  source_basis TEXT NOT NULL DEFAULT 'pending' CHECK (source_basis IN ('original', 'licensed', 'internal', 'pending')),
  -- Legal status: cleared for publish?
  legal_status TEXT NOT NULL DEFAULT 'pending_legal' CHECK (legal_status IN ('original', 'adapted', 'pending_legal', 'blocked')),
  -- Internal-only: never exposed to learners
  legal_notes TEXT,
  -- For videos: link to media rights record (when media_rights table exists)
  media_rights_id UUID,
  -- Author/attribution for original content
  author_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_content_source_evidence_content UNIQUE(content_type, content_id)
);

CREATE INDEX IF NOT EXISTS idx_content_source_evidence_content ON content_source_evidence(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_content_source_evidence_legal ON content_source_evidence(legal_status) WHERE legal_status IN ('pending_legal', 'blocked');

-- -----------------------------------------------------------------------------
-- content_type_source_config: which content types require source evidence to publish
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS content_type_source_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL UNIQUE,
  requires_source_evidence BOOLEAN NOT NULL DEFAULT true,
  requires_legal_clearance BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO content_type_source_config (content_type, requires_source_evidence, requires_legal_clearance)
VALUES
  ('question', true, true),
  ('study_guide', true, true),
  ('video', true, true),
  ('flashcard_deck', true, false),
  ('high_yield_content', true, true),
  ('exam_template', true, false),
  ('system_exam', true, false)
ON CONFLICT (content_type) DO NOTHING;
