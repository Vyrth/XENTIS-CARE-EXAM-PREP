-- =============================================================================
-- Migration 041: AI Bulk Insert Dead Letter
-- =============================================================================
-- Stores failed rows from bulk inserts for retry or manual review.
-- Used when chunk insert fails or individual row fails during reconciliation.
-- =============================================================================

CREATE TABLE IF NOT EXISTS ai_bulk_insert_dead_letter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL, -- 'question', 'question_option', 'flashcard', 'high_yield_content'
  batch_job_id UUID REFERENCES ai_batch_jobs(id) ON DELETE SET NULL,
  payload JSONB NOT NULL,
  error_message TEXT,
  error_code TEXT,
  retry_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_retry_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_bulk_dead_letter_content ON ai_bulk_insert_dead_letter(content_type);
CREATE INDEX IF NOT EXISTS idx_ai_bulk_dead_letter_batch ON ai_bulk_insert_dead_letter(batch_job_id) WHERE batch_job_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_bulk_dead_letter_created ON ai_bulk_insert_dead_letter(created_at DESC);

COMMENT ON TABLE ai_bulk_insert_dead_letter IS 'Failed rows from bulk AI inserts; retry or manual review';
