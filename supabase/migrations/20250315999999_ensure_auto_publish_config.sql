-- =============================================================================
-- Migration: Ensure auto_publish_config exists (prerequisite for enable migrations)
-- =============================================================================
-- Runs before 20250316000001 and 20250317000001. Creates table and schema if
-- the remote DB missed 20250313000001. Idempotent.
-- =============================================================================

-- Create table if not exists (from 20250313000001)
CREATE TABLE IF NOT EXISTS auto_publish_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  min_quality_score NUMERIC(5,2) DEFAULT 70,
  require_track_assigned BOOLEAN NOT NULL DEFAULT true,
  require_no_duplicate BOOLEAN NOT NULL DEFAULT true,
  require_answer_rationale_consistent BOOLEAN NOT NULL DEFAULT true,
  require_source_mapping BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add require_source_mapping if missing (from 20250315000001)
ALTER TABLE auto_publish_config ADD COLUMN IF NOT EXISTS require_source_mapping BOOLEAN NOT NULL DEFAULT true;

-- Seed baseline rows if missing (from 20250313000001)
INSERT INTO auto_publish_config (content_type, enabled, min_quality_score, require_track_assigned, require_no_duplicate, require_answer_rationale_consistent, require_source_mapping)
VALUES
  ('question', false, 75, true, true, true, true),
  ('study_guide', false, 70, true, true, true, true),
  ('flashcard_deck', false, 70, true, true, true, true),
  ('high_yield_content', false, 70, true, true, true, true)
ON CONFLICT (content_type) DO NOTHING;

-- RLS if not already enabled
ALTER TABLE auto_publish_config ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'auto_publish_config' AND policyname = 'Admins manage auto_publish_config'
  ) THEN
    CREATE POLICY "Admins manage auto_publish_config"
      ON auto_publish_config FOR ALL
      USING (is_admin());
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL; -- Policy may already exist with different definition
END $$;
