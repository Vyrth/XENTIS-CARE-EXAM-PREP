-- xentis-allow-destructive-change
-- =============================================================================
-- Phase 8: Safe Reset-to-Zero Function
-- =============================================================================
-- Replaces admin_reset_content_zero with comprehensive reset.
-- Preserves: exam_tracks, question_types, domains, systems, topics, subtopics,
-- learning_objectives, topic_system_links, exam_blueprints, system_mastery_targets,
-- adaptive_exam_configs, content_type_review_config, content_type_source_config,
-- profiles, user_exam_tracks, auth, media_assets, content_sources.
--
-- Resets: learner progress, generated content, exam sessions, AI jobs, dedupe.
-- Order respects FK constraints.
-- =============================================================================

DROP FUNCTION IF EXISTS public.admin_reset_content_zero();

CREATE OR REPLACE FUNCTION public.admin_reset_content_zero(
  p_include_ai_jobs BOOLEAN DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- ---------------------------------------------------------------------------
  -- 1. User progress (references content/sessions)
  -- ---------------------------------------------------------------------------
  TRUNCATE TABLE user_question_review_queue CASCADE;
  TRUNCATE TABLE adaptive_question_queue CASCADE;
  TRUNCATE TABLE adaptive_exam_items CASCADE;
  TRUNCATE TABLE adaptive_exam_blueprint_progress CASCADE;
  TRUNCATE TABLE adaptive_exam_sessions CASCADE;
  TRUNCATE TABLE user_flashcard_progress CASCADE;
  TRUNCATE TABLE study_material_progress CASCADE;
  TRUNCATE TABLE video_progress CASCADE;
  TRUNCATE TABLE user_system_checkpoint_progress CASCADE;
  TRUNCATE TABLE system_completion_checkpoints CASCADE;
  TRUNCATE TABLE exam_session_questions CASCADE;
  TRUNCATE TABLE system_exam_attempts CASCADE;
  TRUNCATE TABLE exam_sessions CASCADE;
  TRUNCATE TABLE user_question_attempts CASCADE;

  -- ---------------------------------------------------------------------------
  -- 2. User notes, highlights, mastery, analytics, recommendations
  -- ---------------------------------------------------------------------------
  TRUNCATE TABLE user_notes CASCADE;
  TRUNCATE TABLE user_highlights CASCADE;
  TRUNCATE TABLE user_topic_mastery CASCADE;
  TRUNCATE TABLE user_subtopic_mastery CASCADE;
  TRUNCATE TABLE user_system_mastery CASCADE;
  TRUNCATE TABLE user_domain_mastery CASCADE;
  TRUNCATE TABLE user_skill_mastery CASCADE;
  TRUNCATE TABLE user_item_type_performance CASCADE;
  TRUNCATE TABLE user_readiness_snapshots CASCADE;
  TRUNCATE TABLE user_performance_trends CASCADE;
  TRUNCATE TABLE adaptive_recommendation_profiles CASCADE;
  TRUNCATE TABLE recommended_content_queue CASCADE;
  TRUNCATE TABLE user_remediation_plans CASCADE;
  TRUNCATE TABLE user_study_plans CASCADE;
  TRUNCATE TABLE user_goal_settings CASCADE;
  TRUNCATE TABLE user_streaks CASCADE;

  -- ---------------------------------------------------------------------------
  -- 3. Content link tables
  -- ---------------------------------------------------------------------------
  TRUNCATE TABLE video_quiz_links CASCADE;

  -- ---------------------------------------------------------------------------
  -- 4. Content metadata (polymorphic)
  -- ---------------------------------------------------------------------------
  TRUNCATE TABLE content_source_evidence CASCADE;
  TRUNCATE TABLE content_source_links CASCADE;
  TRUNCATE TABLE content_reviews CASCADE;
  TRUNCATE TABLE content_versions CASCADE;

  -- ---------------------------------------------------------------------------
  -- 5. Question children and calibration
  -- ---------------------------------------------------------------------------
  TRUNCATE TABLE question_calibration CASCADE;
  TRUNCATE TABLE question_performance_baselines CASCADE;
  TRUNCATE TABLE question_options CASCADE;
  TRUNCATE TABLE question_exhibits CASCADE;
  TRUNCATE TABLE question_adaptive_profiles CASCADE;
  TRUNCATE TABLE question_skill_tags CASCADE;
  TRUNCATE TABLE question_interactions CASCADE;
  TRUNCATE TABLE questions CASCADE;

  -- ---------------------------------------------------------------------------
  -- 6. Study content
  -- ---------------------------------------------------------------------------
  TRUNCATE TABLE study_material_sections CASCADE;
  TRUNCATE TABLE study_guides CASCADE;

  -- ---------------------------------------------------------------------------
  -- 7. Flashcards
  -- ---------------------------------------------------------------------------
  TRUNCATE TABLE flashcards CASCADE;
  TRUNCATE TABLE flashcard_decks CASCADE;

  -- ---------------------------------------------------------------------------
  -- 8. Videos
  -- ---------------------------------------------------------------------------
  TRUNCATE TABLE video_lessons CASCADE;

  -- ---------------------------------------------------------------------------
  -- 9. High-yield
  -- ---------------------------------------------------------------------------
  TRUNCATE TABLE high_yield_content CASCADE;

  -- ---------------------------------------------------------------------------
  -- 10. Topic summaries and bundles
  -- ---------------------------------------------------------------------------
  TRUNCATE TABLE topic_summaries CASCADE;
  TRUNCATE TABLE system_study_bundles CASCADE;

  -- ---------------------------------------------------------------------------
  -- 11. Exam pools and assemblies
  -- ---------------------------------------------------------------------------
  TRUNCATE TABLE exam_template_question_pool CASCADE;
  TRUNCATE TABLE system_exam_question_pool CASCADE;
  TRUNCATE TABLE system_exams CASCADE;
  TRUNCATE TABLE exam_templates CASCADE;

  -- ---------------------------------------------------------------------------
  -- 12. Review workflow
  -- ---------------------------------------------------------------------------
  TRUNCATE TABLE content_review_notes CASCADE;
  TRUNCATE TABLE content_review_checks CASCADE;

  -- ---------------------------------------------------------------------------
  -- 13. AI / batch (optional)
  -- ---------------------------------------------------------------------------
  IF p_include_ai_jobs THEN
    TRUNCATE TABLE content_dedupe_registry CASCADE;
    TRUNCATE TABLE ai_batch_job_logs CASCADE;
    TRUNCATE TABLE batch_plans CASCADE;
    TRUNCATE TABLE ai_generation_audit CASCADE;
    TRUNCATE TABLE ai_batch_jobs CASCADE;
    TRUNCATE TABLE ai_campaigns CASCADE;
    TRUNCATE TABLE ai_generation_shards CASCADE;
    TRUNCATE TABLE ai_generation_campaigns CASCADE;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.admin_reset_content_zero(BOOLEAN) IS
  'Phase 8: Admin-only safe reset. Clears content, progress, sessions. Preserves taxonomy, configs, auth. Set p_include_ai_jobs=false to keep AI jobs/campaigns/dedupe.';
