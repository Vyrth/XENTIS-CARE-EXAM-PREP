-- =============================================================================
-- Migration: AI Batch Job Retry Cap (Phase 4 hardening)
-- =============================================================================
-- Adds job_retry_attempt to ai_batch_jobs for cap on full-job retries.
-- Prevents runaway retries for persistently failing shards.
-- =============================================================================

ALTER TABLE ai_batch_jobs ADD COLUMN IF NOT EXISTS job_retry_attempt INT NOT NULL DEFAULT 0;

COMMENT ON COLUMN ai_batch_jobs.job_retry_attempt IS 'Number of times this job was retried after failure (via retry failed shards). Cap at 5.';
