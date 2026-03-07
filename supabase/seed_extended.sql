-- =============================================================================
-- Extended Seed Data - Systems, Topics, Questions, Content (all 4 tracks)
-- =============================================================================
-- Run after base seed. Use: supabase db reset (runs seed.sql which sources this)
-- Or run manually: psql -f supabase/seed_extended.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- domains (shared across tracks)
-- -----------------------------------------------------------------------------
INSERT INTO domains (slug, name, description, display_order) VALUES
  ('safe-care', 'Safe and Effective Care Environment', 'Safety, infection control, management of care', 1),
  ('health-promo', 'Health Promotion and Maintenance', 'Growth, development, prevention', 2),
  ('psychosocial', 'Psychosocial Integrity', 'Coping, mental health, support', 3),
  ('physiological', 'Physiological Integrity', 'Basic care, pharmacological therapies', 4)
ON CONFLICT (slug) DO NOTHING;

-- -----------------------------------------------------------------------------
-- systems (per track - LVN, RN, FNP, PMHNP)
-- -----------------------------------------------------------------------------
INSERT INTO systems (exam_track_id, slug, name, description, display_order)
SELECT et.id, 'cardiovascular', 'Cardiovascular', 'Heart, circulation, ECG', 1
FROM exam_tracks et WHERE et.slug = 'lvn'
ON CONFLICT (exam_track_id, slug) DO NOTHING;

INSERT INTO systems (exam_track_id, slug, name, description, display_order)
SELECT et.id, 'respiratory', 'Respiratory', 'Lungs, oxygenation', 2
FROM exam_tracks et WHERE et.slug = 'lvn'
ON CONFLICT (exam_track_id, slug) DO NOTHING;

INSERT INTO systems (exam_track_id, slug, name, description, display_order)
SELECT et.id, 'renal', 'Renal', 'Kidneys, fluids, electrolytes', 3
FROM exam_tracks et WHERE et.slug = 'lvn'
ON CONFLICT (exam_track_id, slug) DO NOTHING;

INSERT INTO systems (exam_track_id, slug, name, description, display_order)
SELECT et.id, 'cardiovascular', 'Cardiovascular', 'Heart, circulation, ECG', 1
FROM exam_tracks et WHERE et.slug = 'rn'
ON CONFLICT (exam_track_id, slug) DO NOTHING;

INSERT INTO systems (exam_track_id, slug, name, description, display_order)
SELECT et.id, 'respiratory', 'Respiratory', 'Lungs, oxygenation', 2
FROM exam_tracks et WHERE et.slug = 'rn'
ON CONFLICT (exam_track_id, slug) DO NOTHING;

INSERT INTO systems (exam_track_id, slug, name, description, display_order)
SELECT et.id, 'renal', 'Renal', 'Kidneys, fluids, electrolytes', 3
FROM exam_tracks et WHERE et.slug = 'rn'
ON CONFLICT (exam_track_id, slug) DO NOTHING;

INSERT INTO systems (exam_track_id, slug, name, description, display_order)
SELECT et.id, 'psychiatric', 'Psychiatric', 'Mental health, psychopharmacology', 4
FROM exam_tracks et WHERE et.slug = 'rn'
ON CONFLICT (exam_track_id, slug) DO NOTHING;

INSERT INTO systems (exam_track_id, slug, name, description, display_order)
SELECT et.id, 'cardiovascular', 'Cardiovascular', 'Heart, circulation', 1
FROM exam_tracks et WHERE et.slug = 'fnp'
ON CONFLICT (exam_track_id, slug) DO NOTHING;

INSERT INTO systems (exam_track_id, slug, name, description, display_order)
SELECT et.id, 'respiratory', 'Respiratory', 'Lungs, oxygenation', 2
FROM exam_tracks et WHERE et.slug = 'fnp'
ON CONFLICT (exam_track_id, slug) DO NOTHING;

INSERT INTO systems (exam_track_id, slug, name, description, display_order)
SELECT et.id, 'psychiatric', 'Psychiatric', 'Mental health', 3
FROM exam_tracks et WHERE et.slug = 'fnp'
ON CONFLICT (exam_track_id, slug) DO NOTHING;

INSERT INTO systems (exam_track_id, slug, name, description, display_order)
SELECT et.id, 'psychiatric', 'Psychiatric', 'Mental health, psychopharmacology', 1
FROM exam_tracks et WHERE et.slug = 'pmhnp'
ON CONFLICT (exam_track_id, slug) DO NOTHING;

INSERT INTO systems (exam_track_id, slug, name, description, display_order)
SELECT et.id, 'neurological', 'Neurological', 'Brain, CNS', 2
FROM exam_tracks et WHERE et.slug = 'pmhnp'
ON CONFLICT (exam_track_id, slug) DO NOTHING;

-- -----------------------------------------------------------------------------
-- topics (per domain)
-- -----------------------------------------------------------------------------
INSERT INTO topics (domain_id, slug, name, description, display_order)
SELECT d.id, 'heart-failure', 'Heart Failure', 'HFrEF, HFpEF, management', 1
FROM domains d WHERE d.slug = 'safe-care'
ON CONFLICT (domain_id, slug) DO NOTHING;

INSERT INTO topics (domain_id, slug, name, description, display_order)
SELECT d.id, 'arrhythmias', 'Arrhythmias', 'Atrial fib, VT, bradycardia', 2
FROM domains d WHERE d.slug = 'safe-care'
ON CONFLICT (domain_id, slug) DO NOTHING;

INSERT INTO topics (domain_id, slug, name, description, display_order)
SELECT d.id, 'copd', 'COPD', 'Emphysema, chronic bronchitis', 3
FROM domains d WHERE d.slug = 'safe-care'
ON CONFLICT (domain_id, slug) DO NOTHING;

INSERT INTO topics (domain_id, slug, name, description, display_order)
SELECT d.id, 'aki', 'Acute Kidney Injury', 'Prerenal, intrarenal, postrenal', 4
FROM domains d WHERE d.slug = 'safe-care'
ON CONFLICT (domain_id, slug) DO NOTHING;

INSERT INTO topics (domain_id, slug, name, description, display_order)
SELECT d.id, 'depression', 'Depression', 'MDD, assessment, treatment', 5
FROM domains d WHERE d.slug = 'psychosocial'
ON CONFLICT (domain_id, slug) DO NOTHING;

-- -----------------------------------------------------------------------------
-- subtopics (per topic)
-- -----------------------------------------------------------------------------
INSERT INTO subtopics (topic_id, slug, name, description, display_order)
SELECT t.id, 'hfref', 'HFrEF', 'Reduced ejection fraction', 1
FROM topics t JOIN domains d ON t.domain_id = d.id WHERE d.slug = 'safe-care' AND t.slug = 'heart-failure'
ON CONFLICT (topic_id, slug) DO NOTHING;

INSERT INTO subtopics (topic_id, slug, name, description, display_order)
SELECT t.id, 'pharmacology', 'Pharmacology', 'GDMT, diuretics', 2
FROM topics t JOIN domains d ON t.domain_id = d.id WHERE d.slug = 'safe-care' AND t.slug = 'heart-failure'
ON CONFLICT (topic_id, slug) DO NOTHING;

INSERT INTO subtopics (topic_id, slug, name, description, display_order)
SELECT t.id, 'oxygen-therapy', 'Oxygen Therapy', 'Hypoxic drive, CO2 narcosis', 1
FROM topics t JOIN domains d ON t.domain_id = d.id WHERE d.slug = 'safe-care' AND t.slug = 'copd'
ON CONFLICT (topic_id, slug) DO NOTHING;

-- -----------------------------------------------------------------------------
-- topic_system_links (topics to systems)
-- -----------------------------------------------------------------------------
INSERT INTO topic_system_links (topic_id, system_id, display_order)
SELECT t.id, s.id, 1
FROM topics t
JOIN domains d ON t.domain_id = d.id
CROSS JOIN systems s
JOIN exam_tracks et ON s.exam_track_id = et.id
WHERE d.slug = 'safe-care' AND t.slug = 'heart-failure' AND s.slug = 'cardiovascular' AND et.slug = 'rn'
ON CONFLICT (topic_id, system_id) DO NOTHING;

INSERT INTO topic_system_links (topic_id, system_id, display_order)
SELECT t.id, s.id, 1
FROM topics t
JOIN domains d ON t.domain_id = d.id
CROSS JOIN systems s
JOIN exam_tracks et ON s.exam_track_id = et.id
WHERE d.slug = 'safe-care' AND t.slug = 'copd' AND s.slug = 'respiratory' AND et.slug = 'rn'
ON CONFLICT (topic_id, system_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- lab_reference_sets & lab_reference_values
-- -----------------------------------------------------------------------------
INSERT INTO lab_reference_sets (slug, name, description, display_order) VALUES
  ('cbc', 'Complete Blood Count', 'CBC values', 1),
  ('bmp', 'Basic Metabolic Panel', 'Electrolytes, BUN, Cr', 2),
  ('coag', 'Coagulation', 'PT, INR, PTT', 3)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO lab_reference_values (lab_reference_set_id, name, abbreviation, unit, reference_range_low, reference_range_high, display_order)
SELECT lrs.id, 'Hemoglobin', 'Hgb', 'g/dL', 12, 16, 1
FROM lab_reference_sets lrs WHERE lrs.slug = 'cbc';

INSERT INTO lab_reference_values (lab_reference_set_id, name, abbreviation, unit, reference_range_low, reference_range_high, display_order)
SELECT lrs.id, 'Potassium', 'K+', 'mEq/L', 3.5, 5.0, 1
FROM lab_reference_sets lrs WHERE lrs.slug = 'bmp';

-- -----------------------------------------------------------------------------
-- questions (RN track, single_best_answer)
-- -----------------------------------------------------------------------------
INSERT INTO questions (exam_track_id, question_type_id, domain_id, system_id, topic_id, stem, status)
SELECT
  et.id,
  qt.id,
  d.id,
  s.id,
  t.id,
  'A 65-year-old patient with hypertension presents with chest pain radiating to the left arm. Vital signs: BP 90/60, HR 110, RR 24. Which nursing action is the priority?',
  'approved'
FROM exam_tracks et, question_types qt, domains d, systems s
LEFT JOIN topics t ON t.domain_id = d.id AND t.slug = 'heart-failure'
WHERE et.slug = 'rn' AND qt.slug = 'single_best_answer' AND d.slug = 'safe-care'
  AND s.exam_track_id = et.id AND s.slug = 'cardiovascular'
LIMIT 1;

INSERT INTO question_options (question_id, option_key, option_text, is_correct, display_order)
SELECT q.id, 'A', 'Administer nitroglycerin sublingually', false, 1
FROM questions q
JOIN exam_tracks et ON q.exam_track_id = et.id
WHERE et.slug = 'rn' AND q.stem LIKE '%chest pain radiating%'
LIMIT 1;

INSERT INTO question_options (question_id, option_key, option_text, is_correct, display_order)
SELECT q.id, 'B', 'Obtain a 12-lead ECG within 10 minutes', true, 2
FROM questions q
JOIN exam_tracks et ON q.exam_track_id = et.id
WHERE et.slug = 'rn' AND q.stem LIKE '%chest pain radiating%'
LIMIT 1;

INSERT INTO question_options (question_id, option_key, option_text, is_correct, display_order)
SELECT q.id, 'C', 'Place patient in high Fowler''s position', false, 3
FROM questions q
JOIN exam_tracks et ON q.exam_track_id = et.id
WHERE et.slug = 'rn' AND q.stem LIKE '%chest pain radiating%'
LIMIT 1;

INSERT INTO question_options (question_id, option_key, option_text, is_correct, display_order)
SELECT q.id, 'D', 'Start an IV and draw cardiac enzymes', false, 4
FROM questions q
JOIN exam_tracks et ON q.exam_track_id = et.id
WHERE et.slug = 'rn' AND q.stem LIKE '%chest pain radiating%'
LIMIT 1;

-- Second question (COPD)
INSERT INTO questions (exam_track_id, question_type_id, domain_id, system_id, stem, status)
SELECT et.id, qt.id, d.id, s.id,
  'A patient with COPD is receiving supplemental oxygen at 4 L/min via nasal cannula. The nurse notes the patient''s respiratory rate has decreased from 24 to 12/min and the patient is increasingly drowsy. What is the most likely cause?',
  'approved'
FROM exam_tracks et, question_types qt, domains d, systems s
WHERE et.slug = 'rn' AND qt.slug = 'single_best_answer' AND d.slug = 'safe-care'
  AND s.exam_track_id = et.id AND s.slug = 'respiratory'
LIMIT 1;

INSERT INTO question_options (question_id, option_key, option_text, is_correct, display_order)
SELECT q.id, 'A', 'Oxygen-induced hypoventilation (CO2 narcosis)', true
FROM questions q JOIN exam_tracks et ON q.exam_track_id = et.id
WHERE et.slug = 'rn' AND q.stem LIKE '%COPD%4 L/min%'
LIMIT 1;

INSERT INTO question_options (question_id, option_key, option_text, is_correct, display_order)
SELECT q.id, 'B', 'Pneumonia', false
FROM questions q JOIN exam_tracks et ON q.exam_track_id = et.id
WHERE et.slug = 'rn' AND q.stem LIKE '%COPD%4 L/min%'
LIMIT 1;

INSERT INTO question_options (question_id, option_key, option_text, is_correct, display_order)
SELECT q.id, 'C', 'Pulmonary embolism', false
FROM questions q JOIN exam_tracks et ON q.exam_track_id = et.id
WHERE et.slug = 'rn' AND q.stem LIKE '%COPD%4 L/min%'
LIMIT 1;

INSERT INTO question_options (question_id, option_key, option_text, is_correct, display_order)
SELECT q.id, 'D', 'Anxiety reduction', false
FROM questions q JOIN exam_tracks et ON q.exam_track_id = et.id
WHERE et.slug = 'rn' AND q.stem LIKE '%COPD%4 L/min%'
LIMIT 1;

-- Add more questions for LVN, FNP, PMHNP (abbreviated for seed)
INSERT INTO questions (exam_track_id, question_type_id, domain_id, system_id, stem, status)
SELECT et.id, qt.id, d.id, s.id,
  'A 45-year-old patient presents with acute onset of severe flank pain and hematuria. CT scan shows a 6mm kidney stone. Which intervention should the nurse anticipate first?',
  'approved'
FROM exam_tracks et, question_types qt, domains d, systems s
WHERE et.slug = 'rn' AND qt.slug = 'single_best_answer' AND d.slug = 'safe-care'
  AND s.exam_track_id = et.id AND s.slug = 'renal'
LIMIT 1;

INSERT INTO question_options (question_id, option_key, option_text, is_correct, display_order)
SELECT q.id, 'A', 'Lithotripsy', false FROM questions q JOIN exam_tracks et ON q.exam_track_id = et.id WHERE et.slug = 'rn' AND q.stem LIKE '%kidney stone%' LIMIT 1;
INSERT INTO question_options (question_id, option_key, option_text, is_correct, display_order)
SELECT q.id, 'B', 'Ureteroscopy with stone extraction', false FROM questions q JOIN exam_tracks et ON q.exam_track_id = et.id WHERE et.slug = 'rn' AND q.stem LIKE '%kidney stone%' LIMIT 1;
INSERT INTO question_options (question_id, option_key, option_text, is_correct, display_order)
SELECT q.id, 'C', 'Pain management and increased fluid intake', true FROM questions q JOIN exam_tracks et ON q.exam_track_id = et.id WHERE et.slug = 'rn' AND q.stem LIKE '%kidney stone%' LIMIT 1;
INSERT INTO question_options (question_id, option_key, option_text, is_correct, display_order)
SELECT q.id, 'D', 'Nephrostomy tube placement', false FROM questions q JOIN exam_tracks et ON q.exam_track_id = et.id WHERE et.slug = 'rn' AND q.stem LIKE '%kidney stone%' LIMIT 1;

-- -----------------------------------------------------------------------------
-- question_skill_tags
-- -----------------------------------------------------------------------------
INSERT INTO question_skill_tags (question_id, skill_slug, skill_name)
SELECT q.id, 'prioritization', 'Prioritization'
FROM questions q JOIN exam_tracks et ON q.exam_track_id = et.id
WHERE et.slug = 'rn' AND q.stem LIKE '%chest pain radiating%'
ON CONFLICT (question_id, skill_slug) DO NOTHING;

-- -----------------------------------------------------------------------------
-- exam_templates (Pre-Practice 150q, etc.)
-- -----------------------------------------------------------------------------
INSERT INTO exam_templates (exam_track_id, slug, name, description, question_count, duration_minutes, blueprint_type)
SELECT et.id, 'pre_practice', 'Pre-Practice Exam', 'Full-length 150-question diagnostic', 150, 180, 'pre_practice'
FROM exam_tracks et WHERE et.slug = 'rn'
ON CONFLICT (exam_track_id, slug) DO NOTHING;

INSERT INTO exam_templates (exam_track_id, slug, name, description, question_count, duration_minutes, blueprint_type)
SELECT et.id, 'pre_practice', 'Pre-Practice Exam', 'Full-length diagnostic', 150, 180, 'pre_practice'
FROM exam_tracks et WHERE et.slug IN ('lvn', 'fnp', 'pmhnp')
ON CONFLICT (exam_track_id, slug) DO NOTHING;

-- -----------------------------------------------------------------------------
-- system_exams (50+ questions per system)
-- -----------------------------------------------------------------------------
INSERT INTO system_exams (exam_track_id, system_id, name, description, question_count, duration_minutes)
SELECT et.id, s.id, 'Cardiovascular System Exam', '50-question cardiovascular practice', 50, 60
FROM exam_tracks et, systems s
WHERE et.slug = 'rn' AND s.exam_track_id = et.id AND s.slug = 'cardiovascular'
ON CONFLICT (exam_track_id, system_id, name) DO NOTHING;

-- -----------------------------------------------------------------------------
-- study_guides & study_material_sections
-- -----------------------------------------------------------------------------
INSERT INTO study_guides (exam_track_id, system_id, slug, title, description, display_order, status)
SELECT et.id, s.id, 'cardiovascular-guide', 'Cardiovascular System', 'Heart failure, arrhythmias, ECG', 1, 'approved'
FROM exam_tracks et, systems s
WHERE et.slug = 'rn' AND s.exam_track_id = et.id AND s.slug = 'cardiovascular'
ON CONFLICT (exam_track_id, slug) DO NOTHING;

INSERT INTO study_material_sections (study_guide_id, slug, title, content_markdown, display_order)
SELECT sg.id, 'heart-failure', 'Heart Failure Overview', 'Heart failure (HF) is a clinical syndrome. **Key concepts:** HFrEF (EF <40%), HFpEF (EF ≥50%). GDMT includes ACE-I, beta-blockers, MRAs, SGLT2i.', 1
FROM study_guides sg JOIN exam_tracks et ON sg.exam_track_id = et.id
WHERE et.slug = 'rn' AND sg.slug = 'cardiovascular-guide';

INSERT INTO study_material_sections (study_guide_id, slug, title, content_markdown, display_order)
SELECT sg.id, 'assessment', 'Assessment', 'Signs: dyspnea, orthopnea, S3 gallop, JVD. BNP/NT-proBNP elevated. Echo for EF.', 2
FROM study_guides sg JOIN exam_tracks et ON sg.exam_track_id = et.id
WHERE et.slug = 'rn' AND sg.slug = 'cardiovascular-guide';

-- -----------------------------------------------------------------------------
-- topic_summaries
-- -----------------------------------------------------------------------------
INSERT INTO topic_summaries (topic_id, exam_track_id, summary_text, key_points)
SELECT t.id, et.id, 'Heart failure management focuses on GDMT for HFrEF.', '["ACE-I/ARB/ARNI", "Beta-blockers", "MRAs", "SGLT2i", "Diuretics"]'::jsonb
FROM topics t JOIN domains d ON t.domain_id = d.id, exam_tracks et
WHERE d.slug = 'safe-care' AND t.slug = 'heart-failure' AND et.slug = 'rn'
ON CONFLICT (topic_id, exam_track_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- flashcard_decks & flashcards
-- -----------------------------------------------------------------------------
INSERT INTO flashcard_decks (exam_track_id, system_id, name, description, source, is_public)
SELECT et.id, s.id, 'Cardiovascular Key Terms', 'EF, BNP, S3 gallop', 'platform', true
FROM exam_tracks et, systems s
WHERE et.slug = 'rn' AND s.exam_track_id = et.id AND s.slug = 'cardiovascular';

INSERT INTO flashcards (flashcard_deck_id, front_text, back_text, display_order)
SELECT fd.id, 'What is the normal ejection fraction?', '55-70%. EF <40% indicates systolic heart failure.', 1
FROM flashcard_decks fd JOIN systems s ON fd.system_id = s.id
WHERE s.slug = 'cardiovascular' AND fd.name = 'Cardiovascular Key Terms';

INSERT INTO flashcards (flashcard_deck_id, front_text, back_text, display_order)
SELECT fd.id, 'S3 gallop indicates?', 'Ventricular volume overload; common in heart failure.', 2
FROM flashcard_decks fd JOIN systems s ON fd.system_id = s.id
WHERE s.slug = 'cardiovascular' AND fd.name = 'Cardiovascular Key Terms';

-- -----------------------------------------------------------------------------
-- video_lessons
-- -----------------------------------------------------------------------------
INSERT INTO video_lessons (exam_track_id, system_id, slug, title, description, video_url, duration_seconds, status)
SELECT et.id, s.id, 'heart-failure-patho', 'Heart Failure Pathophysiology', 'HFrEF vs HFpEF', 'https://example.com/video1', 720, 'approved'
FROM exam_tracks et, systems s
WHERE et.slug = 'rn' AND s.exam_track_id = et.id AND s.slug = 'cardiovascular'
ON CONFLICT (exam_track_id, slug) DO NOTHING;

INSERT INTO video_lessons (exam_track_id, system_id, slug, title, description, video_url, duration_seconds, status)
SELECT et.id, s.id, 'copd-management', 'COPD Management', 'Bronchodilators, oxygen', 'https://example.com/video2', 1080, 'approved'
FROM exam_tracks et, systems s
WHERE et.slug = 'rn' AND s.exam_track_id = et.id AND s.slug = 'respiratory'
ON CONFLICT (exam_track_id, slug) DO NOTHING;

-- -----------------------------------------------------------------------------
-- content_sources
-- -----------------------------------------------------------------------------
INSERT INTO content_sources (slug, name, source_type, citation_text, url) VALUES
  ('saunders', 'Saunders NCLEX', 'textbook', 'Silvestri, L. (2024). Saunders Comprehensive Review.', NULL),
  ('ncsbn', 'NCSBN Test Plan', 'guideline', 'NCSBN. (2024). NCLEX Test Plan.', 'https://ncsbn.org')
ON CONFLICT (slug) DO NOTHING;

-- -----------------------------------------------------------------------------
-- ai_prompt_templates
-- -----------------------------------------------------------------------------
INSERT INTO ai_prompt_templates (slug, name, system_prompt, user_prompt_template, metadata) VALUES
  ('explain', 'Explain Concept', 'You are a nursing tutor. Explain concepts clearly for board exam prep.',
   'Explain the following: {{text}}', '{"placeholders": ["text"]}'::jsonb),
  ('mnemonic', 'Create Mnemonic', 'Create memorable mnemonics for nursing concepts.',
   'Create a mnemonic for: {{concept}}', '{"placeholders": ["concept"]}'::jsonb),
  ('flashcards', 'Generate Flashcards', 'Generate study flashcards from the given content.',
   'Create 5 flashcards from: {{content}}', '{"placeholders": ["content"]}'::jsonb),
  ('weak-area', 'Weak Area Coaching', 'Provide targeted coaching for weak areas.',
   'I need help with {{topic}}. My accuracy is {{accuracy}}%.', '{"placeholders": ["topic", "accuracy"]}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- -----------------------------------------------------------------------------
-- content_reviews (sample admin review records)
-- -----------------------------------------------------------------------------
INSERT INTO content_reviews (content_type, content_id, status, notes)
SELECT 'question', q.id, 'approved', 'SME verified - ECG timing per AHA guidelines'
FROM questions q
JOIN exam_tracks et ON q.exam_track_id = et.id
WHERE et.slug = 'rn' AND q.stem LIKE '%chest pain radiating%'
LIMIT 1;

-- -----------------------------------------------------------------------------
-- subscription_plans (billing)
-- -----------------------------------------------------------------------------
INSERT INTO subscription_plans (slug, name, description, price_cents, interval, features, display_order, is_active) VALUES
  ('free', 'Free', 'Limited questions, AI actions, one diagnostic slice', 0, 'month', '[]'::jsonb, 0, true),
  ('3mo', '3 Month Plan', 'Full access for 3 months', 9900, 'month', '["full_question_bank","system_exams","analytics"]'::jsonb, 1, true),
  ('6mo', '6 Month Plan', 'Full access for 6 months', 17900, 'month', '["full_question_bank","system_exams","analytics"]'::jsonb, 2, true),
  ('12mo', '12 Month Plan', 'Full access for 12 months', 29900, 'month', '["full_question_bank","system_exams","analytics","notebook_export"]'::jsonb, 3, true)
ON CONFLICT (slug) DO NOTHING;
