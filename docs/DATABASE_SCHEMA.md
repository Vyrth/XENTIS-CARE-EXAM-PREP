# Xentis Care Exam Prep — Database Schema Reference

## Migration Files (Execution Order)

| # | File | Description |
|---|------|-------------|
| 1 | `20250306000001_extensions_and_enums.sql` | pgcrypto, enums |
| 2 | `20250306000002_taxonomy.sql` | exam_tracks, domains, systems, topics, subtopics, learning_objectives, topic_system_links, exam_blueprints, system_mastery_targets |
| 3 | `20250306000003_assessment_base.sql` | question_types, lab_reference_sets, lab_reference_values |
| 4 | `20250306000004_questions.sql` | questions, question_options, question_interactions, question_exhibits, question_skill_tags, question_performance_baselines, question_adaptive_profiles |
| 5 | `20250306000005_exam_templates.sql` | exam_templates, exam_template_question_pool, system_exams, system_exam_question_pool |
| 6 | `20250306000006_learning_content.sql` | study_guides, study_material_sections, topic_summaries, flashcard_decks, flashcards, video_lessons, video_quiz_links, system_study_bundles |
| 7 | `20250306000007_legal_governance.sql` | media_assets, content_sources, content_source_links, content_reviews, content_versions, question_exhibits.media_asset_id |
| 8 | `20250306000008_profiles.sql` | profiles, user_exam_tracks, admin_roles, user_admin_roles, handle_new_user trigger |
| 9 | `20250306000009_user_learning_progress.sql` | user_notes, user_highlights, study_material_progress, video_progress, user_flashcard_progress, flashcard_decks.user_id, exam_sessions, exam_session_questions, user_question_attempts, system_exam_attempts, system_completion_checkpoints, user_system_checkpoint_progress, user_study_plans, user_goal_settings, user_streaks |
| 10 | `20250306000010_readiness_analytics.sql` | user_topic_mastery, user_subtopic_mastery, user_system_mastery, user_domain_mastery, user_skill_mastery, user_item_type_performance, user_readiness_snapshots, user_performance_trends, user_question_review_queue |
| 11 | `20250306000011_adaptive_recommendations.sql` | adaptive_recommendation_profiles, adaptive_question_queue, recommended_content_queue, user_remediation_plans |
| 12 | `20250306000012_ai.sql` | ai_chunks, ai_prompt_templates, ai_interaction_logs, ai_saved_outputs |
| 13 | `20250306000013_billing_admin.sql` | subscription_plans, user_subscriptions |
| 14 | `20250306000014_rls_policies.sql` | RLS policies for all tables |
| 15 | `20250306000015_updated_at_trigger.sql` | set_updated_at() trigger on all tables with updated_at |

## Entity Relationship Overview

```
exam_tracks ──┬── systems ──┬── system_exams
             │              ├── system_mastery_targets
             │              └── topic_system_links
             ├── domains ─── topics ─── subtopics ─── learning_objectives
             ├── exam_blueprints
             ├── exam_templates ─── exam_template_question_pool
             ├── questions (─┬── question_options
             │               ├── question_interactions
             │               ├── question_exhibits
             │               └── question_skill_tags)
             ├── study_guides ─── study_material_sections
             ├── video_lessons ─── video_quiz_links
             └── flashcard_decks ─── flashcards

profiles (auth.users) ──┬── user_exam_tracks
                        ├── user_notes, user_highlights
                        ├── exam_sessions ─── exam_session_questions
                        ├── user_*_mastery (topic, subtopic, system, domain, skill)
                        ├── adaptive_* (profiles, question_queue, content_queue)
                        └── user_subscriptions
```

## Running Migrations

See **[Local vs Remote Supabase Commands](LOCAL_VS_REMOTE_SUPABASE.md)** to avoid mixing local and remote workflows.

```bash
# Local (requires Docker)
npm run db:local:start
npm run db:local:migrate   # supabase db reset

# Remote (hosted project)
npm run db:remote:push     # supabase db push

# Or apply manually via Supabase Dashboard SQL Editor
```

## Seed Data

Run `supabase/seed.sql` after migrations for:
- exam_tracks (lvn, rn, fnp, pmhnp)
- question_types (13 item types)
- admin_roles (4 roles)
