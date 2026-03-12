-- =============================================================================
-- Schema Inspection Queries - Run against live Supabase to verify structure
-- =============================================================================
-- Execute in Supabase SQL Editor or: psql $DATABASE_URL -f schema_inspection.sql
-- =============================================================================

-- 1. question_types
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'question_types'
ORDER BY ordinal_position;

-- 2. domains
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'domains'
ORDER BY ordinal_position;

-- 3. systems
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'systems'
ORDER BY ordinal_position;

-- 4. topics
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'topics'
ORDER BY ordinal_position;

-- 5. study_guides
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'study_guides'
ORDER BY ordinal_position;

-- 6. flashcard_decks
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'flashcard_decks'
ORDER BY ordinal_position;

-- 7. flashcards
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'flashcards'
ORDER BY ordinal_position;

-- 8. questions
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'questions'
ORDER BY ordinal_position;

-- 9. question_options
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'question_options'
ORDER BY ordinal_position;

-- 10. high_yield_content
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'high_yield_content'
ORDER BY ordinal_position;

-- 11. Unique constraints (for ON CONFLICT verification)
SELECT tc.table_name, tc.constraint_name, kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
WHERE tc.table_schema = 'public'
  AND tc.constraint_type IN ('UNIQUE', 'PRIMARY KEY')
  AND tc.table_name IN (
    'question_types', 'domains', 'systems', 'topics', 'topic_system_links',
    'study_guides', 'study_material_sections', 'flashcard_decks', 'flashcards',
    'questions', 'question_options', 'high_yield_content', 'exam_templates',
    'exam_template_question_pool', 'exam_tracks'
  )
ORDER BY tc.table_name, tc.constraint_name, kcu.ordinal_position;
