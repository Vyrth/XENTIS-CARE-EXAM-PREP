-- =============================================================================
-- Migration 047: Batch Plan Hardening
-- =============================================================================
-- Additive only. Adds missing columns to batch_plans for 24h large-scale
-- question generation. Links to ai_generation_campaigns, ai_generation_shards.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Create batch_plans if it does not exist (fresh install without 030)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS batch_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_track_id UUID NOT NULL REFERENCES exam_tracks(id) ON DELETE CASCADE,
  system_id UUID REFERENCES systems(id) ON DELETE SET NULL,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  target_questions INT NOT NULL DEFAULT 0,
  target_guides INT NOT NULL DEFAULT 0,
  target_decks INT NOT NULL DEFAULT 0,
  target_videos INT NOT NULL DEFAULT 0,
  target_high_yield INT NOT NULL DEFAULT 0,
  status batch_plan_status NOT NULL DEFAULT 'planned',
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Add missing columns to batch_plans (no-op if column exists)
-- -----------------------------------------------------------------------------
ALTER TABLE batch_plans ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES ai_generation_campaigns(id) ON DELETE SET NULL;
ALTER TABLE batch_plans ADD COLUMN IF NOT EXISTS shard_id UUID REFERENCES ai_generation_shards(id) ON DELETE SET NULL;
ALTER TABLE batch_plans ADD COLUMN IF NOT EXISTS parent_batch_id UUID REFERENCES batch_plans(id) ON DELETE SET NULL;
ALTER TABLE batch_plans ADD COLUMN IF NOT EXISTS content_type TEXT;
ALTER TABLE batch_plans ADD COLUMN IF NOT EXISTS shard_key TEXT;
ALTER TABLE batch_plans ADD COLUMN IF NOT EXISTS target_count INT NOT NULL DEFAULT 0;
ALTER TABLE batch_plans ADD COLUMN IF NOT EXISTS generated_count INT NOT NULL DEFAULT 0;
ALTER TABLE batch_plans ADD COLUMN IF NOT EXISTS saved_count INT NOT NULL DEFAULT 0;
ALTER TABLE batch_plans ADD COLUMN IF NOT EXISTS failed_count INT NOT NULL DEFAULT 0;
ALTER TABLE batch_plans ADD COLUMN IF NOT EXISTS duplicate_count INT NOT NULL DEFAULT 0;
ALTER TABLE batch_plans ADD COLUMN IF NOT EXISTS retry_count INT NOT NULL DEFAULT 0;
ALTER TABLE batch_plans ADD COLUMN IF NOT EXISTS rate_limit_ms INT NOT NULL DEFAULT 800;
ALTER TABLE batch_plans ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;
ALTER TABLE batch_plans ADD COLUMN IF NOT EXISTS locked_by TEXT;
ALTER TABLE batch_plans ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE batch_plans ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE batch_plans ADD COLUMN IF NOT EXISTS last_error TEXT;

-- -----------------------------------------------------------------------------
-- Add check constraints if missing
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.batch_plans'::regclass AND conname = 'chk_batch_plans_target_count') THEN
    ALTER TABLE batch_plans ADD CONSTRAINT chk_batch_plans_target_count CHECK (target_count >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.batch_plans'::regclass AND conname = 'chk_batch_plans_generated_count') THEN
    ALTER TABLE batch_plans ADD CONSTRAINT chk_batch_plans_generated_count CHECK (generated_count >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.batch_plans'::regclass AND conname = 'chk_batch_plans_saved_count') THEN
    ALTER TABLE batch_plans ADD CONSTRAINT chk_batch_plans_saved_count CHECK (saved_count >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.batch_plans'::regclass AND conname = 'chk_batch_plans_failed_count') THEN
    ALTER TABLE batch_plans ADD CONSTRAINT chk_batch_plans_failed_count CHECK (failed_count >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.batch_plans'::regclass AND conname = 'chk_batch_plans_retry_count') THEN
    ALTER TABLE batch_plans ADD CONSTRAINT chk_batch_plans_retry_count CHECK (retry_count >= 0);
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Add indexes if missing
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_batch_plans_status_created ON batch_plans(status, created_at);
CREATE INDEX IF NOT EXISTS idx_batch_plans_campaign_status ON batch_plans(campaign_id, status) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_batch_plans_shard ON batch_plans(shard_id) WHERE shard_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_batch_plans_locked_at ON batch_plans(locked_at) WHERE locked_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_batch_plans_content_status ON batch_plans(content_type, status) WHERE content_type IS NOT NULL;
