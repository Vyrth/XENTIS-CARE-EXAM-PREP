-- =============================================================================
-- Migration 021: Question Import Batches
-- =============================================================================
-- Tracks bulk imports for review, audit, and AI-assisted draft pipeline.
-- All imported questions are draft-only; import_batch_id links to source metadata.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- question_import_batches
-- -----------------------------------------------------------------------------
CREATE TABLE question_import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name TEXT,
  source_type TEXT NOT NULL DEFAULT 'manual', -- 'manual', 'csv', 'json', 'ai_generated'
  file_name TEXT,
  total_rows INT NOT NULL DEFAULT 0,
  imported_count INT NOT NULL DEFAULT 0,
  failed_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'importing', 'completed', 'partial', 'failed'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_question_import_batches_status ON question_import_batches(status);
CREATE INDEX idx_question_import_batches_created ON question_import_batches(created_at DESC);

-- -----------------------------------------------------------------------------
-- Add import_batch_id to questions
-- -----------------------------------------------------------------------------
ALTER TABLE questions
  ADD COLUMN import_batch_id UUID REFERENCES question_import_batches(id) ON DELETE SET NULL;

CREATE INDEX idx_questions_import_batch ON questions(import_batch_id) WHERE import_batch_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- RLS for question_import_batches
-- -----------------------------------------------------------------------------
ALTER TABLE question_import_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage import batches"
  ON question_import_batches FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
