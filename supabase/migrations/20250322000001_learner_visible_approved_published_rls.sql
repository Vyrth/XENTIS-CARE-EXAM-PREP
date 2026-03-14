-- =============================================================================
-- Migration: Learner-visible content - approved + published (robust)
-- =============================================================================
-- Ensures authenticated learners can read content with status IN ('approved', 'published').
-- The AI factory auto-publishes with status = 'published'; legacy policies only allowed
-- status = 'approved'. This migration replaces any legacy learner-read SELECT policies
-- with canonical ones that allow both.
--
-- Safe for mixed environments: uses DROP POLICY IF EXISTS for all known policy names
-- (legacy and new). Does not touch admin policies.
--
-- Verification (run after migration):
--   SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
--   FROM pg_policies
--   WHERE tablename IN ('questions', 'question_options', 'study_guides', 'study_material_sections', 'video_lessons')
--     AND policyname LIKE '%learner%' OR policyname LIKE '%approved%' OR policyname LIKE '%read%'
--   ORDER BY tablename, policyname;
-- =============================================================================

-- -----------------------------------------------------------------------------
-- questions: learner read when status IN ('approved', 'published')
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated read approved questions" ON questions;
DROP POLICY IF EXISTS "Authenticated read learner-visible questions" ON questions;
CREATE POLICY "Authenticated read learner-visible questions"
  ON questions FOR SELECT
  TO authenticated
  USING (status::text IN ('approved', 'published'));

-- -----------------------------------------------------------------------------
-- question_options: learner read when parent question status IN ('approved', 'published')
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated read question_options" ON question_options;
DROP POLICY IF EXISTS "Authenticated read learner-visible question_options" ON question_options;
CREATE POLICY "Authenticated read learner-visible question_options"
  ON question_options FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM questions q
      WHERE q.id = question_options.question_id
        AND q.status::text IN ('approved', 'published')
    )
  );

-- -----------------------------------------------------------------------------
-- study_guides: learner read when status IN ('approved', 'published')
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated read approved study_guides" ON study_guides;
DROP POLICY IF EXISTS "Authenticated read learner-visible study_guides" ON study_guides;
CREATE POLICY "Authenticated read learner-visible study_guides"
  ON study_guides FOR SELECT
  TO authenticated
  USING (status::text IN ('approved', 'published'));

-- -----------------------------------------------------------------------------
-- study_material_sections: learner read when parent study_guide status IN ('approved', 'published')
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated read study_material_sections" ON study_material_sections;
DROP POLICY IF EXISTS "Authenticated read learner-visible study_material_sections" ON study_material_sections;
CREATE POLICY "Authenticated read learner-visible study_material_sections"
  ON study_material_sections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM study_guides sg
      WHERE sg.id = study_material_sections.study_guide_id
        AND sg.status::text IN ('approved', 'published')
    )
  );

-- -----------------------------------------------------------------------------
-- video_lessons: learner read when status IN ('approved', 'published')
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated read approved video_lessons" ON video_lessons;
DROP POLICY IF EXISTS "Authenticated read learner-visible video_lessons" ON video_lessons;
CREATE POLICY "Authenticated read learner-visible video_lessons"
  ON video_lessons FOR SELECT
  TO authenticated
  USING (status::text IN ('approved', 'published'));
