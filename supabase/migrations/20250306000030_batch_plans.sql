-- =============================================================================
-- Migration 030: Content Batch Plans
-- =============================================================================
-- Admin batch planning: track/system/topic targets for content production.
-- Supports status tracking and target vs actual progress.
-- =============================================================================

CREATE TYPE batch_plan_status AS ENUM (
  'planned',
  'in_progress',
  'under_review',
  'completed'
);

CREATE TABLE IF NOT EXISTS batch_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_track_id UUID NOT NULL REFERENCES exam_tracks(id) ON DELETE CASCADE,
  system_id UUID REFERENCES systems(id) ON DELETE SET NULL,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  -- Targets
  target_questions INT NOT NULL DEFAULT 0,
  target_guides INT NOT NULL DEFAULT 0,
  target_decks INT NOT NULL DEFAULT 0,
  target_videos INT NOT NULL DEFAULT 0,
  target_high_yield INT NOT NULL DEFAULT 0,
  -- Status
  status batch_plan_status NOT NULL DEFAULT 'planned',
  -- Optional: owner/reviewer for role-based filtering
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_batch_plans_track ON batch_plans(exam_track_id);
CREATE INDEX IF NOT EXISTS idx_batch_plans_system ON batch_plans(system_id) WHERE system_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_batch_plans_topic ON batch_plans(topic_id) WHERE topic_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_batch_plans_status ON batch_plans(status);
CREATE INDEX IF NOT EXISTS idx_batch_plans_owner ON batch_plans(owner_id) WHERE owner_id IS NOT NULL;
