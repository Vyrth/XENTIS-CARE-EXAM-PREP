-- =============================================================================
-- Migration 029: AI Generation Audit
-- =============================================================================
-- Tracks AI-generated admin drafts for auditability. All AI content is draft-only
-- and requires human review before publish.
-- =============================================================================

CREATE TABLE IF NOT EXISTS ai_generation_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL, -- 'question', 'distractor_rationale', 'study_section', 'flashcard', 'mnemonic', 'high_yield_summary'
  content_id UUID, -- Set when draft is saved to DB
  generation_params JSONB NOT NULL DEFAULT '{}', -- track, system, topic, objective, difficulty, item_type
  model_used TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID -- Admin user who triggered generation
);

CREATE INDEX IF NOT EXISTS idx_ai_generation_audit_content ON ai_generation_audit(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_ai_generation_audit_created ON ai_generation_audit(generated_at DESC);
