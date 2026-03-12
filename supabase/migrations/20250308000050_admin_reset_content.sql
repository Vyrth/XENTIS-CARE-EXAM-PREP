-- =============================================================================
-- Admin content reset function
-- =============================================================================
-- Callable via supabase.rpc('admin_reset_content_zero')
-- Requires service role or a dedicated SECURITY DEFINER wrapper.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_reset_content_zero()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- User progress
  TRUNCATE TABLE user_question_attempts CASCADE;
  TRUNCATE TABLE user_flashcard_progress CASCADE;

  -- Exam sessions
  TRUNCATE TABLE exam_session_questions CASCADE;
  TRUNCATE TABLE system_exam_attempts CASCADE;
  TRUNCATE TABLE exam_sessions CASCADE;

  -- Exam pools
  TRUNCATE TABLE exam_template_question_pool CASCADE;
  TRUNCATE TABLE system_exam_question_pool CASCADE;

  -- Question children
  TRUNCATE TABLE question_options CASCADE;
  TRUNCATE TABLE question_exhibits CASCADE;
  TRUNCATE TABLE question_adaptive_profiles CASCADE;
  TRUNCATE TABLE question_skill_tags CASCADE;
  TRUNCATE TABLE question_interactions CASCADE;
  TRUNCATE TABLE questions CASCADE;

  -- Study content
  TRUNCATE TABLE study_material_sections CASCADE;
  TRUNCATE TABLE study_guides CASCADE;

  -- Flashcards
  TRUNCATE TABLE flashcards CASCADE;
  TRUNCATE TABLE flashcard_decks CASCADE;

  -- Videos
  TRUNCATE TABLE video_lessons CASCADE;

  -- High-yield
  TRUNCATE TABLE high_yield_content CASCADE;

  -- Exams
  TRUNCATE TABLE system_exams CASCADE;
  TRUNCATE TABLE exam_templates CASCADE;

  -- AI batch
  TRUNCATE TABLE ai_batch_job_logs CASCADE;
  TRUNCATE TABLE ai_batch_jobs CASCADE;
  TRUNCATE TABLE ai_generation_shards CASCADE;
  TRUNCATE TABLE ai_generation_campaigns CASCADE;

  -- Batch plans and dedupe
  TRUNCATE TABLE batch_plans CASCADE;
  TRUNCATE TABLE content_dedupe_registry CASCADE;

  -- Review workflow
  TRUNCATE TABLE content_review_notes CASCADE;
  TRUNCATE TABLE content_review_checks CASCADE;
END;
$$;

COMMENT ON FUNCTION public.admin_reset_content_zero() IS
  'Admin-only: Clears all content tables. Preserves exam_tracks, systems, domains, topics, question_types, profiles, auth.';
