-- =============================================================================
-- Migration 048: Batch Plan Logs Hardening
-- =============================================================================
-- Additive only. Extends ai_batch_job_logs with campaign/shard/batch_plan links
-- and log_level, error_code, attempt_number. Creates table if missing.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Create ai_batch_job_logs if it does not exist
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_batch_job_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_job_id UUID REFERENCES ai_batch_jobs(id) ON DELETE CASCADE,
  batch_plan_id UUID REFERENCES batch_plans(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES ai_generation_campaigns(id) ON DELETE CASCADE,
  shard_id UUID REFERENCES ai_generation_shards(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  log_level TEXT NOT NULL DEFAULT 'info',
  message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_code TEXT,
  attempt_number INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Add missing columns (no-op if column exists)
-- Migration 036 created with batch_job_id NOT NULL - we add new columns only.
-- For existing table: batch_job_id stays; we add nullable batch_plan_id, etc.
-- -----------------------------------------------------------------------------
ALTER TABLE ai_batch_job_logs ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES ai_generation_campaigns(id) ON DELETE SET NULL;
ALTER TABLE ai_batch_job_logs ADD COLUMN IF NOT EXISTS shard_id UUID REFERENCES ai_generation_shards(id) ON DELETE SET NULL;
ALTER TABLE ai_batch_job_logs ADD COLUMN IF NOT EXISTS batch_plan_id UUID REFERENCES batch_plans(id) ON DELETE SET NULL;
ALTER TABLE ai_batch_job_logs ADD COLUMN IF NOT EXISTS log_level TEXT NOT NULL DEFAULT 'info';
ALTER TABLE ai_batch_job_logs ADD COLUMN IF NOT EXISTS error_code TEXT;
ALTER TABLE ai_batch_job_logs ADD COLUMN IF NOT EXISTS attempt_number INT NOT NULL DEFAULT 0;

-- -----------------------------------------------------------------------------
-- Add indexes if missing
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_ai_batch_job_logs_created ON ai_batch_job_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_batch_job_logs_batch_plan_created ON ai_batch_job_logs(batch_plan_id, created_at DESC) WHERE batch_plan_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_batch_job_logs_campaign_created ON ai_batch_job_logs(campaign_id, created_at DESC) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_batch_job_logs_shard_created ON ai_batch_job_logs(shard_id, created_at DESC) WHERE shard_id IS NOT NULL;
