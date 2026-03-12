-- =============================================================================
-- Migration 040: Adaptive Exam Core (CAT Engine)
-- =============================================================================
-- Design: Production-grade CAT (Computerized Adaptive Testing) schema.
-- Additive, idempotent. Uses CREATE TABLE IF NOT EXISTS.
-- If migration 038 was applied, tables exist and this no-ops table creation.
-- Schema aligns with docs/SCHEMA_DISCOVERY_REPORT.md (exam_tracks, domains, systems, topics, questions).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- adaptive_exam_configs
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS adaptive_exam_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_track_id UUID NOT NULL REFERENCES exam_tracks(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  min_questions INT NOT NULL DEFAULT 75,
  max_questions INT NOT NULL DEFAULT 150,
  target_standard_error NUMERIC NOT NULL DEFAULT 0.30,
  passing_theta NUMERIC NOT NULL DEFAULT 0.00,
  content_balance_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  exposure_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  stop_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_adaptive_config_min_max CHECK (min_questions <= max_questions),
  CONSTRAINT uq_adaptive_exam_configs_track_slug UNIQUE (exam_track_id, slug)
);

-- Add unique constraint if table existed from prior migration without it
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'adaptive_exam_configs') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.adaptive_exam_configs'::regclass
        AND conname = 'uq_adaptive_exam_configs_track_slug'
    ) THEN
      ALTER TABLE adaptive_exam_configs ADD CONSTRAINT uq_adaptive_exam_configs_track_slug UNIQUE (exam_track_id, slug);
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.adaptive_exam_configs'::regclass
        AND conname = 'chk_adaptive_config_min_max'
    ) THEN
      ALTER TABLE adaptive_exam_configs ADD CONSTRAINT chk_adaptive_config_min_max CHECK (min_questions <= max_questions);
    END IF;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- question_calibration
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS question_calibration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  difficulty_b NUMERIC NOT NULL DEFAULT 0,
  discrimination_a NUMERIC NOT NULL DEFAULT 1,
  guessing_c NUMERIC NOT NULL DEFAULT 0,
  slip_d NUMERIC NOT NULL DEFAULT 1,
  exposure_count INT NOT NULL DEFAULT 0,
  last_served_at TIMESTAMPTZ,
  calibration_source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_question_calibration_question UNIQUE (question_id)
);

-- Add unique if missing
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'question_calibration') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.question_calibration'::regclass
        AND conname = 'uq_question_calibration_question'
    ) THEN
      ALTER TABLE question_calibration ADD CONSTRAINT uq_question_calibration_question UNIQUE (question_id);
    END IF;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- adaptive_exam_sessions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS adaptive_exam_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exam_track_id UUID NOT NULL REFERENCES exam_tracks(id) ON DELETE RESTRICT,
  adaptive_exam_config_id UUID NOT NULL REFERENCES adaptive_exam_configs(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'in_progress',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  theta_estimate NUMERIC NOT NULL DEFAULT 0,
  standard_error NUMERIC NOT NULL DEFAULT 9.99,
  readiness_score NUMERIC,
  confidence_band TEXT,
  question_count INT NOT NULL DEFAULT 0,
  correct_count INT NOT NULL DEFAULT 0,
  incorrect_count INT NOT NULL DEFAULT 0,
  stop_reason TEXT,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_adaptive_session_standard_error CHECK (standard_error >= 0)
);

-- Add check if missing
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'adaptive_exam_sessions') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.adaptive_exam_sessions'::regclass
        AND conname = 'chk_adaptive_session_standard_error'
    ) THEN
      ALTER TABLE adaptive_exam_sessions ADD CONSTRAINT chk_adaptive_session_standard_error CHECK (standard_error >= 0);
    END IF;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- adaptive_exam_items
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS adaptive_exam_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adaptive_exam_session_id UUID NOT NULL REFERENCES adaptive_exam_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  served_order INT NOT NULL,
  domain_id UUID REFERENCES domains(id) ON DELETE SET NULL,
  system_id UUID REFERENCES systems(id) ON DELETE SET NULL,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  difficulty_b NUMERIC,
  user_answer JSONB,
  is_correct BOOLEAN,
  time_spent_seconds INT,
  theta_before NUMERIC,
  theta_after NUMERIC,
  standard_error_before NUMERIC,
  standard_error_after NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_adaptive_exam_items_served_order CHECK (served_order > 0),
  CONSTRAINT uq_adaptive_exam_items_session_order UNIQUE (adaptive_exam_session_id, served_order)
);

-- Add constraints if missing
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'adaptive_exam_items') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.adaptive_exam_items'::regclass
        AND conname = 'chk_adaptive_exam_items_served_order'
    ) THEN
      ALTER TABLE adaptive_exam_items ADD CONSTRAINT chk_adaptive_exam_items_served_order CHECK (served_order > 0);
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.adaptive_exam_items'::regclass
        AND conname = 'uq_adaptive_exam_items_session_order'
    ) THEN
      ALTER TABLE adaptive_exam_items ADD CONSTRAINT uq_adaptive_exam_items_session_order UNIQUE (adaptive_exam_session_id, served_order);
    END IF;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- adaptive_exam_blueprint_progress
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS adaptive_exam_blueprint_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adaptive_exam_session_id UUID NOT NULL REFERENCES adaptive_exam_sessions(id) ON DELETE CASCADE,
  domain_id UUID REFERENCES domains(id) ON DELETE SET NULL,
  system_id UUID REFERENCES systems(id) ON DELETE SET NULL,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  served_count INT NOT NULL DEFAULT 0,
  correct_count INT NOT NULL DEFAULT 0,
  target_min INT,
  target_max INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- updated_at triggers (uses existing set_updated_at from migration 015)
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS set_updated_at_adaptive_exam_configs ON adaptive_exam_configs;
CREATE TRIGGER set_updated_at_adaptive_exam_configs
  BEFORE UPDATE ON adaptive_exam_configs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_question_calibration ON question_calibration;
CREATE TRIGGER set_updated_at_question_calibration
  BEFORE UPDATE ON question_calibration
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_adaptive_exam_sessions ON adaptive_exam_sessions;
CREATE TRIGGER set_updated_at_adaptive_exam_sessions
  BEFORE UPDATE ON adaptive_exam_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_adaptive_exam_items ON adaptive_exam_items;
CREATE TRIGGER set_updated_at_adaptive_exam_items
  BEFORE UPDATE ON adaptive_exam_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_adaptive_exam_blueprint_progress ON adaptive_exam_blueprint_progress;
CREATE TRIGGER set_updated_at_adaptive_exam_blueprint_progress
  BEFORE UPDATE ON adaptive_exam_blueprint_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
