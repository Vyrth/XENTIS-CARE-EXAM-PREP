-- =============================================================================
-- Migration 036: Batch Job Scheduler
-- =============================================================================
-- Adds generated_count, batch_job_logs for scheduler, rate limiting, retries.
-- =============================================================================

-- generated_count: AI returned successfully (before save)
ALTER TABLE ai_batch_jobs
  ADD COLUMN IF NOT EXISTS generated_count INT NOT NULL DEFAULT 0;

-- retry_count: number of retries attempted for failed items
ALTER TABLE ai_batch_jobs
  ADD COLUMN IF NOT EXISTS retry_count INT NOT NULL DEFAULT 0;

COMMENT ON COLUMN ai_batch_jobs.generated_count IS 'Count of items AI generated successfully (before persist)';
COMMENT ON COLUMN ai_batch_jobs.retry_count IS 'Number of retry attempts for failed generations';

-- Batch job logs for audit trail
CREATE TABLE IF NOT EXISTS ai_batch_job_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_job_id UUID NOT NULL REFERENCES ai_batch_jobs(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'started', 'item_generated', 'item_saved', 'item_failed', 'retry', 'completed', 'failed'
  message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_batch_job_logs_job ON ai_batch_job_logs(batch_job_id);
CREATE INDEX IF NOT EXISTS idx_ai_batch_job_logs_created ON ai_batch_job_logs(created_at DESC);
