-- =============================================================================
-- Migration 023: Flashcard Production Studio
-- =============================================================================
-- Adds deck_type, difficulty, status to flashcard_decks for publish pipeline.
-- Card metadata (hint, memory_trick, etc.) stored in flashcards.metadata JSONB.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- flashcard_decks: add deck_type, difficulty, status
-- -----------------------------------------------------------------------------
ALTER TABLE flashcard_decks
  ADD COLUMN IF NOT EXISTS deck_type TEXT DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS status content_status DEFAULT 'draft';

-- deck_type: 'standard', 'high_yield', 'rapid_recall', 'compare_contrast', 'pharm_focus'
-- difficulty: 'easy', 'medium', 'hard'

CREATE INDEX IF NOT EXISTS idx_flashcard_decks_status ON flashcard_decks(status) WHERE status IS NOT NULL;
