-- =============================================================================
-- Migration 014: Row Level Security Policies
-- =============================================================================
-- Design: Users can only access their own data. Content tables: authenticated
-- users can read approved content. Admin tables: admin role check. Service
-- role bypasses RLS for backend operations.
-- =============================================================================

-- Helper: Check if user has any admin role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_admin_roles uar
    JOIN profiles p ON p.id = uar.user_id
    WHERE p.id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: Check if user has active subscription for track (optional gating)
CREATE OR REPLACE FUNCTION public.has_subscription_for_track(p_track_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_subscriptions us
    JOIN subscription_plans sp ON sp.id = us.subscription_plan_id
    WHERE us.user_id = auth.uid()
      AND us.status = 'active'
      AND (sp.exam_track_id = p_track_id OR sp.exam_track_id IS NULL)
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- -----------------------------------------------------------------------------
-- user_exam_tracks
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view own exam tracks"
  ON user_exam_tracks FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own exam tracks"
  ON user_exam_tracks FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own exam tracks"
  ON user_exam_tracks FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own exam tracks"
  ON user_exam_tracks FOR DELETE
  USING (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- user_admin_roles
-- -----------------------------------------------------------------------------
CREATE POLICY "Admins can view all admin roles"
  ON user_admin_roles FOR SELECT
  USING (is_admin() OR user_id = auth.uid());

CREATE POLICY "Only admins can manage admin roles"
  ON user_admin_roles FOR ALL
  USING (is_admin());

-- -----------------------------------------------------------------------------
-- user_notes
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can manage own notes"
  ON user_notes FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- user_highlights
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can manage own highlights"
  ON user_highlights FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- study_material_progress
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can manage own study progress"
  ON study_material_progress FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- video_progress
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can manage own video progress"
  ON video_progress FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- user_flashcard_progress
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can manage own flashcard progress"
  ON user_flashcard_progress FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- flashcard_decks (user-created decks)
-- -----------------------------------------------------------------------------
ALTER TABLE flashcard_decks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view platform and own decks"
  ON flashcard_decks FOR SELECT
  USING (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Users can manage own decks"
  ON flashcard_decks FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own decks"
  ON flashcard_decks FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own decks"
  ON flashcard_decks FOR DELETE
  USING (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- exam_sessions
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can manage own exam sessions"
  ON exam_sessions FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- exam_session_questions (via session ownership)
-- -----------------------------------------------------------------------------
ALTER TABLE exam_session_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own session questions"
  ON exam_session_questions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM exam_sessions es
      WHERE es.id = exam_session_questions.exam_session_id
        AND es.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM exam_sessions es
      WHERE es.id = exam_session_questions.exam_session_id
        AND es.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- user_question_attempts
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can manage own question attempts"
  ON user_question_attempts FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- system_exam_attempts
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can manage own system exam attempts"
  ON system_exam_attempts FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- user_system_checkpoint_progress
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can manage own checkpoint progress"
  ON user_system_checkpoint_progress FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- user_study_plans
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can manage own study plans"
  ON user_study_plans FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- user_goal_settings
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can manage own goal settings"
  ON user_goal_settings FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- user_streaks
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can manage own streaks"
  ON user_streaks FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Mastery tables
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can manage own topic mastery"
  ON user_topic_mastery FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own subtopic mastery"
  ON user_subtopic_mastery FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own system mastery"
  ON user_system_mastery FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own domain mastery"
  ON user_domain_mastery FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own skill mastery"
  ON user_skill_mastery FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own item type performance"
  ON user_item_type_performance FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own readiness snapshots"
  ON user_readiness_snapshots FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own performance trends"
  ON user_performance_trends FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own review queue"
  ON user_question_review_queue FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Adaptive recommendations
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can manage own recommendation profile"
  ON adaptive_recommendation_profiles FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own question queue"
  ON adaptive_question_queue FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own content queue"
  ON recommended_content_queue FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own remediation plans"
  ON user_remediation_plans FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- AI
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can manage own saved outputs"
  ON ai_saved_outputs FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Billing
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view own subscription"
  ON user_subscriptions FOR SELECT
  USING (user_id = auth.uid());

-- Updates to user_subscriptions come from Stripe webhooks (service role), not users

-- -----------------------------------------------------------------------------
-- Content tables: authenticated read for approved content
-- Taxonomy, questions, study guides, etc. - read by authenticated users
-- -----------------------------------------------------------------------------
ALTER TABLE exam_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtopics ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_material_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_study_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_reference_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_reference_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_exhibits ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_template_question_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_exam_question_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_system_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_mastery_targets ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read approved content
CREATE POLICY "Authenticated read exam_tracks"
  ON exam_tracks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated read domains"
  ON domains FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated read systems"
  ON systems FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated read topics"
  ON topics FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated read subtopics"
  ON subtopics FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated read learning_objectives"
  ON learning_objectives FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated read approved study_guides"
  ON study_guides FOR SELECT
  TO authenticated
  USING (status = 'approved');

CREATE POLICY "Authenticated read study_material_sections"
  ON study_material_sections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM study_guides sg
      WHERE sg.id = study_material_sections.study_guide_id
        AND sg.status = 'approved'
    )
  );

CREATE POLICY "Authenticated read approved questions"
  ON questions FOR SELECT
  TO authenticated
  USING (status = 'approved');

CREATE POLICY "Authenticated read question_options"
  ON question_options FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM questions q
      WHERE q.id = question_options.question_id
        AND q.status = 'approved'
    )
  );

CREATE POLICY "Authenticated read approved video_lessons"
  ON video_lessons FOR SELECT
  TO authenticated
  USING (status = 'approved');

CREATE POLICY "Authenticated read topic_summaries"
  ON topic_summaries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated read system_study_bundles"
  ON system_study_bundles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated read lab_reference_sets"
  ON lab_reference_sets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated read lab_reference_values"
  ON lab_reference_values FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Public read subscription_plans"
  ON subscription_plans FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Authenticated read exam_templates"
  ON exam_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated read system_exams"
  ON system_exams FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated read question_types"
  ON question_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated read question_exhibits"
  ON question_exhibits FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated read question_interactions"
  ON question_interactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated read flashcards"
  ON flashcards FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated read exam_template_question_pool"
  ON exam_template_question_pool FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated read system_exam_question_pool"
  ON system_exam_question_pool FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated read topic_system_links"
  ON topic_system_links FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated read exam_blueprints"
  ON exam_blueprints FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated read system_mastery_targets"
  ON system_mastery_targets FOR SELECT
  TO authenticated
  USING (true);
