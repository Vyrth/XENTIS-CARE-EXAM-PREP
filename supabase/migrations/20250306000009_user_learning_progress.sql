-- =============================================================================
-- Migration 009: User Learning Progress
-- =============================================================================
-- Design: All user-generated and progress data. exam_sessions is the central
-- exam attempt record. exam_session_questions: question order + answers.
-- user_question_attempts: standalone attempts (e.g., quiz after video).
-- system_exam_attempts links to exam_sessions for system exam tracking.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- user_notes
-- -----------------------------------------------------------------------------
-- Notebook entries. Linked to content via content_type + content_id.
CREATE TABLE user_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL, -- 'study_section', 'topic', 'question'
  content_id UUID NOT NULL,
  note_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_notes ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_user_notes_user ON user_notes(user_id);
CREATE INDEX idx_user_notes_content ON user_notes(content_type, content_id);

-- -----------------------------------------------------------------------------
-- user_highlights
-- -----------------------------------------------------------------------------
-- Highlighted text ranges. start_offset/end_offset for character positions.
CREATE TABLE user_highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  start_offset INT NOT NULL,
  end_offset INT NOT NULL,
  highlight_text TEXT,
  color TEXT DEFAULT 'yellow',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_highlights ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_user_highlights_user ON user_highlights(user_id);
CREATE INDEX idx_user_highlights_content ON user_highlights(content_type, content_id);

-- -----------------------------------------------------------------------------
-- study_material_progress
-- -----------------------------------------------------------------------------
-- Tracks completion/reading progress for study sections.
CREATE TABLE study_material_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  study_material_section_id UUID NOT NULL REFERENCES study_material_sections(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  last_position INT DEFAULT 0, -- Scroll position or % read
  last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, study_material_section_id)
);

ALTER TABLE study_material_progress ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_study_material_progress_user ON study_material_progress(user_id);
CREATE INDEX idx_study_material_progress_section ON study_material_progress(study_material_section_id);

-- -----------------------------------------------------------------------------
-- video_progress
-- -----------------------------------------------------------------------------
CREATE TABLE video_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  video_lesson_id UUID NOT NULL REFERENCES video_lessons(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  watch_seconds INT NOT NULL DEFAULT 0,
  last_position_seconds INT DEFAULT 0,
  last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, video_lesson_id)
);

ALTER TABLE video_progress ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_video_progress_user ON video_progress(user_id);
CREATE INDEX idx_video_progress_video ON video_progress(video_lesson_id);

-- -----------------------------------------------------------------------------
-- user_flashcard_progress
-- -----------------------------------------------------------------------------
-- Spaced repetition / recall tracking per flashcard.
CREATE TABLE user_flashcard_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  flashcard_id UUID NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  correct_count INT NOT NULL DEFAULT 0,
  incorrect_count INT NOT NULL DEFAULT 0,
  last_reviewed_at TIMESTAMPTZ,
  next_review_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, flashcard_id)
);

ALTER TABLE user_flashcard_progress ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_user_flashcard_progress_user ON user_flashcard_progress(user_id);
CREATE INDEX idx_user_flashcard_progress_flashcard ON user_flashcard_progress(flashcard_id);
CREATE INDEX idx_user_flashcard_progress_next_review ON user_flashcard_progress(user_id, next_review_at) WHERE next_review_at IS NOT NULL;

-- -----------------------------------------------------------------------------
-- Add user_id to flashcard_decks for user-created decks
-- -----------------------------------------------------------------------------
ALTER TABLE flashcard_decks
  ADD COLUMN user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

CREATE INDEX idx_flashcard_decks_user ON flashcard_decks(user_id) WHERE user_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- exam_sessions
-- -----------------------------------------------------------------------------
-- Central exam attempt record. Pre-Practice, system exam, or custom.
CREATE TABLE exam_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exam_track_id UUID NOT NULL REFERENCES exam_tracks(id) ON DELETE CASCADE,
  exam_template_id UUID REFERENCES exam_templates(id) ON DELETE SET NULL,
  system_exam_id UUID REFERENCES system_exams(id) ON DELETE SET NULL,
  session_type TEXT NOT NULL, -- 'pre_practice', 'system_exam', 'practice', 'quiz'
  status exam_session_status NOT NULL DEFAULT 'in_progress',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  time_remaining_seconds INT,
  -- Scratchpad/whiteboard state (JSON)
  scratchpad_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE exam_sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_exam_sessions_user ON exam_sessions(user_id);
CREATE INDEX idx_exam_sessions_status ON exam_sessions(status);
CREATE INDEX idx_exam_sessions_started ON exam_sessions(user_id, started_at DESC);

-- -----------------------------------------------------------------------------
-- exam_session_questions
-- -----------------------------------------------------------------------------
-- Question order and answers per session. response_data: JSONB for complex types.
CREATE TABLE exam_session_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_session_id UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  question_interaction_id UUID REFERENCES question_interactions(id) ON DELETE SET NULL,
  display_order INT NOT NULL,
  -- User response: { "selected_options": ["A"], "numeric_value": 5.2, etc. }
  response_data JSONB DEFAULT '{}',
  is_answered BOOLEAN NOT NULL DEFAULT false,
  is_flagged BOOLEAN NOT NULL DEFAULT false,
  is_correct BOOLEAN,
  time_spent_seconds INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Unique enforced via expression index below (handles NULL interaction_id)

CREATE UNIQUE INDEX idx_exam_session_questions_session_question_interaction
  ON exam_session_questions(exam_session_id, question_id, COALESCE(question_interaction_id::text, ''));

CREATE INDEX idx_exam_session_questions_session ON exam_session_questions(exam_session_id);
CREATE INDEX idx_exam_session_questions_question ON exam_session_questions(question_id);

-- -----------------------------------------------------------------------------
-- user_question_attempts
-- -----------------------------------------------------------------------------
-- Standalone attempts (e.g., video quiz, flashcard quiz). Not part of exam_session.
CREATE TABLE user_question_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  -- Optional context
  video_lesson_id UUID REFERENCES video_lessons(id) ON DELETE SET NULL,
  response_data JSONB DEFAULT '{}',
  is_correct BOOLEAN NOT NULL,
  time_spent_seconds INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_question_attempts ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_user_question_attempts_user ON user_question_attempts(user_id);
CREATE INDEX idx_user_question_attempts_question ON user_question_attempts(question_id);
CREATE INDEX idx_user_question_attempts_created ON user_question_attempts(user_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- system_exam_attempts
-- -----------------------------------------------------------------------------
-- Links exam_sessions to system_exams for "my system exam attempts" queries.
CREATE TABLE system_exam_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  system_exam_id UUID NOT NULL REFERENCES system_exams(id) ON DELETE CASCADE,
  exam_session_id UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(exam_session_id)
);

ALTER TABLE system_exam_attempts ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_system_exam_attempts_user ON system_exam_attempts(user_id);
CREATE INDEX idx_system_exam_attempts_exam ON system_exam_attempts(system_exam_id);
CREATE INDEX idx_system_exam_attempts_session ON system_exam_attempts(exam_session_id);

-- -----------------------------------------------------------------------------
-- system_completion_checkpoints
-- -----------------------------------------------------------------------------
-- Defines checkpoints within a system (e.g., "Complete 3 sections, 1 video, 1 quiz").
CREATE TABLE system_completion_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id UUID NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
  checkpoint_key TEXT NOT NULL,
  name TEXT NOT NULL,
  -- JSONB: { "required_section_ids": [...], "required_video_ids": [...], "required_quiz_count": 1 }
  requirements JSONB NOT NULL DEFAULT '{}',
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(system_id, checkpoint_key)
);

CREATE INDEX idx_system_completion_checkpoints_system ON system_completion_checkpoints(system_id);

-- -----------------------------------------------------------------------------
-- user_system_checkpoint_progress
-- -----------------------------------------------------------------------------
CREATE TABLE user_system_checkpoint_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  system_completion_checkpoint_id UUID NOT NULL REFERENCES system_completion_checkpoints(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, system_completion_checkpoint_id)
);

ALTER TABLE user_system_checkpoint_progress ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_user_system_checkpoint_progress_user ON user_system_checkpoint_progress(user_id);

-- -----------------------------------------------------------------------------
-- user_study_plans
-- -----------------------------------------------------------------------------
-- User-defined or AI-generated study plans.
CREATE TABLE user_study_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exam_track_id UUID NOT NULL REFERENCES exam_tracks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  plan_data JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_study_plans ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_user_study_plans_user ON user_study_plans(user_id);

-- -----------------------------------------------------------------------------
-- user_goal_settings
-- -----------------------------------------------------------------------------
-- Daily/weekly goals (e.g., 10 questions/day, 2 hours/week).
CREATE TABLE user_goal_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL, -- 'daily_questions', 'weekly_hours', 'streak_target'
  target_value NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, goal_type)
);

ALTER TABLE user_goal_settings ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_user_goal_settings_user ON user_goal_settings(user_id);

-- -----------------------------------------------------------------------------
-- user_streaks
-- -----------------------------------------------------------------------------
-- Daily streak tracking. One row per user per date.
CREATE TABLE user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  activity_count INT NOT NULL DEFAULT 0,
  -- Types: questions_answered, minutes_studied, etc.
  activity_type TEXT NOT NULL DEFAULT 'study',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, activity_date, activity_type)
);

ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_user_streaks_user ON user_streaks(user_id);
CREATE INDEX idx_user_streaks_date ON user_streaks(user_id, activity_date DESC);
