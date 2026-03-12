-- =============================================================================
-- Starter Seed Dataset - Xentis Care Exam Prep
-- =============================================================================
-- Minimal but functional learning content for all 4 tracks.
-- Run after migrations. Requires: exam_tracks (migration 19), question_types.
-- Idempotent: ON CONFLICT where unique constraint exists; WHERE NOT EXISTS otherwise.
-- NOTE: question_types uses slug (NOT code). Schema: slug, name, description, config, display_order.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. DEPENDENCIES (ensure exist)
-- -----------------------------------------------------------------------------
-- question_types: slug column (question_type_slug enum); NO 'code' column in schema
INSERT INTO question_types (slug, name, display_order) VALUES
  ('single_best_answer', 'Single Best Answer', 1)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO domains (slug, name, description, display_order) VALUES
  ('safe-care', 'Safe and Effective Care Environment', 'Safety, infection control, management of care', 1),
  ('health-promo', 'Health Promotion and Maintenance', 'Growth, development, prevention', 2),
  ('psychosocial', 'Psychosocial Integrity', 'Coping, mental health, support', 3),
  ('physiological', 'Physiological Integrity', 'Basic care, pharmacological therapies', 4)
ON CONFLICT (slug) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. SYSTEMS (5 per track)
-- -----------------------------------------------------------------------------
INSERT INTO systems (exam_track_id, slug, name, description, display_order)
SELECT et.id, 'cardiovascular', 'Cardiovascular', 'Heart, circulation, ECG interpretation', 1
FROM exam_tracks et WHERE et.slug = 'lvn'::exam_track_slug
ON CONFLICT (exam_track_id, slug) DO NOTHING;

INSERT INTO systems (exam_track_id, slug, name, description, display_order)
SELECT et.id, 'respiratory', 'Respiratory', 'Lungs, oxygenation, airway management', 2
FROM exam_tracks et WHERE et.slug = 'lvn'::exam_track_slug
ON CONFLICT (exam_track_id, slug) DO NOTHING;

INSERT INTO systems (exam_track_id, slug, name, description, display_order)
SELECT et.id, 'renal', 'Renal', 'Kidneys, fluids, electrolytes', 3
FROM exam_tracks et WHERE et.slug = 'lvn'::exam_track_slug
ON CONFLICT (exam_track_id, slug) DO NOTHING;

INSERT INTO systems (exam_track_id, slug, name, description, display_order)
SELECT et.id, 'integumentary', 'Integumentary', 'Skin, wounds, pressure injuries', 4
FROM exam_tracks et WHERE et.slug = 'lvn'::exam_track_slug
ON CONFLICT (exam_track_id, slug) DO NOTHING;

INSERT INTO systems (exam_track_id, slug, name, description, display_order)
SELECT et.id, 'medication-safety', 'Medication Safety', 'Safe administration, rights of medication', 5
FROM exam_tracks et WHERE et.slug = 'lvn'::exam_track_slug
ON CONFLICT (exam_track_id, slug) DO NOTHING;

-- RN
INSERT INTO systems (exam_track_id, slug, name, description, display_order)
SELECT et.id, s.slug, s.name, s.description, s.display_order
FROM exam_tracks et
CROSS JOIN (VALUES
  ('cardiovascular', 'Cardiovascular', 'Heart, circulation, acute coronary syndromes', 1),
  ('respiratory', 'Respiratory', 'Lungs, oxygenation, mechanical ventilation', 2),
  ('renal', 'Renal', 'Kidneys, AKI, dialysis', 3),
  ('psychiatric', 'Psychiatric', 'Mental health, psychopharmacology', 4),
  ('endocrine', 'Endocrine', 'Diabetes, thyroid, adrenal', 5)
) AS s(slug, name, description, display_order)
WHERE et.slug = 'rn'::exam_track_slug
ON CONFLICT (exam_track_id, slug) DO NOTHING;

-- FNP
INSERT INTO systems (exam_track_id, slug, name, description, display_order)
SELECT et.id, s.slug, s.name, s.description, s.display_order
FROM exam_tracks et
CROSS JOIN (VALUES
  ('cardiovascular', 'Cardiovascular', 'Heart failure, hypertension, dyslipidemia', 1),
  ('respiratory', 'Respiratory', 'Asthma, COPD, pneumonia', 2),
  ('psychiatric', 'Psychiatric', 'Depression, anxiety, screening', 3),
  ('endocrine', 'Endocrine', 'Diabetes, thyroid disorders', 4),
  ('musculoskeletal', 'Musculoskeletal', 'Osteoarthritis, osteoporosis', 5)
) AS s(slug, name, description, display_order)
WHERE et.slug = 'fnp'::exam_track_slug
ON CONFLICT (exam_track_id, slug) DO NOTHING;

-- PMHNP
INSERT INTO systems (exam_track_id, slug, name, description, display_order)
SELECT et.id, s.slug, s.name, s.description, s.display_order
FROM exam_tracks et
CROSS JOIN (VALUES
  ('psychiatric', 'Psychiatric', 'Mood, anxiety, psychotic disorders', 1),
  ('neurological', 'Neurological', 'CNS, neuropsychiatric conditions', 2),
  ('substance-use', 'Substance Use', 'Addiction, withdrawal, MAT', 3),
  ('developmental', 'Developmental', 'Pediatric mental health, lifespan', 4),
  ('trauma', 'Trauma & Stress', 'PTSD, trauma-informed care', 5)
) AS s(slug, name, description, display_order)
WHERE et.slug = 'pmhnp'::exam_track_slug
ON CONFLICT (exam_track_id, slug) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 3. TOPICS (10 shared across domains, linked to systems per track)
-- -----------------------------------------------------------------------------
INSERT INTO topics (domain_id, slug, name, description, display_order)
SELECT d.id, 'heart-failure', 'Heart Failure', 'HFrEF, HFpEF, signs and management', 1
FROM domains d WHERE d.slug = 'safe-care'
ON CONFLICT (domain_id, slug) DO NOTHING;

INSERT INTO topics (domain_id, slug, name, description, display_order)
SELECT d.id, 'copd', 'COPD', 'Emphysema, chronic bronchitis, oxygen therapy', 2
FROM domains d WHERE d.slug = 'safe-care'
ON CONFLICT (domain_id, slug) DO NOTHING;

INSERT INTO topics (domain_id, slug, name, description, display_order)
SELECT d.id, 'aki', 'Acute Kidney Injury', 'Prerenal, intrarenal, postrenal causes', 3
FROM domains d WHERE d.slug = 'safe-care'
ON CONFLICT (domain_id, slug) DO NOTHING;

INSERT INTO topics (domain_id, slug, name, description, display_order)
SELECT d.id, 'infection-control', 'Infection Control', 'Standard precautions, isolation', 4
FROM domains d WHERE d.slug = 'safe-care'
ON CONFLICT (domain_id, slug) DO NOTHING;

INSERT INTO topics (domain_id, slug, name, description, display_order)
SELECT d.id, 'depression', 'Depression', 'MDD, assessment, treatment', 5
FROM domains d WHERE d.slug = 'psychosocial'
ON CONFLICT (domain_id, slug) DO NOTHING;

INSERT INTO topics (domain_id, slug, name, description, display_order)
SELECT d.id, 'anxiety', 'Anxiety Disorders', 'GAD, panic, phobias', 6
FROM domains d WHERE d.slug = 'psychosocial'
ON CONFLICT (domain_id, slug) DO NOTHING;

INSERT INTO topics (domain_id, slug, name, description, display_order)
SELECT d.id, 'diabetes', 'Diabetes', 'Type 1, Type 2, management', 7
FROM domains d WHERE d.slug = 'physiological'
ON CONFLICT (domain_id, slug) DO NOTHING;

INSERT INTO topics (domain_id, slug, name, description, display_order)
SELECT d.id, 'hypertension', 'Hypertension', 'BP management, lifestyle', 8
FROM domains d WHERE d.slug = 'physiological'
ON CONFLICT (domain_id, slug) DO NOTHING;

INSERT INTO topics (domain_id, slug, name, description, display_order)
SELECT d.id, 'wound-care', 'Wound Care', 'Pressure injuries, healing', 9
FROM domains d WHERE d.slug = 'physiological'
ON CONFLICT (domain_id, slug) DO NOTHING;

INSERT INTO topics (domain_id, slug, name, description, display_order)
SELECT d.id, 'medication-admin', 'Medication Administration', 'Rights, routes, safety', 10
FROM domains d WHERE d.slug = 'safe-care'
ON CONFLICT (domain_id, slug) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 4. TOPIC_SYSTEM_LINKS (topics to systems per track)
-- -----------------------------------------------------------------------------
INSERT INTO topic_system_links (topic_id, system_id, display_order)
SELECT t.id, s.id, 1
FROM topics t JOIN domains d ON t.domain_id = d.id
CROSS JOIN systems s JOIN exam_tracks et ON s.exam_track_id = et.id
WHERE d.slug = 'safe-care' AND t.slug = 'heart-failure' AND s.slug = 'cardiovascular'
  AND et.slug IN ('lvn'::exam_track_slug,'rn'::exam_track_slug,'fnp'::exam_track_slug)
ON CONFLICT (topic_id, system_id) DO NOTHING;

INSERT INTO topic_system_links (topic_id, system_id, display_order)
SELECT t.id, s.id, 1
FROM topics t JOIN domains d ON t.domain_id = d.id
CROSS JOIN systems s JOIN exam_tracks et ON s.exam_track_id = et.id
WHERE d.slug = 'safe-care' AND t.slug = 'copd' AND s.slug = 'respiratory'
  AND et.slug IN ('lvn'::exam_track_slug,'rn'::exam_track_slug,'fnp'::exam_track_slug)
ON CONFLICT (topic_id, system_id) DO NOTHING;

INSERT INTO topic_system_links (topic_id, system_id, display_order)
SELECT t.id, s.id, 1
FROM topics t JOIN domains d ON t.domain_id = d.id
CROSS JOIN systems s JOIN exam_tracks et ON s.exam_track_id = et.id
WHERE d.slug = 'safe-care' AND t.slug = 'aki' AND s.slug = 'renal'
  AND et.slug IN ('lvn'::exam_track_slug,'rn'::exam_track_slug)
ON CONFLICT (topic_id, system_id) DO NOTHING;

INSERT INTO topic_system_links (topic_id, system_id, display_order)
SELECT t.id, s.id, 1
FROM topics t JOIN domains d ON t.domain_id = d.id
CROSS JOIN systems s JOIN exam_tracks et ON s.exam_track_id = et.id
WHERE d.slug = 'psychosocial' AND t.slug = 'depression' AND s.slug = 'psychiatric'
  AND et.slug IN ('rn'::exam_track_slug,'fnp'::exam_track_slug,'pmhnp'::exam_track_slug)
ON CONFLICT (topic_id, system_id) DO NOTHING;

INSERT INTO topic_system_links (topic_id, system_id, display_order)
SELECT t.id, s.id, 1
FROM topics t JOIN domains d ON t.domain_id = d.id
CROSS JOIN systems s JOIN exam_tracks et ON s.exam_track_id = et.id
WHERE d.slug = 'psychosocial' AND t.slug = 'anxiety' AND s.slug = 'psychiatric'
  AND et.slug IN ('rn'::exam_track_slug,'fnp'::exam_track_slug,'pmhnp'::exam_track_slug)
ON CONFLICT (topic_id, system_id) DO NOTHING;

INSERT INTO topic_system_links (topic_id, system_id, display_order)
SELECT t.id, s.id, 1
FROM topics t JOIN domains d ON t.domain_id = d.id
CROSS JOIN systems s JOIN exam_tracks et ON s.exam_track_id = et.id
WHERE d.slug = 'physiological' AND t.slug = 'diabetes' AND s.slug = 'endocrine'
  AND et.slug IN ('rn'::exam_track_slug,'fnp'::exam_track_slug)
ON CONFLICT (topic_id, system_id) DO NOTHING;

INSERT INTO topic_system_links (topic_id, system_id, display_order)
SELECT t.id, s.id, 1
FROM topics t JOIN domains d ON t.domain_id = d.id
CROSS JOIN systems s JOIN exam_tracks et ON s.exam_track_id = et.id
WHERE d.slug = 'physiological' AND t.slug = 'hypertension' AND s.slug = 'cardiovascular'
  AND et.slug IN ('rn'::exam_track_slug,'fnp'::exam_track_slug)
ON CONFLICT (topic_id, system_id) DO NOTHING;

INSERT INTO topic_system_links (topic_id, system_id, display_order)
SELECT t.id, s.id, 1
FROM topics t JOIN domains d ON t.domain_id = d.id
CROSS JOIN systems s JOIN exam_tracks et ON s.exam_track_id = et.id
WHERE d.slug = 'physiological' AND t.slug = 'wound-care' AND s.slug = 'integumentary'
  AND et.slug = 'lvn'::exam_track_slug
ON CONFLICT (topic_id, system_id) DO NOTHING;

INSERT INTO topic_system_links (topic_id, system_id, display_order)
SELECT t.id, s.id, 1
FROM topics t JOIN domains d ON t.domain_id = d.id
CROSS JOIN systems s JOIN exam_tracks et ON s.exam_track_id = et.id
WHERE d.slug = 'safe-care' AND t.slug = 'medication-admin' AND s.slug = 'medication-safety'
  AND et.slug = 'lvn'::exam_track_slug
ON CONFLICT (topic_id, system_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 5. STUDY GUIDES (2 per track)
-- -----------------------------------------------------------------------------
INSERT INTO study_guides (exam_track_id, system_id, slug, title, description, display_order, status)
SELECT et.id, s.id, 'starter-cardiovascular-basics', 'Cardiovascular Basics', 'Core concepts for board prep', 1, 'approved'
FROM exam_tracks et
JOIN systems s ON s.exam_track_id = et.id AND s.slug = 'cardiovascular'
WHERE et.slug IN ('lvn'::exam_track_slug,'rn'::exam_track_slug,'fnp'::exam_track_slug)
ON CONFLICT (exam_track_id, slug) DO NOTHING;

INSERT INTO study_guides (exam_track_id, system_id, slug, title, description, display_order, status)
SELECT et.id, s.id, 'starter-respiratory-basics', 'Respiratory Basics', 'Oxygenation and airway management', 2, 'approved'
FROM exam_tracks et
JOIN systems s ON s.exam_track_id = et.id AND s.slug = 'respiratory'
WHERE et.slug IN ('lvn'::exam_track_slug,'rn'::exam_track_slug,'fnp'::exam_track_slug)
ON CONFLICT (exam_track_id, slug) DO NOTHING;

INSERT INTO study_guides (exam_track_id, system_id, slug, title, description, display_order, status)
SELECT et.id, s.id, 'starter-psychiatric-basics', 'Psychiatric Assessment Basics', 'Mental status, screening, safety', 1, 'approved'
FROM exam_tracks et
JOIN systems s ON s.exam_track_id = et.id AND s.slug = 'psychiatric'
WHERE et.slug = 'pmhnp'::exam_track_slug
ON CONFLICT (exam_track_id, slug) DO NOTHING;

INSERT INTO study_guides (exam_track_id, system_id, slug, title, description, display_order, status)
SELECT et.id, s.id, 'starter-mood-disorders', 'Mood Disorders Overview', 'Depression and bipolar spectrum', 2, 'approved'
FROM exam_tracks et
JOIN systems s ON s.exam_track_id = et.id AND s.slug = 'psychiatric'
WHERE et.slug = 'pmhnp'::exam_track_slug
ON CONFLICT (exam_track_id, slug) DO NOTHING;

-- Study guide sections (no unique constraint; use WHERE NOT EXISTS)
INSERT INTO study_material_sections (study_guide_id, slug, title, content_markdown, display_order)
SELECT sg.id, 'key-concepts', 'Key Concepts', '**Vital signs:** Normal BP 90-120/60-80, HR 60-100, RR 12-20. Report changes outside range. **Prioritization:** Airway, breathing, circulation. Address life-threatening first.', 1
FROM study_guides sg JOIN exam_tracks et ON sg.exam_track_id = et.id
WHERE sg.slug = 'starter-cardiovascular-basics' AND et.slug = 'lvn'::exam_track_slug
  AND NOT EXISTS (SELECT 1 FROM study_material_sections sms WHERE sms.study_guide_id = sg.id AND sms.slug = 'key-concepts');

INSERT INTO study_material_sections (study_guide_id, slug, title, content_markdown, display_order)
SELECT sg.id, 'nursing-actions', 'Nursing Actions', 'Obtain 12-lead ECG within 10 minutes for chest pain. Monitor for dysrhythmias. Document and report changes.', 2
FROM study_guides sg JOIN exam_tracks et ON sg.exam_track_id = et.id
WHERE sg.slug = 'starter-cardiovascular-basics' AND et.slug = 'lvn'::exam_track_slug
  AND NOT EXISTS (SELECT 1 FROM study_material_sections sms WHERE sms.study_guide_id = sg.id AND sms.slug = 'nursing-actions');

INSERT INTO study_material_sections (study_guide_id, slug, title, content_markdown, display_order)
SELECT sg.id, 'oxygen-safety', 'Oxygen Safety', '**COPD caution:** High-flow O2 can suppress hypoxic drive. Titrate per order. Target SpO2 88-92% for COPD. Report drowsiness or decreased RR.', 1
FROM study_guides sg JOIN exam_tracks et ON sg.exam_track_id = et.id
WHERE sg.slug = 'starter-respiratory-basics' AND et.slug = 'lvn'::exam_track_slug
  AND NOT EXISTS (SELECT 1 FROM study_material_sections sms WHERE sms.study_guide_id = sg.id AND sms.slug = 'oxygen-safety');

INSERT INTO study_material_sections (study_guide_id, slug, title, content_markdown, display_order)
SELECT sg.id, 'assessment', 'Assessment', 'AEB: adventitious sounds, work of breathing, SpO2. Document baseline and trends.', 2
FROM study_guides sg JOIN exam_tracks et ON sg.exam_track_id = et.id
WHERE sg.slug = 'starter-respiratory-basics' AND et.slug = 'lvn'::exam_track_slug
  AND NOT EXISTS (SELECT 1 FROM study_material_sections sms WHERE sms.study_guide_id = sg.id AND sms.slug = 'assessment');

-- -----------------------------------------------------------------------------
-- 6. QUESTIONS (see seed_starter_questions.sql for full set)
-- -----------------------------------------------------------------------------
\ir seed_starter_questions.sql

-- -----------------------------------------------------------------------------
-- 7. FLASHCARD DECKS (1 per track) + FLASHCARDS (20 per deck)
-- -----------------------------------------------------------------------------
INSERT INTO flashcard_decks (exam_track_id, system_id, name, description, source, is_public, status)
SELECT et.id, s.id, 'Starter Cardiovascular Deck', 'Key terms for board prep', 'platform', true, 'approved'
FROM exam_tracks et JOIN systems s ON s.exam_track_id = et.id AND s.slug = 'cardiovascular'
WHERE et.slug IN ('lvn'::exam_track_slug,'rn'::exam_track_slug,'fnp'::exam_track_slug)
  AND NOT EXISTS (SELECT 1 FROM flashcard_decks fd WHERE fd.exam_track_id = et.id AND fd.name = 'Starter Cardiovascular Deck');

INSERT INTO flashcard_decks (exam_track_id, system_id, name, description, source, is_public, status)
SELECT et.id, s.id, 'Starter Psychiatric Deck', 'Mental health key concepts', 'platform', true, 'approved'
FROM exam_tracks et JOIN systems s ON s.exam_track_id = et.id AND s.slug = 'psychiatric'
WHERE et.slug = 'pmhnp'::exam_track_slug
  AND NOT EXISTS (SELECT 1 FROM flashcard_decks fd WHERE fd.exam_track_id = et.id AND fd.name = 'Starter Psychiatric Deck');

-- flashcards: no unique constraint; use WHERE NOT EXISTS to avoid duplicates
INSERT INTO flashcards (flashcard_deck_id, front_text, back_text, display_order)
SELECT fd.id, 'Normal BP range (adult)?', 'Systolic 90-120, diastolic 60-80 mmHg', 1
FROM flashcard_decks fd JOIN systems s ON fd.system_id = s.id JOIN exam_tracks et ON fd.exam_track_id = et.id
WHERE fd.name = 'Starter Cardiovascular Deck' AND s.slug = 'cardiovascular' AND et.slug = 'lvn'::exam_track_slug
  AND NOT EXISTS (SELECT 1 FROM flashcards f WHERE f.flashcard_deck_id = fd.id AND f.front_text = 'Normal BP range (adult)?');

INSERT INTO flashcards (flashcard_deck_id, front_text, back_text, display_order)
SELECT fd.id, 'COPD target SpO2?', '88-92% to avoid suppressing hypoxic drive', 2
FROM flashcard_decks fd JOIN systems s ON fd.system_id = s.id JOIN exam_tracks et ON fd.exam_track_id = et.id
WHERE fd.name = 'Starter Cardiovascular Deck' AND s.slug = 'cardiovascular' AND et.slug = 'lvn'::exam_track_slug
  AND NOT EXISTS (SELECT 1 FROM flashcards f WHERE f.flashcard_deck_id = fd.id AND f.front_text = 'COPD target SpO2?');

INSERT INTO flashcards (flashcard_deck_id, front_text, back_text, display_order)
SELECT fd.id, 'Five rights of medication?', 'Right patient, drug, dose, route, time', 3
FROM flashcard_decks fd JOIN systems s ON fd.system_id = s.id JOIN exam_tracks et ON fd.exam_track_id = et.id
WHERE fd.name = 'Starter Cardiovascular Deck' AND s.slug = 'cardiovascular' AND et.slug = 'lvn'::exam_track_slug
  AND NOT EXISTS (SELECT 1 FROM flashcards f WHERE f.flashcard_deck_id = fd.id AND f.front_text = 'Five rights of medication?');

INSERT INTO flashcards (flashcard_deck_id, front_text, back_text, display_order)
SELECT fd.id, 'Stage 4 pressure injury?', 'Full-thickness with exposed bone, tendon, or muscle', 4
FROM flashcard_decks fd JOIN systems s ON fd.system_id = s.id JOIN exam_tracks et ON fd.exam_track_id = et.id
WHERE fd.name = 'Starter Cardiovascular Deck' AND s.slug = 'cardiovascular' AND et.slug = 'lvn'::exam_track_slug
  AND NOT EXISTS (SELECT 1 FROM flashcards f WHERE f.flashcard_deck_id = fd.id AND f.front_text = 'Stage 4 pressure injury?');

INSERT INTO flashcards (flashcard_deck_id, front_text, back_text, display_order)
SELECT fd.id, 'AKI labs to monitor?', 'K+, creatinine, BUN, urine output', 5
FROM flashcard_decks fd JOIN systems s ON fd.system_id = s.id JOIN exam_tracks et ON fd.exam_track_id = et.id
WHERE fd.name = 'Starter Cardiovascular Deck' AND s.slug = 'cardiovascular' AND et.slug = 'lvn'::exam_track_slug
  AND NOT EXISTS (SELECT 1 FROM flashcards f WHERE f.flashcard_deck_id = fd.id AND f.front_text = 'AKI labs to monitor?');

-- Add 15 more flashcards for LVN deck (6-20)
INSERT INTO flashcards (flashcard_deck_id, front_text, back_text, display_order)
SELECT fd.id, v.f, v.b, v.n
FROM flashcard_decks fd
JOIN systems s ON fd.system_id = s.id
JOIN exam_tracks et ON fd.exam_track_id = et.id
CROSS JOIN (VALUES
  (6, 'Normal HR range?', '60-100 bpm'),
  (7, 'Normal RR range?', '12-20/min'),
  (8, 'Chest pain priority?', 'Obtain ECG within 10 min'),
  (9, 'Hypoxic drive?', 'COPD patients may rely on low O2 to breathe'),
  (10, 'ACE inhibitor caution?', 'Monitor K+, creatinine; avoid in pregnancy'),
  (11, 'Pressure injury prevention?', 'Reposition q2h, offload heels, moisture barrier'),
  (12, 'Insulin peak times?', 'Rapid: 1-2h; Regular: 2-4h; NPH: 4-12h'),
  (13, 'Standard precautions?', 'Hand hygiene, PPE, safe injection, respiratory hygiene'),
  (14, 'Contact precautions?', 'Gown, gloves for C. diff, MRSA'),
  (15, 'Droplet precautions?', 'Mask for influenza, meningitis, pertussis'),
  (16, 'Normal K+ range?', '3.5-5.0 mEq/L'),
  (17, 'Hyperkalemia ECG changes?', 'Peaked T waves, widened QRS'),
  (18, 'Heart failure signs?', 'JVD, crackles, edema, S3'),
  (19, 'COPD exacerbation?', 'Increased dyspnea, sputum, need for rescue inhaler'),
  (20, 'Renal failure diet?', 'Low K+, Na+, phosphate; fluid restriction')
) AS v(n, f, b)
WHERE fd.name = 'Starter Cardiovascular Deck' AND s.slug = 'cardiovascular' AND et.slug = 'lvn'::exam_track_slug
  AND NOT EXISTS (SELECT 1 FROM flashcards f WHERE f.flashcard_deck_id = fd.id AND f.front_text = 'Normal HR range?');

-- RN/FNP/PMHNP decks - add 20 flashcards each (abbreviated: 5 per)
INSERT INTO flashcards (flashcard_deck_id, front_text, back_text, display_order)
SELECT fd.id, 'STEMI vs NSTEMI?', 'STEMI: ST elevation, full thickness; NSTEMI: no ST elevation', 1
FROM flashcard_decks fd JOIN systems s ON fd.system_id = s.id JOIN exam_tracks et ON fd.exam_track_id = et.id
WHERE fd.name = 'Starter Cardiovascular Deck' AND et.slug = 'rn'::exam_track_slug
  AND NOT EXISTS (SELECT 1 FROM flashcards f WHERE f.flashcard_deck_id = fd.id AND f.front_text = 'STEMI vs NSTEMI?');

INSERT INTO flashcards (flashcard_deck_id, front_text, back_text, display_order)
SELECT fd.id, 'PHQ-9 cutoff for depression?', '10+ suggests moderate depression', 2
FROM flashcard_decks fd JOIN systems s ON fd.system_id = s.id JOIN exam_tracks et ON fd.exam_track_id = et.id
WHERE fd.name = 'Starter Cardiovascular Deck' AND et.slug = 'rn'::exam_track_slug
  AND NOT EXISTS (SELECT 1 FROM flashcards f WHERE f.flashcard_deck_id = fd.id AND f.front_text = 'PHQ-9 cutoff for depression?');

INSERT INTO flashcards (flashcard_deck_id, front_text, back_text, display_order)
SELECT fd.id, 'Metformin contraindication?', 'eGFR <30; hold before contrast', 1
FROM flashcard_decks fd JOIN systems s ON fd.system_id = s.id JOIN exam_tracks et ON fd.exam_track_id = et.id
WHERE fd.name = 'Starter Cardiovascular Deck' AND et.slug = 'fnp'::exam_track_slug
  AND NOT EXISTS (SELECT 1 FROM flashcards f WHERE f.flashcard_deck_id = fd.id AND f.front_text = 'Metformin contraindication?');

INSERT INTO flashcards (flashcard_deck_id, front_text, back_text, display_order)
SELECT fd.id, 'MDD criteria (DSM-5)?', '5+ symptoms x 2 weeks; must include mood or anhedonia', 1
FROM flashcard_decks fd JOIN systems s ON fd.system_id = s.id JOIN exam_tracks et ON fd.exam_track_id = et.id
WHERE fd.name = 'Starter Psychiatric Deck' AND et.slug = 'pmhnp'::exam_track_slug
  AND NOT EXISTS (SELECT 1 FROM flashcards f WHERE f.flashcard_deck_id = fd.id AND f.front_text = 'MDD criteria (DSM-5)?');

INSERT INTO flashcards (flashcard_deck_id, front_text, back_text, display_order)
SELECT fd.id, v.f, v.b, v.n
FROM flashcard_decks fd JOIN systems s ON fd.system_id = s.id JOIN exam_tracks et ON fd.exam_track_id = et.id
CROSS JOIN (VALUES
  (2, 'SSRI black box warning?', 'Suicidality in young adults; monitor closely'),
  (3, 'Lithium therapeutic level?', '0.6-1.2 mEq/L; narrow therapeutic index'),
  (4, 'Benzodiazepine withdrawal?', 'Taper slowly; risk of seizures'),
  (5, 'Bipolar I vs II?', 'I: mania; II: hypomania + major depression'),
  (6, 'First-line for GAD?', 'SSRI or SNRI'),
  (7, 'ECT indications?', 'Severe depression, catatonia, treatment-resistant'),
  (8, 'Anticholinergic side effects?', 'Dry mouth, constipation, urinary retention'),
  (9, 'Serotonin syndrome signs?', 'Agitation, hyperthermia, rigidity, autonomic instability'),
  (10, 'MAOI diet restrictions?', 'Tyramine-rich foods; avoid aged cheese, wine'),
  (11, 'Akathisia treatment?', 'Reduce dose, add beta-blocker or benzodiazepine'),
  (12, 'Tardive dyskinesia?', 'Involuntary movements; may be irreversible'),
  (13, 'NMS signs?', 'Fever, rigidity, autonomic instability, elevated CPK'),
  (14, 'Clozapine monitoring?', 'WBC baseline and weekly; agranulocytosis risk'),
  (15, 'Lamotrigine titration?', 'Slow; risk of SJS with rapid titration'),
  (16, 'Valproate monitoring?', 'LFTs, platelets; teratogenic'),
  (17, 'CBT for depression?', 'Cognitive restructuring, behavioral activation'),
  (18, 'DBT components?', 'Mindfulness, distress tolerance, emotion regulation, interpersonal'),
  (19, 'PHQ-9 score 15?', 'Moderately severe depression'),
  (20, 'CAGE questionnaire?', 'Screening for alcohol use disorder')
) AS v(n, f, b)
WHERE fd.name = 'Starter Psychiatric Deck' AND et.slug = 'pmhnp'::exam_track_slug
  AND NOT EXISTS (SELECT 1 FROM flashcards f WHERE f.flashcard_deck_id = fd.id AND f.front_text = 'SSRI black box warning?');

-- -----------------------------------------------------------------------------
-- 8. HIGH-YIELD CONTENT (5 per track) - no unique constraint; use WHERE NOT EXISTS
-- -----------------------------------------------------------------------------
INSERT INTO high_yield_content (content_type, exam_track_id, system_id, topic_id, title, explanation, why_high_yield, status, display_order)
SELECT 'high_yield_summary', et.id, s.id, t.id, 'Chest Pain Prioritization',
  'Obtain 12-lead ECG within 10 minutes for suspected ACS. Do not delay for nitroglycerin. Monitor for dysrhythmias.',
  'Board exams frequently test prioritization in cardiac emergencies.', 'approved', 1
FROM exam_tracks et
JOIN systems s ON s.exam_track_id = et.id AND s.slug = 'cardiovascular'
LEFT JOIN topics t ON t.domain_id = (SELECT id FROM domains WHERE slug = 'safe-care') AND t.slug = 'heart-failure'
WHERE et.slug IN ('lvn'::exam_track_slug,'rn'::exam_track_slug,'fnp'::exam_track_slug)
  AND NOT EXISTS (SELECT 1 FROM high_yield_content hyc WHERE hyc.exam_track_id = et.id AND hyc.title = 'Chest Pain Prioritization' AND hyc.content_type = 'high_yield_summary');

INSERT INTO high_yield_content (content_type, exam_track_id, system_id, title, explanation, why_high_yield, status, display_order)
SELECT 'high_yield_summary', et.id, s.id, 'COPD Oxygen Safety',
  'Target SpO2 88-92% for COPD. High-flow O2 can cause CO2 narcosis. Report drowsiness, decreased RR.',
  'Common board trap: over-oxygenating COPD patients.', 'approved', 2
FROM exam_tracks et
JOIN systems s ON s.exam_track_id = et.id AND s.slug = 'respiratory'
WHERE et.slug IN ('lvn'::exam_track_slug,'rn'::exam_track_slug,'fnp'::exam_track_slug)
  AND NOT EXISTS (SELECT 1 FROM high_yield_content hyc WHERE hyc.exam_track_id = et.id AND hyc.title = 'COPD Oxygen Safety' AND hyc.content_type = 'high_yield_summary');

INSERT INTO high_yield_content (content_type, exam_track_id, system_id, title, explanation, why_high_yield, status, display_order)
SELECT 'high_yield_summary', et.id, s.id, 'Five Rights of Medication',
  'Right patient, drug, dose, route, time. Verify before every administration. Two identifiers.',
  'Fundamental safety concept tested across tracks.', 'approved', 3
FROM exam_tracks et
JOIN systems s ON s.exam_track_id = et.id AND s.slug = 'medication-safety'
WHERE et.slug = 'lvn'::exam_track_slug
  AND NOT EXISTS (SELECT 1 FROM high_yield_content hyc WHERE hyc.exam_track_id = et.id AND hyc.title = 'Five Rights of Medication' AND hyc.content_type = 'high_yield_summary');

INSERT INTO high_yield_content (content_type, exam_track_id, system_id, title, explanation, why_high_yield, status, display_order)
SELECT 'high_yield_summary', et.id, s.id, 'Suicide Risk Assessment',
  'Assess plan, means, intent. Ask directly. Document. One-to-one if high risk. No suicide contracts.',
  'Critical for psychiatric nursing and advanced practice.', 'approved', 4
FROM exam_tracks et
JOIN systems s ON s.exam_track_id = et.id AND s.slug = 'psychiatric'
WHERE et.slug IN ('rn'::exam_track_slug,'fnp'::exam_track_slug,'pmhnp'::exam_track_slug)
  AND NOT EXISTS (SELECT 1 FROM high_yield_content hyc WHERE hyc.exam_track_id = et.id AND hyc.title = 'Suicide Risk Assessment' AND hyc.content_type = 'high_yield_summary');

INSERT INTO high_yield_content (content_type, exam_track_id, system_id, title, explanation, why_high_yield, status, display_order)
SELECT 'high_yield_summary', et.id, s.id, 'Treatment-Resistant Depression',
  'After 2 adequate trials: switch class, augment (Li, T3, buspirone), or combine. Consider ECT for severe.',
  'PMHNP boards emphasize treatment algorithms.', 'approved', 5
FROM exam_tracks et
JOIN systems s ON s.exam_track_id = et.id AND s.slug = 'psychiatric'
WHERE et.slug = 'pmhnp'::exam_track_slug
  AND NOT EXISTS (SELECT 1 FROM high_yield_content hyc WHERE hyc.exam_track_id = et.id AND hyc.title = 'Treatment-Resistant Depression' AND hyc.content_type = 'high_yield_summary');

-- -----------------------------------------------------------------------------
-- 9. EXAM TEMPLATES (1 per track) + QUESTION POOL
-- -----------------------------------------------------------------------------
INSERT INTO exam_templates (exam_track_id, slug, name, description, question_count, duration_minutes)
SELECT et.id, 'starter-practice', 'Starter Practice Exam', '20-question practice for board prep', 20, 30
FROM exam_tracks et
WHERE et.slug IN ('lvn'::exam_track_slug,'rn'::exam_track_slug,'fnp'::exam_track_slug,'pmhnp'::exam_track_slug)
ON CONFLICT (exam_track_id, slug) DO NOTHING;

-- Link approved questions to exam template (up to 20 per track)
INSERT INTO exam_template_question_pool (exam_template_id, question_id)
SELECT et.id, q.id
FROM exam_templates et
CROSS JOIN LATERAL (
  SELECT id FROM questions
  WHERE exam_track_id = et.exam_track_id AND status = 'approved'
    AND id NOT IN (SELECT question_id FROM exam_template_question_pool WHERE exam_template_id = et.id)
  LIMIT 20
) q(id)
WHERE et.slug = 'starter-practice'
ON CONFLICT (exam_template_id, question_id) DO NOTHING;
