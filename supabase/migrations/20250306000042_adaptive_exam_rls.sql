-- =============================================================================
-- Migration 042: Adaptive Exam RLS Policies
-- =============================================================================
-- Enable RLS and create policies. Uses pg_policies checks for idempotency.
-- Service role bypasses RLS by default.
-- =============================================================================

-- Enable RLS on tables that need it
ALTER TABLE adaptive_exam_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE adaptive_exam_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE adaptive_exam_blueprint_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE adaptive_exam_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_calibration ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- adaptive_exam_sessions: users can read/update only their own
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'adaptive_exam_sessions'
      AND policyname = 'Users can view own adaptive exam sessions'
  ) THEN
    CREATE POLICY "Users can view own adaptive exam sessions"
      ON adaptive_exam_sessions FOR SELECT
      USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'adaptive_exam_sessions'
      AND policyname = 'Users can insert own adaptive exam sessions'
  ) THEN
    CREATE POLICY "Users can insert own adaptive exam sessions"
      ON adaptive_exam_sessions FOR INSERT
      WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'adaptive_exam_sessions'
      AND policyname = 'Users can update own adaptive exam sessions'
  ) THEN
    CREATE POLICY "Users can update own adaptive exam sessions"
      ON adaptive_exam_sessions FOR UPDATE
      USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'adaptive_exam_sessions'
      AND policyname = 'Admins can manage all adaptive exam sessions'
  ) THEN
    CREATE POLICY "Admins can manage all adaptive exam sessions"
      ON adaptive_exam_sessions FOR ALL
      USING (is_admin());
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- adaptive_exam_items: users can read/update only items tied to their own sessions
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'adaptive_exam_items'
      AND policyname = 'Users can view own adaptive exam items'
  ) THEN
    CREATE POLICY "Users can view own adaptive exam items"
      ON adaptive_exam_items FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM adaptive_exam_sessions s
          WHERE s.id = adaptive_exam_items.adaptive_exam_session_id
            AND s.user_id = auth.uid()
        )
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'adaptive_exam_items'
      AND policyname = 'Users can insert own adaptive exam items'
  ) THEN
    CREATE POLICY "Users can insert own adaptive exam items"
      ON adaptive_exam_items FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM adaptive_exam_sessions s
          WHERE s.id = adaptive_exam_items.adaptive_exam_session_id
            AND s.user_id = auth.uid()
        )
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'adaptive_exam_items'
      AND policyname = 'Users can update own adaptive exam items'
  ) THEN
    CREATE POLICY "Users can update own adaptive exam items"
      ON adaptive_exam_items FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM adaptive_exam_sessions s
          WHERE s.id = adaptive_exam_items.adaptive_exam_session_id
            AND s.user_id = auth.uid()
        )
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'adaptive_exam_items'
      AND policyname = 'Admins can manage all adaptive exam items'
  ) THEN
    CREATE POLICY "Admins can manage all adaptive exam items"
      ON adaptive_exam_items FOR ALL
      USING (is_admin());
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- adaptive_exam_blueprint_progress: users can read/update rows tied to their own sessions
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'adaptive_exam_blueprint_progress'
      AND policyname = 'Users can view own blueprint progress'
  ) THEN
    CREATE POLICY "Users can view own blueprint progress"
      ON adaptive_exam_blueprint_progress FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM adaptive_exam_sessions s
          WHERE s.id = adaptive_exam_blueprint_progress.adaptive_exam_session_id
            AND s.user_id = auth.uid()
        )
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'adaptive_exam_blueprint_progress'
      AND policyname = 'Users can insert own blueprint progress'
  ) THEN
    CREATE POLICY "Users can insert own blueprint progress"
      ON adaptive_exam_blueprint_progress FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM adaptive_exam_sessions s
          WHERE s.id = adaptive_exam_blueprint_progress.adaptive_exam_session_id
            AND s.user_id = auth.uid()
        )
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'adaptive_exam_blueprint_progress'
      AND policyname = 'Users can update own blueprint progress'
  ) THEN
    CREATE POLICY "Users can update own blueprint progress"
      ON adaptive_exam_blueprint_progress FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM adaptive_exam_sessions s
          WHERE s.id = adaptive_exam_blueprint_progress.adaptive_exam_session_id
            AND s.user_id = auth.uid()
        )
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'adaptive_exam_blueprint_progress'
      AND policyname = 'Admins can manage all blueprint progress'
  ) THEN
    CREATE POLICY "Admins can manage all blueprint progress"
      ON adaptive_exam_blueprint_progress FOR ALL
      USING (is_admin());
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- adaptive_exam_configs: authenticated read; admins manage
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'adaptive_exam_configs'
      AND policyname = 'Authenticated can read adaptive exam configs'
  ) THEN
    CREATE POLICY "Authenticated can read adaptive exam configs"
      ON adaptive_exam_configs FOR SELECT
      TO authenticated
      USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'adaptive_exam_configs'
      AND policyname = 'Admins can manage adaptive exam configs'
  ) THEN
    CREATE POLICY "Admins can manage adaptive exam configs"
      ON adaptive_exam_configs FOR ALL
      USING (is_admin());
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- question_calibration: admin-managed (service role bypass)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'question_calibration'
      AND policyname = 'Admins can manage question calibration'
  ) THEN
    CREATE POLICY "Admins can manage question calibration"
      ON question_calibration FOR ALL
      USING (is_admin());
  END IF;
END $$;
