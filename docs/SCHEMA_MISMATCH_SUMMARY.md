# Schema Mismatch Summary: Seed vs Live Database

## Overview

This document compares the **migration-defined schema** (authoritative) against **seed script assumptions**. If the live Supabase schema differs from migrations (e.g., older project, manual changes), run `supabase/schema_inspection.sql` against the live DB and compare results.

---

## 1. question_types

| Column        | Migration Schema                         | Seed Assumption              | Notes |
|---------------|-------------------------------------------|------------------------------|-------|
| id            | UUID PK DEFAULT gen_random_uuid()         | —                            | OK    |
| slug          | question_type_slug NOT NULL UNIQUE        | INSERT (slug, name, display_order) | OK. **No `code` column** – use `slug` only. |
| name          | TEXT NOT NULL                             | ✓                            | OK    |
| description   | TEXT                                      | —                            | Optional |
| config        | JSONB DEFAULT '{}'                        | —                            | Optional |
| display_order | INT NOT NULL DEFAULT 0                    | ✓                            | OK    |
| created_at    | TIMESTAMPTZ NOT NULL DEFAULT now()        | —                            | Auto  |
| updated_at    | TIMESTAMPTZ NOT NULL DEFAULT now()        | —                            | Auto  |

**Mismatch:** If live DB has `code` instead of `slug`, the schema predates migrations. Use `slug` (enum: `question_type_slug`).

**Unique constraint:** `slug` → `ON CONFLICT (slug) DO NOTHING` is valid.

---

## 2. domains

| Column        | Migration Schema                         | Seed Assumption              | Notes |
|---------------|-------------------------------------------|------------------------------|-------|
| id            | UUID PK DEFAULT gen_random_uuid()         | —                            | OK    |
| slug          | TEXT NOT NULL UNIQUE                      | ✓                            | OK    |
| name          | TEXT NOT NULL                             | ✓                            | OK    |
| description   | TEXT                                      | ✓                            | OK    |
| display_order | INT NOT NULL DEFAULT 0                    | ✓                            | OK    |
| created_at    | TIMESTAMPTZ NOT NULL DEFAULT now()        | —                            | Auto  |
| updated_at    | TIMESTAMPTZ NOT NULL DEFAULT now()        | —                            | Auto  |

**Unique constraint:** `slug` → `ON CONFLICT (slug) DO NOTHING` is valid.

---

## 3. systems

| Column         | Migration Schema                         | Seed Assumption              | Notes |
|----------------|-------------------------------------------|------------------------------|-------|
| id             | UUID PK DEFAULT gen_random_uuid()         | —                            | OK    |
| exam_track_id  | UUID NOT NULL REFERENCES exam_tracks(id)   | ✓                            | OK    |
| slug           | TEXT NOT NULL                             | ✓                            | OK    |
| name           | TEXT NOT NULL                             | ✓                            | OK    |
| description    | TEXT                                      | ✓                            | OK    |
| display_order  | INT NOT NULL DEFAULT 0                    | ✓                            | OK    |
| created_at     | TIMESTAMPTZ NOT NULL DEFAULT now()        | —                            | Auto  |
| updated_at     | TIMESTAMPTZ NOT NULL DEFAULT now()        | —                            | Auto  |

**Unique constraint:** `UNIQUE(exam_track_id, slug)` → `ON CONFLICT (exam_track_id, slug) DO NOTHING` is valid.

---

## 4. topics

| Column        | Migration Schema                         | Seed Assumption              | Notes |
|---------------|-------------------------------------------|------------------------------|-------|
| id            | UUID PK DEFAULT gen_random_uuid()         | —                            | OK    |
| domain_id     | UUID NOT NULL REFERENCES domains(id)      | ✓                            | OK    |
| slug          | TEXT NOT NULL                             | ✓                            | OK    |
| name          | TEXT NOT NULL                             | ✓                            | OK    |
| description   | TEXT                                      | ✓                            | OK    |
| display_order | INT NOT NULL DEFAULT 0                    | ✓                            | OK    |
| created_at    | TIMESTAMPTZ NOT NULL DEFAULT now()        | —                            | Auto  |
| updated_at    | TIMESTAMPTZ NOT NULL DEFAULT now()        | —                            | Auto  |

**Unique constraint:** `UNIQUE(domain_id, slug)` → `ON CONFLICT (domain_id, slug) DO NOTHING` is valid.

---

## 5. study_guides

| Column         | Migration Schema                         | Seed Assumption              | Notes |
|----------------|-------------------------------------------|------------------------------|-------|
| id             | UUID PK DEFAULT gen_random_uuid()         | —                            | OK    |
| exam_track_id  | UUID NOT NULL REFERENCES exam_tracks(id)   | ✓                            | OK    |
| system_id      | UUID REFERENCES systems(id)                | ✓                            | OK    |
| topic_id       | UUID REFERENCES topics(id) *(migration 22)*| —                            | Optional |
| slug           | TEXT NOT NULL                             | ✓                            | OK    |
| title          | TEXT NOT NULL                             | ✓                            | OK    |
| description    | TEXT                                      | ✓                            | OK    |
| display_order  | INT NOT NULL DEFAULT 0                    | ✓                            | OK    |
| status         | content_status NOT NULL DEFAULT 'draft'   | ✓                            | OK    |
| created_at     | TIMESTAMPTZ NOT NULL DEFAULT now()         | —                            | Auto  |
| updated_at     | TIMESTAMPTZ NOT NULL DEFAULT now()         | —                            | Auto  |

**Unique constraint:** `UNIQUE(exam_track_id, slug)` → `ON CONFLICT (exam_track_id, slug) DO NOTHING` is valid.

---

## 6. flashcard_decks

| Column         | Migration Schema                         | Seed Assumption              | Notes |
|----------------|-------------------------------------------|------------------------------|-------|
| id             | UUID PK DEFAULT gen_random_uuid()         | —                            | OK    |
| exam_track_id  | UUID NOT NULL REFERENCES exam_tracks(id)   | ✓                            | OK    |
| system_id      | UUID REFERENCES systems(id)                | ✓                            | OK    |
| topic_id       | UUID REFERENCES topics(id)                 | —                            | Optional |
| name           | TEXT NOT NULL                             | ✓                            | OK    |
| description    | TEXT                                      | ✓                            | OK    |
| source         | TEXT NOT NULL                             | ✓ ('platform', 'user', 'ai')  | OK    |
| is_public      | BOOLEAN NOT NULL DEFAULT false            | ✓                            | OK    |
| deck_type      | TEXT DEFAULT 'standard' *(migration 23)*  | —                            | Optional |
| difficulty     | TEXT DEFAULT 'medium' *(migration 23)*     | —                            | Optional |
| status         | content_status *(migration 23)*            | ✓                            | OK    |
| created_at     | TIMESTAMPTZ NOT NULL DEFAULT now()         | —                            | Auto  |
| updated_at     | TIMESTAMPTZ NOT NULL DEFAULT now()         | —                            | Auto  |

**No unique constraint** on (exam_track_id, name). Seed uses `WHERE NOT EXISTS` ✓.

---

## 7. flashcards

| Column            | Migration Schema                         | Seed Assumption              | Notes |
|-------------------|-------------------------------------------|------------------------------|-------|
| id                | UUID PK DEFAULT gen_random_uuid()         | —                            | OK    |
| flashcard_deck_id | UUID NOT NULL REFERENCES flashcard_decks  | ✓                            | OK    |
| front_text        | TEXT NOT NULL                             | ✓                            | OK    |
| back_text         | TEXT NOT NULL                             | ✓                            | OK    |
| metadata          | JSONB DEFAULT '{}'                        | —                            | Optional |
| display_order     | INT NOT NULL DEFAULT 0                    | ✓                            | OK    |
| created_at        | TIMESTAMPTZ NOT NULL DEFAULT now()        | —                            | Auto  |
| updated_at        | TIMESTAMPTZ NOT NULL DEFAULT now()        | —                            | Auto  |

**No unique constraint.** Re-running seed will create duplicate cards. Use `WHERE NOT EXISTS` if idempotency needed.

---

## 8. questions

| Column               | Migration Schema                         | Seed Assumption              | Notes |
|----------------------|-------------------------------------------|------------------------------|-------|
| id                   | UUID PK DEFAULT gen_random_uuid()         | —                            | OK    |
| exam_track_id        | UUID NOT NULL REFERENCES exam_tracks      | ✓                            | OK    |
| question_type_id     | UUID NOT NULL REFERENCES question_types   | ✓                            | OK    |
| domain_id            | UUID REFERENCES domains                   | ✓                            | OK    |
| system_id            | UUID REFERENCES systems                   | ✓                            | OK    |
| topic_id             | UUID REFERENCES topics                    | ✓                            | OK    |
| subtopic_id          | UUID REFERENCES subtopics                 | —                            | Optional |
| learning_objective_id| UUID REFERENCES learning_objectives       | —                            | Optional |
| stem                 | TEXT NOT NULL                             | ✓                            | OK    |
| stem_metadata        | JSONB DEFAULT '{}'                        | —                            | Optional |
| case_study_parent_id | UUID REFERENCES questions                 | —                            | Optional |
| lab_reference_set_id | UUID REFERENCES lab_reference_sets       | —                            | Optional |
| points               | NUMERIC(5,2) NOT NULL DEFAULT 1.0         | —                            | Default OK |
| status               | content_status NOT NULL DEFAULT 'draft'  | ✓                            | OK    |
| created_at           | TIMESTAMPTZ NOT NULL DEFAULT now()        | —                            | Auto  |
| updated_at           | TIMESTAMPTZ NOT NULL DEFAULT now()        | —                            | Auto  |

**No unique constraint** on content. Re-running creates duplicates. Use `WHERE NOT EXISTS` for idempotency if desired.

---

## 9. question_options

| Column        | Migration Schema                         | Seed Assumption              | Notes |
|---------------|-------------------------------------------|------------------------------|-------|
| id            | UUID PK DEFAULT gen_random_uuid()         | —                            | OK    |
| question_id   | UUID NOT NULL REFERENCES questions        | ✓                            | OK    |
| option_key    | TEXT NOT NULL                             | ✓ ('A','B','C','D')          | OK    |
| option_text   | TEXT                                      | ✓                            | OK    |
| is_correct    | BOOLEAN NOT NULL DEFAULT false            | ✓                            | OK    |
| option_metadata| JSONB DEFAULT '{}'                        | —                            | Optional |
| display_order | INT NOT NULL DEFAULT 0                    | ✓                            | OK    |
| created_at    | TIMESTAMPTZ NOT NULL DEFAULT now()        | —                            | Auto  |
| updated_at    | TIMESTAMPTZ NOT NULL DEFAULT now()        | —                            | Auto  |

**Unique constraint:** `UNIQUE(question_id, option_key)` → `ON CONFLICT (question_id, option_key) DO NOTHING` valid if used.

---

## 10. high_yield_content

| Column             | Migration Schema                         | Seed Assumption              | Notes |
|--------------------|-------------------------------------------|------------------------------|-------|
| id                 | UUID PK DEFAULT gen_random_uuid()         | —                            | OK    |
| content_type       | high_yield_content_type NOT NULL          | ✓ ('high_yield_summary')      | OK    |
| exam_track_id      | UUID NOT NULL REFERENCES exam_tracks      | ✓                            | OK    |
| system_id          | UUID REFERENCES systems                   | ✓                            | OK    |
| topic_id           | UUID REFERENCES topics                    | ✓ (optional)                 | OK    |
| title              | TEXT NOT NULL                             | ✓                            | OK    |
| explanation        | TEXT                                      | ✓                            | OK    |
| why_high_yield     | TEXT                                      | ✓                            | OK    |
| common_confusion   | TEXT                                      | —                            | Optional |
| suggested_practice_link | TEXT                                 | —                            | Optional |
| suggested_guide_link   | TEXT                                 | —                            | Optional |
| high_yield_score   | INT CHECK (0–100)                         | —                            | Optional |
| trap_severity      | INT CHECK (1–5)                           | —                            | Optional |
| confusion_frequency| confusion_frequency                      | —                            | Optional |
| trap_description   | TEXT                                      | —                            | Optional |
| correct_approach   | TEXT                                      | —                            | Optional |
| concept_a, concept_b, key_difference | TEXT                    | —                            | Optional |
| status             | content_status NOT NULL DEFAULT 'draft'   | ✓                            | OK    |
| display_order      | INT NOT NULL DEFAULT 0                    | ✓                            | OK    |
| created_at         | TIMESTAMPTZ NOT NULL DEFAULT now()        | —                            | Auto  |
| updated_at         | TIMESTAMPTZ NOT NULL DEFAULT now()        | —                            | Auto  |

**No unique constraint.** Use `WHERE NOT EXISTS` for idempotency.

---

## Lookup Rows Required Before Seeding

| Table          | Required Before Seed | Provided By                          |
|----------------|---------------------|---------------------------------------|
| exam_tracks    | Yes                 | Migration 19 or seed.sql              |
| question_types | Yes (at least `single_best_answer`) | seed.sql or seed_starter (ON CONFLICT) |
| domains        | Yes                 | seed_starter, seed_extended           |
| systems        | Yes (after exam_tracks) | seed_starter, seed_extended      |
| topics         | Yes (after domains)  | seed_starter, seed_extended           |
| topic_system_links | Yes (after topics, systems) | seed_starter, seed_foundational |

**Note:** Migration 032 only seeds `admin_roles`, not `question_types`. The base `seed.sql` seeds `exam_tracks`, `question_types` (all 13 slugs), and `admin_roles` before extended/foundational/starter seeds.

**Run order:** `seed.sql` → `seed_extended.sql` → `seed_foundational.sql` → `seed_starter.sql`

**Standalone seed_starter:** Can run alone if `exam_tracks` (migration 19) and `question_types` exist. seed_starter inserts `single_best_answer` via ON CONFLICT if missing.

---

## Summary of Fixes for Production Seed

1. **question_types:** Use `slug` only (no `code`). Ensure `slug` values match `question_type_slug` enum.
2. **domains:** Schema matches; `ON CONFLICT (slug)` valid.
3. **study_material_sections:** No unique constraint → use `WHERE NOT EXISTS`.
4. **flashcards:** No unique constraint → use `WHERE NOT EXISTS` to avoid duplicates.
5. **high_yield_content:** No unique constraint → use `WHERE NOT EXISTS`.
6. **questions:** No unique constraint → consider `WHERE NOT EXISTS` on (exam_track_id, stem) for idempotency.
7. **Prefer `WHERE NOT EXISTS`** over `ON CONFLICT` for tables without verified unique constraints.
