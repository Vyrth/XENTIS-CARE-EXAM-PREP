-- =============================================================================
-- Migration 024: Video Lesson Production Workflow
-- =============================================================================
-- Adds transcript to video_lessons and video_transcript_sections for
-- sectioned, AI-retrieval-eligible transcript management.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- video_lessons: add transcript
-- -----------------------------------------------------------------------------
ALTER TABLE video_lessons
  ADD COLUMN IF NOT EXISTS transcript TEXT;

-- -----------------------------------------------------------------------------
-- video_transcript_sections
-- -----------------------------------------------------------------------------
-- Sectioned transcript for editing and AI retrieval.
CREATE TABLE IF NOT EXISTS video_transcript_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_lesson_id UUID NOT NULL REFERENCES video_lessons(id) ON DELETE CASCADE,
  display_order INT NOT NULL DEFAULT 0,
  text TEXT NOT NULL,
  start_time_seconds INT,
  end_time_seconds INT,
  is_retrieval_eligible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_video_transcript_sections_video ON video_transcript_sections(video_lesson_id);
