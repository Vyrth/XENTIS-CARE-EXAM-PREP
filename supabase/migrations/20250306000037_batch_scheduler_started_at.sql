-- =============================================================================
-- Migration 037: Batch Scheduler - started_at for observability
-- =============================================================================
-- Adds started_at to ai_batch_jobs when job transitions to running.
-- =============================================================================

ALTER TABLE ai_batch_jobs
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

COMMENT ON COLUMN ai_batch_jobs.started_at IS 'When job transitioned to running (null if never started)';
