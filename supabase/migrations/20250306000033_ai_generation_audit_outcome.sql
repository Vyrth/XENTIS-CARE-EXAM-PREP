-- =============================================================================
-- Migration 033: AI Generation Audit - outcome and indexing
-- =============================================================================
-- Adds outcome column for saved/discarded tracking and indexes for filtering.
-- =============================================================================

ALTER TABLE ai_generation_audit
  ADD COLUMN IF NOT EXISTS outcome TEXT DEFAULT 'pending'; -- 'pending' | 'saved' | 'discarded'

COMMENT ON COLUMN ai_generation_audit.outcome IS 'pending=generated, saved=persisted, discarded=user discarded';

CREATE INDEX IF NOT EXISTS idx_ai_generation_audit_outcome ON ai_generation_audit(outcome) WHERE outcome IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_generation_audit_created_by ON ai_generation_audit(created_by) WHERE created_by IS NOT NULL;
