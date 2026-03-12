# Schema Discovery Report

**Generated:** Migration-based analysis (run `supabase/schema_inspection.sql` against live DB for verification)

**Purpose:** Prevent schema mismatch errors by documenting exact column names, enums, constraints, and naming conventions.

---

## 1. Tables Inspected

### 1.1 exam_tracks
**Exists:** Yes (migration 002)

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | UUID | NO | gen_random_uuid() |
| slug | exam_track_slug | NO | — |
| name | TEXT | NO | — |
| description | TEXT | YES | — |
| display_order | INT | NO | 0 |
| created_at | TIMESTAMPTZ | NO | now() |
| updated_at | TIMESTAMPTZ | NO | now() |

**Constraints:** PRIMARY KEY (id), UNIQUE (slug)  
**Indexes:** idx_exam_tracks_slug  
**Naming:** Uses `display_order`, NOT `sort_order`. Track uses `slug` (enum), `name`, `id`.

---

### 1.2 domains
**Exists:** Yes (migration 002)

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | UUID | NO | gen_random_uuid() |
| slug | TEXT | NO | — |
| name | TEXT | NO | — |
| description | TEXT | YES | — |
| display_order | INT | NO | 0 |
| created_at | TIMESTAMPTZ | NO | now() |
| updated_at | TIMESTAMPTZ | NO | now() |

**Constraints:** PRIMARY KEY (id), UNIQUE (slug)  
**Indexes:** idx_domains_slug

---

### 1.3 systems
**Exists:** Yes (migration 002)

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | UUID | NO | gen_random_uuid() |
| exam_track_id | UUID | NO | FK exam_tracks |
| slug | TEXT | NO | — |
| name | TEXT | NO | — |
| description | TEXT | YES | — |
| display_order | INT | NO | 0 |
| created_at | TIMESTAMPTZ | NO | now() |
| updated_at | TIMESTAMPTZ | NO | now() |

**Constraints:** PRIMARY KEY (id), UNIQUE (exam_track_id, slug)  
**Indexes:** idx_systems_exam_track, idx_systems_slug

---

### 1.4 topics
**Exists:** Yes (migration 002)

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | UUID | NO | gen_random_uuid() |
| domain_id | UUID | NO | FK domains |
| slug | TEXT | NO | — |
| name | TEXT | NO | — |
| description | TEXT | YES | — |
| display_order | INT | NO | 0 |
| created_at | TIMESTAMPTZ | NO | now() |
| updated_at | TIMESTAMPTZ | NO | now() |

**Constraints:** PRIMARY KEY (id), UNIQUE (domain_id, slug)

---

### 1.5 questions
**Exists:** Yes (migration 004)

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | UUID | NO | gen_random_uuid() |
| exam_track_id | UUID | NO | FK exam_tracks |
| question_type_id | UUID | NO | FK question_types |
| domain_id | UUID | YES | FK domains |
| system_id | UUID | YES | FK systems |
| topic_id | UUID | YES | FK topics |
| subtopic_id | UUID | YES | FK subtopics |
| learning_objective_id | UUID | YES | FK learning_objectives |
| stem | TEXT | NO | — |
| stem_metadata | JSONB | YES | '{}' |
| case_study_parent_id | UUID | YES | FK questions |
| lab_reference_set_id | UUID | YES | FK lab_reference_sets |
| points | NUMERIC(5,2) | NO | 1.0 |
| status | content_status | NO | 'draft' |
| created_at | TIMESTAMPTZ | NO | now() |
| updated_at | TIMESTAMPTZ | NO | now() |

**Constraints:** PRIMARY KEY (id)  
**Indexes:** idx_questions_exam_track, idx_questions_question_type, idx_questions_system, idx_questions_domain, idx_questions_status, idx_questions_case_study_parent  
**Note:** No `code` column. No `sort_order` or `is_active`.

---

### 1.6 question_options
**Exists:** Yes (migration 004)

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | UUID | NO | gen_random_uuid() |
| question_id | UUID | NO | FK questions |
| option_key | TEXT | NO | — |
| option_text | TEXT | YES | — |
| is_correct | BOOLEAN | NO | false |
| option_metadata | JSONB | YES | '{}' |
| display_order | INT | NO | 0 |
| created_at | TIMESTAMPTZ | NO | now() |
| updated_at | TIMESTAMPTZ | NO | now() |

**Constraints:** PRIMARY KEY (id), UNIQUE (question_id, option_key)

---

### 1.7 question_types
**Exists:** Yes (migration 003)

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | UUID | NO | gen_random_uuid() |
| slug | question_type_slug | NO | — |
| name | TEXT | NO | — |
| description | TEXT | YES | — |
| config | JSONB | YES | '{}' |
| display_order | INT | NO | 0 |
| created_at | TIMESTAMPTZ | NO | now() |
| updated_at | TIMESTAMPTZ | NO | now() |

**Constraints:** PRIMARY KEY (id), UNIQUE (slug)

---

### 1.8 study_guides
**Exists:** Yes (migration 006, 022)

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | UUID | NO | gen_random_uuid() |
| exam_track_id | UUID | NO | FK exam_tracks |
| system_id | UUID | YES | FK systems |
| topic_id | UUID | YES | FK topics (added 022) |
| slug | TEXT | NO | — |
| title | TEXT | NO | — |
| description | TEXT | YES | — |
| display_order | INT | NO | 0 |
| status | content_status | NO | 'draft' |
| created_at | TIMESTAMPTZ | NO | now() |
| updated_at | TIMESTAMPTZ | NO | now() |

**Constraints:** PRIMARY KEY (id), UNIQUE (exam_track_id, slug)

---

### 1.9 flashcard_decks
**Exists:** Yes (migration 006, 009, 023)

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | UUID | NO | gen_random_uuid() |
| exam_track_id | UUID | NO | FK exam_tracks |
| system_id | UUID | YES | FK systems |
| topic_id | UUID | YES | FK topics |
| user_id | UUID | YES | FK profiles (added 009) |
| name | TEXT | NO | — |
| description | TEXT | YES | — |
| source | TEXT | NO | — |
| is_public | BOOLEAN | NO | false |
| deck_type | TEXT | YES | 'standard' (added 023) |
| difficulty | TEXT | YES | 'medium' (added 023) |
| status | content_status | YES | 'draft' (added 023) |
| created_at | TIMESTAMPTZ | NO | now() |
| updated_at | TIMESTAMPTZ | NO | now() |

**Constraints:** PRIMARY KEY (id)  
**Note:** No UNIQUE on (exam_track_id, name). **ON CONFLICT cannot be used for flashcard_decks.** No `code` or `sort_order`.

---

### 1.10 flashcards
**Exists:** Yes (migration 006)

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | UUID | NO | gen_random_uuid() |
| flashcard_deck_id | UUID | NO | FK flashcard_decks |
| front_text | TEXT | NO | — |
| back_text | TEXT | NO | — |
| metadata | JSONB | YES | '{}' |
| display_order | INT | NO | 0 |
| created_at | TIMESTAMPTZ | NO | now() |
| updated_at | TIMESTAMPTZ | NO | now() |

**Constraints:** PRIMARY KEY (id)  
**Note:** No UNIQUE. **ON CONFLICT cannot be used for flashcards.**

---

### 1.11 high_yield_content
**Exists:** Yes (migration 025)

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | UUID | NO | gen_random_uuid() |
| content_type | high_yield_content_type | NO | — |
| exam_track_id | UUID | NO | FK exam_tracks |
| system_id | UUID | YES | FK systems |
| topic_id | UUID | YES | FK topics |
| title | TEXT | NO | — |
| explanation | TEXT | YES | — |
| why_high_yield | TEXT | YES | — |
| common_confusion | TEXT | YES | — |
| suggested_practice_link | TEXT | YES | — |
| suggested_guide_link | TEXT | YES | — |
| high_yield_score | INT | YES | CHECK 0-100 |
| trap_severity | INT | YES | CHECK 1-5 |
| confusion_frequency | confusion_frequency | YES | — |
| trap_description | TEXT | YES | — |
| correct_approach | TEXT | YES | — |
| concept_a | TEXT | YES | — |
| concept_b | TEXT | YES | — |
| key_difference | TEXT | YES | — |
| status | content_status | NO | 'draft' |
| display_order | INT | NO | 0 |
| created_at | TIMESTAMPTZ | NO | now() |
| updated_at | TIMESTAMPTZ | NO | now() |

**Constraints:** PRIMARY KEY (id)  
**Note:** No UNIQUE. **ON CONFLICT cannot be used for high_yield_content.**

---

### 1.12 batch_plans
**Exists:** Yes (migration 030, CREATE TABLE IF NOT EXISTS)

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | UUID | NO | gen_random_uuid() |
| exam_track_id | UUID | NO | FK exam_tracks |
| system_id | UUID | YES | FK systems |
| topic_id | UUID | YES | FK topics |
| target_questions | INT | NO | 0 |
| target_guides | INT | NO | 0 |
| target_decks | INT | NO | 0 |
| target_videos | INT | NO | 0 |
| target_high_yield | INT | NO | 0 |
| status | batch_plan_status | NO | 'planned' |
| owner_id | UUID | YES | FK auth.users |
| reviewer_id | UUID | YES | FK auth.users |
| notes | TEXT | YES | — |
| created_at | TIMESTAMPTZ | NO | now() |
| updated_at | TIMESTAMPTZ | NO | now() |

**Constraints:** PRIMARY KEY (id)  
**Note:** No UNIQUE. No `code`, `sort_order`, or `is_active`.

---

### 1.13 ai_batch_jobs
**Exists:** Yes (migration 034, 036, 039)

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | UUID | NO | gen_random_uuid() |
| exam_track_id | UUID | NO | FK exam_tracks |
| content_type | TEXT | NO | — |
| topic_ids | JSONB | YES | '[]' |
| system_ids | JSONB | YES | '[]' |
| target_count | INT | NO | — |
| quantity_per_topic | INT | YES | — |
| difficulty_distribution | JSONB | YES | '{}' |
| board_focus | TEXT | YES | — |
| item_type_slug | TEXT | YES | 'single_best_answer' |
| study_guide_mode | TEXT | YES | 'section_pack' |
| section_count | INT | YES | 4 |
| flashcard_deck_mode | TEXT | YES | 'rapid_recall' |
| card_count | INT | YES | 8 |
| high_yield_type | TEXT | YES | 'high_yield_summary' |
| status | ai_batch_job_status | NO | 'pending' |
| completed_count | INT | NO | 0 |
| failed_count | INT | NO | 0 |
| skipped_duplicate_count | INT | NO | 0 |
| generated_count | INT | NO | 0 (added 036) |
| retry_count | INT | NO | 0 (added 036) |
| idempotency_key | TEXT | YES | UNIQUE (added 039) |
| created_by | UUID | YES | FK auth.users |
| created_at | TIMESTAMPTZ | NO | now() |
| updated_at | TIMESTAMPTZ | NO | now() |
| completed_at | TIMESTAMPTZ | YES | — |
| error_message | TEXT | YES | — |
| metadata | JSONB | YES | '{}' |
| batch_job_id | — | — | (FK to ai_batch_jobs in ai_generation_audit) |

---

### 1.14 ai_batch_job_logs
**Exists:** Yes (migration 036)

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | UUID | NO | gen_random_uuid() |
| batch_job_id | UUID | NO | FK ai_batch_jobs |
| event_type | TEXT | NO | — |
| message | TEXT | YES | — |
| metadata | JSONB | YES | '{}' |
| created_at | TIMESTAMPTZ | NO | now() |

**Constraints:** PRIMARY KEY (id)  
**Note:** No UNIQUE. **ON CONFLICT cannot be used.**

---

### 1.15 content_reviews
**Exists:** Yes (migration 007)

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | UUID | NO | gen_random_uuid() |
| content_type | TEXT | NO | — |
| content_id | UUID | NO | — |
| status | content_status | NO | — |
| reviewed_by | UUID | YES | — |
| reviewed_at | TIMESTAMPTZ | YES | — |
| notes | TEXT | YES | — |
| created_at | TIMESTAMPTZ | NO | now() |
| updated_at | TIMESTAMPTZ | NO | now() |

**Constraints:** PRIMARY KEY (id)  
**Note:** No UNIQUE on (content_type, content_id). Multiple reviews per content allowed.

---

### 1.16 content_source_links
**Exists:** Yes (migration 007)

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | UUID | NO | gen_random_uuid() |
| content_source_id | UUID | NO | FK content_sources |
| content_type | TEXT | NO | — |
| content_id | UUID | NO | — |
| excerpt | TEXT | YES | — |
| created_at | TIMESTAMPTZ | NO | now() |
| updated_at | TIMESTAMPTZ | NO | now() |

**Constraints:** PRIMARY KEY (id), UNIQUE (content_source_id, content_type, content_id)  
**ON CONFLICT (content_source_id, content_type, content_id) DO NOTHING** — safe.

---

### 1.17 admin_roles
**Exists:** Yes (migration 008)

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | UUID | NO | gen_random_uuid() |
| slug | admin_role_slug | NO | — |
| name | TEXT | NO | — |
| description | TEXT | YES | — |
| permissions | JSONB | YES | '[]' |
| created_at | TIMESTAMPTZ | NO | now() |
| updated_at | TIMESTAMPTZ | NO | now() |

**Constraints:** PRIMARY KEY (id), UNIQUE (slug)  
**ON CONFLICT (slug) DO NOTHING** — safe.

---

## 2. Enum Types

### 2.1 exam_track_slug
- `lvn`, `rn`, `fnp`, `pmhnp`

### 2.2 question_type_slug
- `single_best_answer`, `multiple_response`, `select_n`, `image_based`, `chart_table_exhibit`, `matrix`, `dropdown_cloze`, `ordered_response`, `hotspot`, `highlight_text_table`, `case_study`, `bow_tie_analog`, `dosage_calc`

### 2.3 content_status (extended in migration 027)
- `draft`, `review`, `approved`, `archived` (original)
- `editor_review`, `sme_review`, `legal_review`, `qa_review`, `published`, `retired`, `needs_revision` (added)

**Note:** Migration 031 backfills `review` → `editor_review` and `archived` → `retired`.

### 2.4 high_yield_content_type
- `high_yield_summary`, `common_confusion`, `board_trap`, `compare_contrast_summary`

### 2.5 confusion_frequency
- `common`, `very_common`, `extremely_common`

### 2.6 admin_role_slug (extended in migration 027)
- `super_admin`, `content_editor`, `support`, `analytics_viewer` (original)
- `sme_reviewer`, `legal_reviewer`, `qa_reviewer` (added)

### 2.7 Other enums
- `exam_session_status`: in_progress, completed, abandoned, expired
- `subscription_status`: active, canceled, past_due, trialing, incomplete
- `media_asset_type`: image, video, pdf, audio
- `mastery_level`: not_started, learning, developing, proficient, mastered
- `recommendation_priority`: low, medium, high, critical
- `batch_plan_status`: planned, in_progress, under_review, completed
- `ai_batch_job_status`: pending, running, completed, failed, cancelled

---

## 3. Tables Using display_order (NOT sort_order)

All tables use: **display_order**

- exam_tracks, domains, systems, topics, subtopics, learning_objectives
- topic_system_links, question_types, question_options, question_interactions
- question_exhibits, lab_reference_sets, lab_reference_values
- study_guides, study_material_sections, flashcard_decks, flashcards
- video_lessons, video_quiz_links, system_study_bundles
- high_yield_content
- system_exam_question_pool (display_order)

**Never assume `sort_order` or `is_active`.** Verify column names before use.

---

## 4. Track Fields: slug / name / id

| Table | Track field | Type |
|-------|-------------|------|
| exam_tracks | slug (enum), name, id | exam_track_slug, TEXT, UUID |
| systems | slug (TEXT), name, id | exam_track_id FK |
| domains | slug (TEXT), name, id | No track FK |
| topics | slug (TEXT), name, id | domain_id FK |

---

## 5. ON CONFLICT Safety

| Table | Unique constraint | ON CONFLICT safe? |
|-------|-------------------|-------------------|
| exam_tracks | (slug) | Yes |
| domains | (slug) | Yes |
| systems | (exam_track_id, slug) | Yes |
| topics | (domain_id, slug) | Yes |
| topic_system_links | (topic_id, system_id) | Yes |
| question_types | (slug) | Yes |
| study_guides | (exam_track_id, slug) | Yes |
| video_lessons | (exam_track_id, slug) | Yes |
| exam_templates | (exam_track_id, slug) | Yes |
| exam_template_question_pool | (exam_template_id, question_id) | Yes |
| system_exams | (exam_track_id, system_id, name) | Yes |
| system_exam_question_pool | (system_exam_id, question_id) | Yes |
| topic_summaries | (topic_id, exam_track_id) | Yes |
| user_exam_tracks | (user_id, exam_track_id) | Yes |
| admin_roles | (slug) | Yes |
| content_type_review_config | (content_type) | Yes |
| content_type_source_config | (content_type) | Yes |
| content_source_evidence | (content_type, content_id) | Yes |
| **study_material_sections** | **None** | **No** |
| **flashcard_decks** | **None** | **No** |
| **flashcards** | **None** | **No** |
| **high_yield_content** | **None** | **No** |
| **batch_plans** | **None** | **No** |
| **content_reviews** | **None** | **No** |

---

## 6. Risky Schema Mismatches

1. **No `code` column** in questions, systems, domains, topics, study_guides, flashcard_decks, high_yield_content. Use `slug` or `id`.
2. **No `sort_order`** — use `display_order`.
3. **No `is_active`** anywhere — use `status` or omit.
4. **study_material_sections** has no UNIQUE on (study_guide_id, slug) — seeds use plain INSERT; ON CONFLICT would fail.
5. **flashcard_decks** and **flashcards** have no UNIQUE — seeds cannot use ON CONFLICT.
6. **content_reviews** allows multiple rows per (content_type, content_id) — no UNIQUE.
7. **content_status** enum: `review` and `archived` are deprecated in favor of `editor_review` and `retired` (migration 031).

---

## 7. RLS Policies

- **profiles**: Users can view/update own
- **user_exam_tracks**: Users can manage own
- **user_admin_roles**: Admins can view; only admins can manage
- **exam_sessions**: Users can manage own
- **exam_session_questions**: Via session ownership
- **flashcard_decks**: Users can view platform + own; manage own only for user_id
- **user_notes, user_highlights, study_material_progress, video_progress, user_flashcard_progress**: Users can manage own
- **admin_audit_logs**: Admins can read; service can insert

---

## 8. Live Verification

Run `supabase/schema_inspection.sql` against your Supabase project to verify:

```bash
psql $DATABASE_URL -f supabase/schema_inspection.sql
```

Or in Supabase SQL Editor. Compare output with this report.
