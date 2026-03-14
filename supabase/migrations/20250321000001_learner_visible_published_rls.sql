-- =============================================================================
-- Migration: Learner-visible content includes 'published' status
-- =============================================================================
-- The AI factory auto-publishes content with status = 'published'. RLS previously
-- only allowed status = 'approved'. This migration aligns learner visibility with
-- LEARNER_VISIBLE_STATUSES (approved, published) so factory-published content
-- appears in question bank, practice, pre-practice, study guides, etc.
-- =============================================================================

-- questions: allow approved OR published (use ::text for enum compatibility)
DROP POLICY IF EXISTS "Authenticated read approved questions" ON questions;
DROP POLICY IF EXISTS "Authenticated read learner-visible questions" ON questions;
CREATE POLICY "Authenticated read learner-visible questions"
  ON questions FOR SELECT
  TO authenticated
  USING (status::text IN ('approved', 'published'));

-- question_options: allow when parent question is approved OR published
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

-- study_guides: allow approved OR published
DROP POLICY IF EXISTS "Authenticated read approved study_guides" ON study_guides;
DROP POLICY IF EXISTS "Authenticated read learner-visible study_guides" ON study_guides;
CREATE POLICY "Authenticated read learner-visible study_guides"
  ON study_guides FOR SELECT
  TO authenticated
  USING (status::text IN ('approved', 'published'));

-- study_material_sections: allow when parent guide is approved OR published
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

-- video_lessons: allow approved OR published
DROP POLICY IF EXISTS "Authenticated read approved video_lessons" ON video_lessons;
DROP POLICY IF EXISTS "Authenticated read learner-visible video_lessons" ON video_lessons;
CREATE POLICY "Authenticated read learner-visible video_lessons"
  ON video_lessons FOR SELECT
  TO authenticated
  USING (status::text IN ('approved', 'published'));
