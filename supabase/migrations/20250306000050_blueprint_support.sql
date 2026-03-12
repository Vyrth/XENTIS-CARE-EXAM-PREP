-- =============================================================================
-- Migration 050: Blueprint and Calibration Support
-- =============================================================================
-- Track blueprint targets for content balancing and per-track exam assembly.
-- Difficulty metadata on questions for targeting. Additive only.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- track_blueprint_targets
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS track_blueprint_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_track_id UUID NOT NULL REFERENCES exam_tracks(id) ON DELETE CASCADE,
  domain_id UUID REFERENCES domains(id) ON DELETE SET NULL,
  system_id UUID REFERENCES systems(id) ON DELETE SET NULL,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  content_type TEXT NOT NULL,
  target_count INT NOT NULL DEFAULT 0,
  min_count INT,
  max_count INT,
  target_weight NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_track_blueprint_targets_scope UNIQUE (exam_track_id, domain_id, system_id, topic_id, content_type)
);

-- Add unique if missing (table may exist from prior run)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'track_blueprint_targets') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.track_blueprint_targets'::regclass
        AND conname = 'uq_track_blueprint_targets_scope'
    ) THEN
      ALTER TABLE track_blueprint_targets ADD CONSTRAINT uq_track_blueprint_targets_scope
        UNIQUE (exam_track_id, domain_id, system_id, topic_id, content_type);
    END IF;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Indexes on track_blueprint_targets
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_track_blueprint_targets_track_content ON track_blueprint_targets(exam_track_id, content_type);
CREATE INDEX IF NOT EXISTS idx_track_blueprint_targets_system_content ON track_blueprint_targets(system_id, content_type) WHERE system_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_track_blueprint_targets_topic_content ON track_blueprint_targets(topic_id, content_type) WHERE topic_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- updated_at trigger
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS set_updated_at_track_blueprint_targets ON track_blueprint_targets;
CREATE TRIGGER set_updated_at_track_blueprint_targets
  BEFORE UPDATE ON track_blueprint_targets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- questions: difficulty metadata (only if missing)
-- -----------------------------------------------------------------------------
ALTER TABLE questions ADD COLUMN IF NOT EXISTS difficulty_level INT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS objective_label TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS bloom_level TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS board_style_tags JSONB NOT NULL DEFAULT '[]'::jsonb;

-- -----------------------------------------------------------------------------
-- question_options: rationale (app stores in option_metadata.rationale; add column for direct access if needed)
-- Skip: App already stores distractor rationale in option_metadata JSONB.
-- -----------------------------------------------------------------------------
