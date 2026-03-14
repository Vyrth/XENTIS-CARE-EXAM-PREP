-- =============================================================================
-- Migration: High-Confidence Auto-Publish Config and Metrics
-- =============================================================================
-- Adds min_confidence_score, max_similarity_score to auto_publish_config.
-- Adds ai_auto_publish_metrics for admin diagnostics.
-- =============================================================================

-- Extend auto_publish_config
ALTER TABLE auto_publish_config
  ADD COLUMN IF NOT EXISTS min_confidence_score NUMERIC(3,2) DEFAULT 0.85;

ALTER TABLE auto_publish_config
  ADD COLUMN IF NOT EXISTS max_similarity_score NUMERIC(3,2) DEFAULT NULL;

COMMENT ON COLUMN auto_publish_config.min_confidence_score IS 'Minimum AI validation confidence (0-1) for auto-publish';
COMMENT ON COLUMN auto_publish_config.max_similarity_score IS 'Max allowed similarity to existing content (e.g. 0.82); NULL = do not check';

-- Metrics table for admin dashboard (increment on each event)
CREATE TABLE IF NOT EXISTS ai_auto_publish_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_date DATE NOT NULL DEFAULT CURRENT_DATE,
  content_type TEXT NOT NULL DEFAULT 'question',
  auto_published_count INT NOT NULL DEFAULT 0,
  routed_to_review_count INT NOT NULL DEFAULT 0,
  duplicate_rejected_count INT NOT NULL DEFAULT 0,
  legal_exception_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(period_date, content_type)
);

CREATE INDEX IF NOT EXISTS idx_ai_auto_publish_metrics_period ON ai_auto_publish_metrics(period_date DESC);
CREATE INDEX IF NOT EXISTS idx_ai_auto_publish_metrics_content_type ON ai_auto_publish_metrics(content_type);

COMMENT ON TABLE ai_auto_publish_metrics IS 'Daily counts for auto-publish diagnostics: auto_published, routed_to_review, duplicate_rejected, legal_exception';

-- Atomic increment for a single counter (avoids race conditions)
CREATE OR REPLACE FUNCTION increment_auto_publish_metric(
  p_period_date DATE,
  p_content_type TEXT,
  p_column TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO ai_auto_publish_metrics (period_date, content_type, auto_published_count, routed_to_review_count, duplicate_rejected_count, legal_exception_count, updated_at)
  VALUES (p_period_date, p_content_type, 0, 0, 0, 0, now())
  ON CONFLICT (period_date, content_type)
  DO UPDATE SET
    auto_published_count = ai_auto_publish_metrics.auto_published_count + CASE WHEN p_column = 'auto_published_count' THEN 1 ELSE 0 END,
    routed_to_review_count = ai_auto_publish_metrics.routed_to_review_count + CASE WHEN p_column = 'routed_to_review_count' THEN 1 ELSE 0 END,
    duplicate_rejected_count = ai_auto_publish_metrics.duplicate_rejected_count + CASE WHEN p_column = 'duplicate_rejected_count' THEN 1 ELSE 0 END,
    legal_exception_count = ai_auto_publish_metrics.legal_exception_count + CASE WHEN p_column = 'legal_exception_count' THEN 1 ELSE 0 END,
    updated_at = now();
END;
$$;
