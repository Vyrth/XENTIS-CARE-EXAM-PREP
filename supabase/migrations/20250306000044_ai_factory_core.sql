-- =============================================================================
-- Migration 044: AI Content Factory Core Engine
-- =============================================================================
-- Campaigns, shards, and content dedupe registry for large-scale AI generation.
-- Additive, idempotent. Does not duplicate ai_campaigns or ai_batch_jobs.
-- Schema aligns with docs/SCHEMA_DISCOVERY_REPORT.md.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ai_generation_campaigns
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_generation_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- ai_generation_shards
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_generation_shards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES ai_generation_campaigns(id) ON DELETE CASCADE,
  exam_track_id UUID NOT NULL REFERENCES exam_tracks(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  system_id UUID REFERENCES systems(id) ON DELETE SET NULL,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  shard_key TEXT NOT NULL,
  target_count INT NOT NULL DEFAULT 0,
  generated_count INT NOT NULL DEFAULT 0,
  saved_count INT NOT NULL DEFAULT 0,
  failed_count INT NOT NULL DEFAULT 0,
  duplicate_count INT NOT NULL DEFAULT 0,
  retry_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  priority INT NOT NULL DEFAULT 100,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_ai_generation_shards_campaign_shard UNIQUE (campaign_id, shard_key)
);

-- Add unique constraint if table existed without it
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_generation_shards') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.ai_generation_shards'::regclass
        AND conname = 'uq_ai_generation_shards_campaign_shard'
    ) THEN
      ALTER TABLE ai_generation_shards ADD CONSTRAINT uq_ai_generation_shards_campaign_shard UNIQUE (campaign_id, shard_key);
    END IF;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- content_dedupe_registry
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS content_dedupe_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL,
  exam_track_id UUID NOT NULL REFERENCES exam_tracks(id) ON DELETE CASCADE,
  system_id UUID REFERENCES systems(id) ON DELETE SET NULL,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  source_table TEXT NOT NULL,
  source_id UUID NOT NULL,
  normalized_hash TEXT NOT NULL,
  secondary_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_content_dedupe_registry_type_hash UNIQUE (content_type, normalized_hash)
);

-- Add unique constraint if table existed without it
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'content_dedupe_registry') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.content_dedupe_registry'::regclass
        AND conname = 'uq_content_dedupe_registry_type_hash'
    ) THEN
      ALTER TABLE content_dedupe_registry ADD CONSTRAINT uq_content_dedupe_registry_type_hash UNIQUE (content_type, normalized_hash);
    END IF;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- updated_at triggers
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS set_updated_at_ai_generation_campaigns ON ai_generation_campaigns;
CREATE TRIGGER set_updated_at_ai_generation_campaigns
  BEFORE UPDATE ON ai_generation_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_ai_generation_shards ON ai_generation_shards;
CREATE TRIGGER set_updated_at_ai_generation_shards
  BEFORE UPDATE ON ai_generation_shards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
