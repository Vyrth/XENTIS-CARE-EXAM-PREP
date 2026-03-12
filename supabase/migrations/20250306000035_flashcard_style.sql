-- =============================================================================
-- Migration 035: Flashcard style for mass production
-- =============================================================================
-- Adds flashcard_style to ai_batch_jobs for style-specific generation.
-- Styles: rapid_recall, definition, clinical_association, medication_mechanism,
--         diagnostic_criteria, treatment_algorithms
-- =============================================================================

ALTER TABLE ai_batch_jobs
  ADD COLUMN IF NOT EXISTS flashcard_style TEXT DEFAULT 'rapid_recall';

COMMENT ON COLUMN ai_batch_jobs.flashcard_style IS 'Flashcard style for mass production: rapid_recall, definition, clinical_association, medication_mechanism, diagnostic_criteria, treatment_algorithms';
