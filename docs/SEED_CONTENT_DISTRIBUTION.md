# Seed Content Distribution

Foundational seed dataset for Xentis Care Exam Prep. Content is board-focused, original, and marked `[Seed]` where applicable for admin identification.

## Content by Track

| Track | Systems | Topics Linked | Study Guides | Flashcard Decks | Video Lessons | Questions | System Exams | Topic Summaries |
|-------|---------|---------------|--------------|-----------------|--------------|-----------|--------------|-----------------|
| **LVN/LPN** | Cardiovascular, Respiratory, Renal | heart-failure, copd, aki | 2 | 1 | 1 | 20 | 2 | 2 |
| **RN** | Cardiovascular, Respiratory, Renal, Psychiatric | heart-failure, copd, aki, depression | 2 | 1 | 2 | 23* | 1 | 1 |
| **FNP** | Cardiovascular, Respiratory, Psychiatric | heart-failure, depression | 2 | 1 | 1 | 20 | 2 | 2 |
| **PMHNP** | Psychiatric, Neurological | depression | 2 | 1 | 1 | 20 | 1 | 1 |

\* RN: 3 from `seed_extended.sql` + 20 from `seed_questions.sql`

## Practice Exam Templates

All tracks have a Pre-Practice Exam template (150q, 180 min) from `seed_extended.sql`.

## File Structure

```
supabase/
├── seed.sql              # Main entry; sources seed_extended + seed_foundational
├── seed_extended.sql     # Base: domains, systems, topics, exam_templates, 3 RN questions
├── seed_foundational.sql # Track-specific: guides, flashcards, videos, system exams, summaries
└── seed_questions.sql    # 20 questions per track (80 total)
```

## How to Extend Content Systematically

### 1. Add More Questions

- **Location:** `seed_questions.sql` or a new `seed_questions_extended.sql`
- **Pattern:** Add rows to `_q_seed` temp table: `(track, sys, domain_slug, stem, opt_a, opt_b, opt_c, opt_d, correct)`
- **Systems:** Use existing slugs: `cardiovascular`, `respiratory`, `renal`, `psychiatric`, `neurological`
- **Domains:** `safe-care`, `psychosocial`, `health-promo`, `physiological`
- **Question options:** Ensure exactly one correct option per question

### 2. Add Study Guides

```sql
INSERT INTO study_guides (exam_track_id, system_id, slug, title, description, display_order, status)
SELECT et.id, s.id, 'unique-slug', 'Title', '[Seed] Description', N, 'approved'
FROM exam_tracks et, systems s
WHERE et.slug = 'rn' AND s.exam_track_id = et.id AND s.slug = 'cardiovascular'
ON CONFLICT (exam_track_id, slug) DO NOTHING;

INSERT INTO study_material_sections (study_guide_id, slug, title, content_markdown, display_order)
SELECT sg.id, 'section-slug', 'Section Title', '**Markdown** content...', 1
FROM study_guides sg JOIN exam_tracks et ON sg.exam_track_id = et.id
WHERE et.slug = 'rn' AND sg.slug = 'unique-slug';
```

### 3. Add Flashcard Decks

```sql
INSERT INTO flashcard_decks (exam_track_id, system_id, name, description, source, is_public)
SELECT et.id, s.id, 'Deck Name', '[Seed] Description', 'platform', true
FROM exam_tracks et, systems s
WHERE et.slug = 'fnp' AND s.exam_track_id = et.id AND s.slug = 'psychiatric';

INSERT INTO flashcards (flashcard_deck_id, front_text, back_text, display_order)
SELECT fd.id, 'Front', 'Back', 1
FROM flashcard_decks fd JOIN systems s ON fd.system_id = s.id
WHERE s.slug = 'psychiatric' AND fd.name = 'Deck Name';
```

### 4. Add Video Lessons

```sql
INSERT INTO video_lessons (exam_track_id, system_id, slug, title, description, video_url, duration_seconds, status)
SELECT et.id, s.id, 'unique-slug', 'Title', '[Seed] Description', 'https://...', 600, 'approved'
FROM exam_tracks et, systems s
WHERE et.slug = 'pmhnp' AND s.exam_track_id = et.id AND s.slug = 'psychiatric'
ON CONFLICT (exam_track_id, slug) DO NOTHING;
```

### 5. Add System Exams

- Requires `question_count >= 50` per schema.
- Populate `system_exam_question_pool` to link questions to the exam.
- Use `ON CONFLICT (exam_track_id, system_id, name) DO NOTHING`.

### 6. Add Topic Summaries

```sql
INSERT INTO topic_summaries (topic_id, exam_track_id, summary_text, key_points)
SELECT t.id, et.id, 'Summary text.', '["Key1", "Key2"]'::jsonb
FROM topics t JOIN domains d ON t.domain_id = d.id, exam_tracks et
WHERE d.slug = 'safe-care' AND t.slug = 'heart-failure' AND et.slug = 'rn'
ON CONFLICT (topic_id, exam_track_id) DO NOTHING;
```

### 7. Add New Systems or Topics

- **Systems:** Per track in `seed_extended.sql`; use `ON CONFLICT (exam_track_id, slug) DO NOTHING`.
- **Topics:** Per domain; add `topic_system_links` in `seed_foundational.sql` to connect topics to systems.

## Idempotency Notes

- Most inserts use `ON CONFLICT ... DO NOTHING` where unique constraints exist.
- `study_material_sections` has no unique constraint; re-running may create duplicate sections. Consider adding `(study_guide_id, slug) UNIQUE` in a migration if needed.
- `seed_questions.sql` uses a temp table and inserts; re-running adds duplicate questions. For idempotent questions, add a check (e.g., `WHERE NOT EXISTS (SELECT 1 FROM questions WHERE stem = ...)`) or use a dedicated migration for one-time seed.

## Running the Seed

```bash
npm run db:local:migrate   # Local only: runs migrations + seed.sql
# Or manually:
psql $DATABASE_URL -f supabase/seed.sql
```

See [Local vs Remote Supabase Commands](LOCAL_VS_REMOTE_SUPABASE.md) — `db push` does not run seed.
