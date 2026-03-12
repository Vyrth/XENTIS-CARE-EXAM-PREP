-- =============================================================================
-- Migration 025: High-Yield Content (admin-curated)
-- =============================================================================
-- Unified table for high-yield summaries, common confusions, board traps,
-- and compare/contrast summaries. Used by dashboard and Jade Tutor.
-- =============================================================================

CREATE TYPE high_yield_content_type AS ENUM (
  'high_yield_summary',
  'common_confusion',
  'board_trap',
  'compare_contrast_summary'
);

CREATE TYPE confusion_frequency AS ENUM (
  'common',
  'very_common',
  'extremely_common'
);

CREATE TABLE high_yield_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type high_yield_content_type NOT NULL,
  exam_track_id UUID NOT NULL REFERENCES exam_tracks(id) ON DELETE CASCADE,
  system_id UUID REFERENCES systems(id) ON DELETE SET NULL,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  explanation TEXT,
  why_high_yield TEXT,
  common_confusion TEXT,
  suggested_practice_link TEXT,
  suggested_guide_link TEXT,
  -- Type-specific
  high_yield_score INT CHECK (high_yield_score >= 0 AND high_yield_score <= 100),
  trap_severity INT CHECK (trap_severity >= 1 AND trap_severity <= 5),
  confusion_frequency confusion_frequency,
  trap_description TEXT,
  correct_approach TEXT,
  concept_a TEXT,
  concept_b TEXT,
  key_difference TEXT,
  -- Publish
  status content_status NOT NULL DEFAULT 'draft',
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_high_yield_content_track ON high_yield_content(exam_track_id);
CREATE INDEX idx_high_yield_content_type ON high_yield_content(content_type);
CREATE INDEX idx_high_yield_content_status ON high_yield_content(status) WHERE status = 'approved';
