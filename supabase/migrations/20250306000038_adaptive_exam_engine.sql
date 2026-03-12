-- =============================================================================
-- Migration 038: Adaptive Exam Engine (CAT-style)
-- =============================================================================
-- Design: Production-grade CAT (Computerized Adaptive Testing) schema for
-- RN, FNP, PMHNP, and LVN/LPN. IRT calibration, session tracking, blueprint
-- progress, and configurable stop rules.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- adaptive_exam_configs
-- -----------------------------------------------------------------------------
CREATE TABLE adaptive_exam_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_track_id UUID NOT NULL REFERENCES exam_tracks(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
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
  CONSTRAINT chk_adaptive_config_min_max CHECK (min_questions <= max_questions)
);

CREATE INDEX idx_adaptive_exam_configs_track ON adaptive_exam_configs(exam_track_id);
CREATE INDEX idx_adaptive_exam_configs_slug ON adaptive_exam_configs(slug);

-- -----------------------------------------------------------------------------
-- question_calibration
-- -----------------------------------------------------------------------------
CREATE TABLE question_calibration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL UNIQUE REFERENCES questions(id) ON DELETE CASCADE,
  difficulty_b NUMERIC NOT NULL DEFAULT 0,
  discrimination_a NUMERIC NOT NULL DEFAULT 1,
  guessing_c NUMERIC NOT NULL DEFAULT 0,
  slip_d NUMERIC NOT NULL DEFAULT 1,
  exposure_count INT NOT NULL DEFAULT 0,
  last_served_at TIMESTAMPTZ,
  calibration_source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_question_calibration_difficulty ON question_calibration(difficulty_b);
CREATE INDEX idx_question_calibration_exposure ON question_calibration(exposure_count);
CREATE INDEX idx_question_calibration_question ON question_calibration(question_id);

-- -----------------------------------------------------------------------------
-- adaptive_exam_sessions
-- -----------------------------------------------------------------------------
CREATE TABLE adaptive_exam_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exam_track_id UUID NOT NULL REFERENCES exam_tracks(id) ON DELETE CASCADE,
  adaptive_exam_config_id UUID NOT NULL REFERENCES adaptive_exam_configs(id) ON DELETE CASCADE,
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

ALTER TABLE adaptive_exam_sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_adaptive_exam_sessions_user_status ON adaptive_exam_sessions(user_id, status);
CREATE INDEX idx_adaptive_exam_sessions_track_status ON adaptive_exam_sessions(exam_track_id, status);
CREATE INDEX idx_adaptive_exam_sessions_config ON adaptive_exam_sessions(adaptive_exam_config_id);
CREATE INDEX idx_adaptive_exam_sessions_started ON adaptive_exam_sessions(started_at);

-- -----------------------------------------------------------------------------
-- adaptive_exam_items
-- -----------------------------------------------------------------------------
CREATE TABLE adaptive_exam_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adaptive_exam_session_id UUID NOT NULL REFERENCES adaptive_exam_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
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
  CONSTRAINT chk_adaptive_exam_items_served_order CHECK (served_order > 0)
);

ALTER TABLE adaptive_exam_items ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_adaptive_exam_items_session_order ON adaptive_exam_items(adaptive_exam_session_id, served_order);
CREATE INDEX idx_adaptive_exam_items_question ON adaptive_exam_items(question_id);
CREATE INDEX idx_adaptive_exam_items_session ON adaptive_exam_items(adaptive_exam_session_id);

-- -----------------------------------------------------------------------------
-- adaptive_exam_blueprint_progress
-- -----------------------------------------------------------------------------
CREATE TABLE adaptive_exam_blueprint_progress (
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

CREATE INDEX idx_adaptive_blueprint_progress_session ON adaptive_exam_blueprint_progress(adaptive_exam_session_id);
CREATE INDEX idx_adaptive_blueprint_progress_domain ON adaptive_exam_blueprint_progress(domain_id) WHERE domain_id IS NOT NULL;
CREATE INDEX idx_adaptive_blueprint_progress_system ON adaptive_exam_blueprint_progress(system_id) WHERE system_id IS NOT NULL;
CREATE INDEX idx_adaptive_blueprint_progress_topic ON adaptive_exam_blueprint_progress(topic_id) WHERE topic_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- updated_at triggers
-- -----------------------------------------------------------------------------
CREATE TRIGGER set_updated_at_adaptive_exam_configs
  BEFORE UPDATE ON adaptive_exam_configs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_question_calibration
  BEFORE UPDATE ON question_calibration
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_adaptive_exam_sessions
  BEFORE UPDATE ON adaptive_exam_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_adaptive_exam_items
  BEFORE UPDATE ON adaptive_exam_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_adaptive_exam_blueprint_progress
  BEFORE UPDATE ON adaptive_exam_blueprint_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS policies: adaptive_exam_sessions
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view own adaptive exam sessions"
  ON adaptive_exam_sessions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own adaptive exam sessions"
  ON adaptive_exam_sessions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own adaptive exam sessions"
  ON adaptive_exam_sessions FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all adaptive exam sessions"
  ON adaptive_exam_sessions FOR ALL
  USING (is_admin());

-- -----------------------------------------------------------------------------
-- RLS policies: adaptive_exam_items (via session ownership)
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view own adaptive exam items"
  ON adaptive_exam_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM adaptive_exam_sessions s
      WHERE s.id = adaptive_exam_items.adaptive_exam_session_id
        AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own adaptive exam items"
  ON adaptive_exam_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM adaptive_exam_sessions s
      WHERE s.id = adaptive_exam_items.adaptive_exam_session_id
        AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own adaptive exam items"
  ON adaptive_exam_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM adaptive_exam_sessions s
      WHERE s.id = adaptive_exam_items.adaptive_exam_session_id
        AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all adaptive exam items"
  ON adaptive_exam_items FOR ALL
  USING (is_admin());

-- -----------------------------------------------------------------------------
-- RLS policies: adaptive_exam_blueprint_progress (via session ownership)
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view own blueprint progress"
  ON adaptive_exam_blueprint_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM adaptive_exam_sessions s
      WHERE s.id = adaptive_exam_blueprint_progress.adaptive_exam_session_id
        AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own blueprint progress"
  ON adaptive_exam_blueprint_progress FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM adaptive_exam_sessions s
      WHERE s.id = adaptive_exam_blueprint_progress.adaptive_exam_session_id
        AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own blueprint progress"
  ON adaptive_exam_blueprint_progress FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM adaptive_exam_sessions s
      WHERE s.id = adaptive_exam_blueprint_progress.adaptive_exam_session_id
        AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all blueprint progress"
  ON adaptive_exam_blueprint_progress FOR ALL
  USING (is_admin());

-- -----------------------------------------------------------------------------
-- RLS: adaptive_exam_configs and question_calibration
-- -----------------------------------------------------------------------------
-- Configs: authenticated users can read; only service role/admin can modify
ALTER TABLE adaptive_exam_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read adaptive exam configs"
  ON adaptive_exam_configs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage adaptive exam configs"
  ON adaptive_exam_configs FOR ALL
  USING (is_admin());

-- Calibration: service role only (admin-managed)
ALTER TABLE question_calibration ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage question calibration"
  ON question_calibration FOR ALL
  USING (is_admin());

-- -----------------------------------------------------------------------------
-- Seed: one config per track
-- -----------------------------------------------------------------------------
INSERT INTO adaptive_exam_configs (
  exam_track_id,
  slug,
  name,
  description,
  min_questions,
  max_questions,
  target_standard_error,
  passing_theta,
  content_balance_rules,
  exposure_rules,
  stop_rules
)
SELECT
  et.id,
  et.slug || '-cat',
  et.name || ' CAT',
  'Computerized adaptive exam for ' || et.name || ' board prep. IRT-based item selection.',
  75,
  150,
  0.30,
  0.00,
  '{}'::jsonb,
  '{}'::jsonb,
  '{"min_questions": 75, "max_questions": 150, "target_se": 0.30}'::jsonb
FROM exam_tracks et
WHERE et.slug IN ('rn', 'fnp', 'pmhnp', 'lvn')
ON CONFLICT (slug) DO NOTHING;
