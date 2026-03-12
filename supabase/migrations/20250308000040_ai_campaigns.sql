-- =============================================================================
-- Migration 040: AI Campaigns (24h generation orchestrator)
-- =============================================================================
-- Campaign: name, targets by track/content, concurrency, model, dry_run.
-- Links to ai_batch_jobs via campaign_id. Supports summary and ETA.
-- =============================================================================

CREATE TABLE IF NOT EXISTS ai_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  -- Targets: { "question": { "rn": 2000, "fnp": 1500, ... }, "study_guide": {...}, ... }
  target_by_track_content JSONB NOT NULL DEFAULT '{}',
  max_concurrency INT NOT NULL DEFAULT 4,
  model_name TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  dry_run BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'running', 'completed', 'failed', 'cancelled', 'paused')),
  -- Aggregated progress (updated by workers)
  target_total INT NOT NULL DEFAULT 0,
  created_total INT NOT NULL DEFAULT 0,
  saved_total INT NOT NULL DEFAULT 0,
  failed_total INT NOT NULL DEFAULT 0,
  duplicate_total INT NOT NULL DEFAULT 0,
  -- Metadata
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  idempotency_key TEXT UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_ai_campaigns_status ON ai_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_ai_campaigns_created ON ai_campaigns(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_campaigns_idempotency ON ai_campaigns(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Link ai_batch_jobs to campaign
ALTER TABLE ai_batch_jobs ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES ai_campaigns(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_ai_batch_jobs_campaign ON ai_batch_jobs(campaign_id) WHERE campaign_id IS NOT NULL;

COMMENT ON TABLE ai_campaigns IS '24h AI Content Factory campaign: targets by track/content, concurrency, progress';
COMMENT ON COLUMN ai_campaigns.target_by_track_content IS '{"question":{"rn":2000,"fnp":1500,...},"study_guide":{...}}';
COMMENT ON COLUMN ai_campaigns.dry_run IS 'If true, plan shards but do not insert jobs';
