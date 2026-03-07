-- =============================================================================
-- Migration 005: Exam Templates and System Exams
-- =============================================================================
-- Design: exam_templates define reusable exam configs (e.g., Pre-Practice 150q).
-- exam_template_question_pool: which questions can be drawn. system_exams: 
-- 50+ question exams per system. system_exam_attempts: user attempts (links to
-- exam_sessions in user progress migration).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- exam_templates
-- -----------------------------------------------------------------------------
-- Reusable exam definitions: Pre-Practice (150q), system exams (50+q), etc.
CREATE TABLE exam_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_track_id UUID NOT NULL REFERENCES exam_tracks(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  question_count INT NOT NULL,
  duration_minutes INT NOT NULL,
  -- Blueprint alignment: use exam_blueprints or custom rules
  blueprint_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(exam_track_id, slug)
);

CREATE INDEX idx_exam_templates_track ON exam_templates(exam_track_id);

-- -----------------------------------------------------------------------------
-- exam_template_question_pool
-- -----------------------------------------------------------------------------
-- Links templates to question pools. Selection rules in pool_metadata
-- (e.g., min per system, max per domain).
CREATE TABLE exam_template_question_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_template_id UUID NOT NULL REFERENCES exam_templates(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  -- Selection weight, pool tier, etc.
  pool_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(exam_template_id, question_id)
);

CREATE INDEX idx_exam_template_question_pool_template ON exam_template_question_pool(exam_template_id);
CREATE INDEX idx_exam_template_question_pool_question ON exam_template_question_pool(question_id);

-- -----------------------------------------------------------------------------
-- system_exams
-- -----------------------------------------------------------------------------
-- 50+ question practice exams per system. Concrete exam instances.
CREATE TABLE system_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_track_id UUID NOT NULL REFERENCES exam_tracks(id) ON DELETE CASCADE,
  system_id UUID NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  question_count INT NOT NULL CHECK (question_count >= 50),
  duration_minutes INT NOT NULL,
  exam_template_id UUID REFERENCES exam_templates(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(exam_track_id, system_id, name)
);

CREATE INDEX idx_system_exams_track ON system_exams(exam_track_id);
CREATE INDEX idx_system_exams_system ON system_exams(system_id);

-- -----------------------------------------------------------------------------
-- system_exam_question_pool
-- -----------------------------------------------------------------------------
-- Question pool for each system exam (which questions are in it).
CREATE TABLE system_exam_question_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_exam_id UUID NOT NULL REFERENCES system_exams(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(system_exam_id, question_id)
);

CREATE INDEX idx_system_exam_question_pool_exam ON system_exam_question_pool(system_exam_id);

-- system_exam_attempts: created in migration 009 (requires profiles, exam_sessions)
