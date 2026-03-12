# Phase 8: Safe Reset-to-Zero — Verification Checklist

## Overview

Phase 8 provides a safe reset that clears all generated content and learner progress while preserving taxonomy and schema integrity.

---

## What Is Preserved

| Category | Tables |
|----------|--------|
| Taxonomy | exam_tracks, domains, systems, topics, subtopics, learning_objectives, topic_system_links |
| Config | exam_blueprints, system_mastery_targets, adaptive_exam_configs |
| Review config | content_type_review_config, content_type_source_config |
| Auth/Profile | profiles, user_exam_tracks, admin_roles, user_admin_roles |
| Reference | media_assets, content_sources, question_types, lab_reference_sets |

---

## What Is Reset

| Category | Tables |
|----------|--------|
| Learner progress | user_question_attempts, user_flashcard_progress, study_material_progress, video_progress, user_notes, user_highlights, user_streaks, user_goal_settings, user_study_plans |
| Mastery/analytics | user_topic_mastery, user_subtopic_mastery, user_system_mastery, user_domain_mastery, user_skill_mastery, user_item_type_performance, user_readiness_snapshots, user_performance_trends, user_question_review_queue |
| Recommendations | adaptive_recommendation_profiles, adaptive_question_queue, recommended_content_queue, user_remediation_plans |
| Exam sessions | exam_sessions, exam_session_questions, system_exam_attempts |
| Adaptive exam | adaptive_exam_sessions, adaptive_exam_items, adaptive_exam_blueprint_progress |
| Content | questions, question_options, question_interactions, question_exhibits, question_skill_tags, question_adaptive_profiles, question_performance_baselines, question_calibration |
| Study | study_guides, study_material_sections, topic_summaries |
| Flashcards | flashcard_decks, flashcards |
| Videos | video_lessons, video_quiz_links |
| High-yield | high_yield_content |
| Bundles | system_study_bundles |
| Exams | exam_templates, exam_template_question_pool, system_exams, system_exam_question_pool |
| Checkpoints | system_completion_checkpoints, user_system_checkpoint_progress |
| Content metadata | content_source_evidence, content_source_links, content_reviews, content_versions |
| Review workflow | content_review_notes, content_review_checks |
| AI (optional) | ai_generation_audit, ai_batch_job_logs, ai_batch_jobs, ai_campaigns, ai_generation_shards, ai_generation_campaigns, batch_plans, content_dedupe_registry |

---

## Post-Reset Verification Checklist

### 1. Admin Overview

- [ ] Admin Overview (`/admin`) loads without errors
- [ ] Draft count shows 0
- [ ] In review count shows 0
- [ ] Ready to publish count shows 0
- [ ] Failed batches shows 0
- [ ] Content by track table shows 0 for all columns (Questions, Guides, Decks, Cards, Videos, High-yield)
- [ ] Generation queue health section is hidden or shows 0s
- [ ] Recent batch errors section is hidden
- [ ] Low coverage alert is hidden or shows empty

### 2. Admin Content Pages

- [ ] `/admin/questions` — empty list or "No questions" state
- [ ] `/admin/study-guides` — empty list
- [ ] `/admin/flashcards` — empty list
- [ ] `/admin/videos` — empty list
- [ ] `/admin/high-yield` — empty list
- [ ] `/admin/review-queue` — empty
- [ ] `/admin/publish-queue` — empty
- [ ] `/admin/content-inventory` — shows 0 for all tracks
- [ ] `/admin/ai-factory` — loads (campaigns/jobs cleared if includeAiJobs=true)

### 3. Learner App

- [ ] `/dashboard` — loads, shows empty/zero state (no fake content)
- [ ] `/questions` — empty state, no questions
- [ ] `/study-guides` — empty state
- [ ] `/flashcards` — empty state
- [ ] `/videos` — empty state
- [ ] `/high-yield` — empty state
- [ ] `/practice` — empty or "no content" state
- [ ] `/topics` — loads (taxonomy preserved), no content counts
- [ ] `/exam/system` — no system exams available

### 4. Taxonomy Intact

- [ ] `/admin/curriculum` — exam tracks, systems, topics visible
- [ ] Track selection in learner app works
- [ ] Systems and topics filter dropdowns populate (from taxonomy)

### 5. Auth/Profile

- [ ] User can log in
- [ ] User exam track selection persists
- [ ] Admin users retain admin access

### 6. No Broken Lookups

- [ ] No 404s or "record not found" from valid navigation
- [ ] No console errors about missing relations
- [ ] Empty states render correctly (no "undefined" or placeholder content)

---

## How to Run Reset

### Via Admin UI

1. Log in as admin
2. Go to Admin Overview (`/admin`)
3. Click "Reset content to zero"
4. Optionally uncheck "Also clear AI jobs, campaigns, batch plans, and dedupe registry"
5. Confirm

### Via API

```bash
# Full reset (content + AI jobs)
curl -X POST https://your-app/api/admin/reset-content \
  -H "Cookie: ..." \
  -H "Content-Type: application/json" \
  -d '{"includeAiJobs": true}'

# Reset content only, keep AI jobs
curl -X POST https://your-app/api/admin/reset-content \
  -H "Cookie: ..." \
  -H "Content-Type: application/json" \
  -d '{"includeAiJobs": false}'
```

### Via SQL (Supabase SQL Editor)

```sql
-- Full reset
SELECT admin_reset_content_zero(true);

-- Content only, keep AI jobs
SELECT admin_reset_content_zero(false);
```

---

## Troubleshooting

| Issue | Check |
|-------|-------|
| RPC not found | Run migration `20250311000000_phase8_safe_reset.sql` |
| Permission denied | Use service role key or ensure function is SECURITY DEFINER |
| FK violation | Migration order may be wrong; check Phase 8 migration |
| Admin counts not 0 | Hard refresh (Cmd+Shift+R) or revalidatePath may not have run |
| Learner sees old content | Check LEARNER_VISIBLE_STATUSES; ensure no mock/fallback data |
