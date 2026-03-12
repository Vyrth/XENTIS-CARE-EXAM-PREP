-- =============================================================================
-- Safe Content Reset Script (reset_content_zero.sql)
-- =============================================================================
-- Clears all content tables while preserving taxonomy and user identity.
-- Uses a transaction for atomicity; rolls back on error.
-- Does NOT drop tables. Does NOT touch exam_tracks, systems, domains, topics,
-- question_types, profiles, user_exam_tracks, auth.users.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. User progress / attempt data (child tables; must clear before parents)
-- -----------------------------------------------------------------------------
-- user_question_attempts -> questions, video_lessons
-- user_flashcard_progress -> flashcards
TRUNCATE TABLE user_question_attempts CASCADE;
TRUNCATE TABLE user_flashcard_progress CASCADE;

-- -----------------------------------------------------------------------------
-- 2. Exam session data (child tables first)
-- -----------------------------------------------------------------------------
-- exam_session_questions -> exam_sessions, questions, question_interactions
-- system_exam_attempts -> exam_sessions, system_exams
TRUNCATE TABLE exam_session_questions CASCADE;
TRUNCATE TABLE system_exam_attempts CASCADE;
TRUNCATE TABLE exam_sessions CASCADE;

-- -----------------------------------------------------------------------------
-- 3. Exam template and system exam linkage
-- -----------------------------------------------------------------------------
-- exam_template_question_pool -> exam_templates, questions
-- system_exam_question_pool -> system_exams, questions
TRUNCATE TABLE exam_template_question_pool CASCADE;
TRUNCATE TABLE system_exam_question_pool CASCADE;

-- -----------------------------------------------------------------------------
-- 4. Question child tables (before questions parent)
-- -----------------------------------------------------------------------------
-- question_options, question_exhibits, question_adaptive_profiles,
-- question_skill_tags, question_interactions -> questions
TRUNCATE TABLE
  question_options,
  question_exhibits,
  question_adaptive_profiles,
  question_skill_tags,
  question_interactions
CASCADE;

-- -----------------------------------------------------------------------------
-- 5. Questions (parent; CASCADE clears any remaining dependents)
-- -----------------------------------------------------------------------------
TRUNCATE TABLE questions CASCADE;

-- -----------------------------------------------------------------------------
-- 6. Study content (sections before guides)
-- -----------------------------------------------------------------------------
-- study_material_sections -> study_guides, study_material_sections (self)
TRUNCATE TABLE study_material_sections CASCADE;
TRUNCATE TABLE study_guides CASCADE;

-- -----------------------------------------------------------------------------
-- 7. Flashcards (cards before decks)
-- -----------------------------------------------------------------------------
TRUNCATE TABLE flashcards CASCADE;
TRUNCATE TABLE flashcard_decks CASCADE;

-- -----------------------------------------------------------------------------
-- 8. Video lessons (CASCADE clears video_quiz_links, video_progress)
-- -----------------------------------------------------------------------------
TRUNCATE TABLE video_lessons CASCADE;

-- -----------------------------------------------------------------------------
-- 9. High-yield content
-- -----------------------------------------------------------------------------
TRUNCATE TABLE high_yield_content CASCADE;

-- -----------------------------------------------------------------------------
-- 10. Exam templates and system exams
-- -----------------------------------------------------------------------------
-- system_exams -> exam_templates; CASCADE from exam_templates clears system_exams
TRUNCATE TABLE exam_templates CASCADE;
TRUNCATE TABLE system_exams CASCADE;

-- -----------------------------------------------------------------------------
-- 11. AI batch and campaign tables
-- -----------------------------------------------------------------------------
-- ai_batch_job_logs -> ai_batch_jobs
-- ai_generation_shards -> ai_generation_campaigns
TRUNCATE TABLE ai_batch_job_logs CASCADE;
TRUNCATE TABLE ai_batch_jobs CASCADE;
TRUNCATE TABLE ai_generation_shards CASCADE;
TRUNCATE TABLE ai_generation_campaigns CASCADE;

-- -----------------------------------------------------------------------------
-- 12. Batch plans and content dedupe
-- -----------------------------------------------------------------------------
-- content_dedupe_registry -> batch_plans (optional), exam_tracks, systems, topics
TRUNCATE TABLE batch_plans CASCADE;
TRUNCATE TABLE content_dedupe_registry CASCADE;

-- -----------------------------------------------------------------------------
-- 13. Content review workflow
-- -----------------------------------------------------------------------------
-- Polymorphic entity_type/entity_id; no FKs to content tables
TRUNCATE TABLE content_review_notes CASCADE;
TRUNCATE TABLE content_review_checks CASCADE;

COMMIT;
