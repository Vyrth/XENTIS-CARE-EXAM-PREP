-- =============================================================================
-- Starter Seed: Questions (5+ per track; expand via admin for full 20)
-- =============================================================================
-- Board-style questions. Sourced by seed_starter.sql
-- Idempotent: WHERE NOT EXISTS (no unique constraint on questions content)
-- =============================================================================

-- LVN Questions (1-5)
INSERT INTO questions (exam_track_id, question_type_id, domain_id, system_id, topic_id, stem, status)
SELECT et.id, qt.id, d.id, s.id, t.id,
  'A patient with chest pain has BP 90/60, HR 110. Which action should the nurse take first?',
  'approved'
FROM exam_tracks et, question_types qt, domains d, systems s
LEFT JOIN topics t ON t.domain_id = d.id AND t.slug = 'heart-failure'
WHERE et.slug = 'lvn'::exam_track_slug AND qt.slug = 'single_best_answer' AND d.slug = 'safe-care'
  AND s.exam_track_id = et.id AND s.slug = 'cardiovascular'
  AND NOT EXISTS (SELECT 1 FROM questions q2 WHERE q2.exam_track_id = et.id AND q2.stem = 'A patient with chest pain has BP 90/60, HR 110. Which action should the nurse take first?')
LIMIT 1;
INSERT INTO question_options (question_id, option_key, option_text, is_correct, display_order)
SELECT q.id, 'A', 'Obtain 12-lead ECG', true, 1 FROM questions q JOIN exam_tracks et ON q.exam_track_id = et.id WHERE et.slug = 'lvn'::exam_track_slug AND q.stem LIKE '%chest pain has BP 90/60%' LIMIT 1;
INSERT INTO question_options (question_id, option_key, option_text, is_correct, display_order)
SELECT q.id, 'B', 'Administer nitroglycerin', false, 2 FROM questions q JOIN exam_tracks et ON q.exam_track_id = et.id WHERE et.slug = 'lvn'::exam_track_slug AND q.stem LIKE '%chest pain has BP 90/60%' LIMIT 1;
INSERT INTO question_options (question_id, option_key, option_text, is_correct, display_order)
SELECT q.id, 'C', 'Place in high Fowler''s', false, 3 FROM questions q JOIN exam_tracks et ON q.exam_track_id = et.id WHERE et.slug = 'lvn'::exam_track_slug AND q.stem LIKE '%chest pain has BP 90/60%' LIMIT 1;
INSERT INTO question_options (question_id, option_key, option_text, is_correct, display_order)
SELECT q.id, 'D', 'Start IV fluids', false, 4 FROM questions q JOIN exam_tracks et ON q.exam_track_id = et.id WHERE et.slug = 'lvn'::exam_track_slug AND q.stem LIKE '%chest pain has BP 90/60%' LIMIT 1;

INSERT INTO questions (exam_track_id, question_type_id, domain_id, system_id, topic_id, stem, status)
SELECT et.id, qt.id, d.id, s.id, t.id,
  'A COPD patient on 4 L/min O2 becomes drowsy with RR 12. What is the most likely cause?',
  'approved'
FROM exam_tracks et, question_types qt, domains d, systems s
LEFT JOIN topics t ON t.domain_id = d.id AND t.slug = 'copd'
WHERE et.slug = 'lvn'::exam_track_slug AND qt.slug = 'single_best_answer' AND d.slug = 'safe-care'
  AND s.exam_track_id = et.id AND s.slug = 'respiratory'
  AND NOT EXISTS (SELECT 1 FROM questions q2 WHERE q2.exam_track_id = et.id AND q2.stem = 'A COPD patient on 4 L/min O2 becomes drowsy with RR 12. What is the most likely cause?')
LIMIT 1;
INSERT INTO question_options (question_id, option_key, option_text, is_correct, display_order)
SELECT q.id, 'A', 'CO2 narcosis from high O2', true, 1 FROM questions q JOIN exam_tracks et ON q.exam_track_id = et.id WHERE et.slug = 'lvn'::exam_track_slug AND q.stem LIKE '%COPD patient on 4 L/min%' LIMIT 1;
INSERT INTO question_options (question_id, option_key, option_text, is_correct, display_order)
SELECT q.id, 'B', 'Pneumonia', false, 2 FROM questions q JOIN exam_tracks et ON q.exam_track_id = et.id WHERE et.slug = 'lvn'::exam_track_slug AND q.stem LIKE '%COPD patient on 4 L/min%' LIMIT 1;
INSERT INTO question_options (question_id, option_key, option_text, is_correct, display_order)
SELECT q.id, 'C', 'Pulmonary embolism', false, 3 FROM questions q JOIN exam_tracks et ON q.exam_track_id = et.id WHERE et.slug = 'lvn'::exam_track_slug AND q.stem LIKE '%COPD patient on 4 L/min%' LIMIT 1;
INSERT INTO question_options (question_id, option_key, option_text, is_correct, display_order)
SELECT q.id, 'D', 'Anxiety', false, 4 FROM questions q JOIN exam_tracks et ON q.exam_track_id = et.id WHERE et.slug = 'lvn'::exam_track_slug AND q.stem LIKE '%COPD patient on 4 L/min%' LIMIT 1;

INSERT INTO questions (exam_track_id, question_type_id, domain_id, system_id, topic_id, stem, status)
SELECT et.id, qt.id, d.id, s.id, t.id,
  'Before administering a medication, the nurse must verify which of the following?',
  'approved'
FROM exam_tracks et, question_types qt, domains d, systems s
LEFT JOIN topics t ON t.domain_id = d.id AND t.slug = 'medication-admin'
WHERE et.slug = 'lvn'::exam_track_slug AND qt.slug = 'single_best_answer' AND d.slug = 'safe-care'
  AND s.exam_track_id = et.id AND s.slug = 'medication-safety'
  AND NOT EXISTS (SELECT 1 FROM questions q2 WHERE q2.exam_track_id = et.id AND q2.stem = 'Before administering a medication, the nurse must verify which of the following?')
LIMIT 1;
INSERT INTO question_options (question_id, option_key, option_text, is_correct, display_order)
SELECT q.id, 'A', 'Right patient, drug, dose, route, time', true, 1 FROM questions q JOIN exam_tracks et ON q.exam_track_id = et.id WHERE et.slug = 'lvn'::exam_track_slug AND q.stem LIKE '%Before administering a medication%' LIMIT 1;
INSERT INTO question_options (question_id, option_key, option_text, is_correct, display_order)
SELECT q.id, 'B', 'Patient allergies only', false, 2 FROM questions q JOIN exam_tracks et ON q.exam_track_id = et.id WHERE et.slug = 'lvn'::exam_track_slug AND q.stem LIKE '%Before administering a medication%' LIMIT 1;
INSERT INTO question_options (question_id, option_key, option_text, is_correct, display_order)
SELECT q.id, 'C', 'Prescriber signature', false, 3 FROM questions q JOIN exam_tracks et ON q.exam_track_id = et.id WHERE et.slug = 'lvn'::exam_track_slug AND q.stem LIKE '%Before administering a medication%' LIMIT 1;
INSERT INTO question_options (question_id, option_key, option_text, is_correct, display_order)
SELECT q.id, 'D', 'Pharmacy label', false, 4 FROM questions q JOIN exam_tracks et ON q.exam_track_id = et.id WHERE et.slug = 'lvn'::exam_track_slug AND q.stem LIKE '%Before administering a medication%' LIMIT 1;

INSERT INTO questions (exam_track_id, question_type_id, domain_id, system_id, topic_id, stem, status)
SELECT et.id, qt.id, d.id, s.id, t.id,
  'A patient with a pressure injury has exposed bone. What stage is this?',
  'approved'
FROM exam_tracks et, question_types qt, domains d, systems s
LEFT JOIN topics t ON t.domain_id = d.id AND t.slug = 'wound-care'
WHERE et.slug = 'lvn'::exam_track_slug AND qt.slug = 'single_best_answer' AND d.slug = 'physiological'
  AND s.exam_track_id = et.id AND s.slug = 'integumentary'
  AND NOT EXISTS (SELECT 1 FROM questions q2 WHERE q2.exam_track_id = et.id AND q2.stem = 'A patient with a pressure injury has exposed bone. What stage is this?')
LIMIT 1;
INSERT INTO question_options (question_id, option_key, option_text, is_correct, display_order)
SELECT q.id, 'A', 'Stage 3', false, 1 FROM questions q JOIN exam_tracks et ON q.exam_track_id = et.id WHERE et.slug = 'lvn'::exam_track_slug AND q.stem LIKE '%pressure injury has exposed bone%' LIMIT 1;
INSERT INTO question_options (question_id, option_key, option_text, is_correct, display_order)
SELECT q.id, 'B', 'Stage 4', true, 2 FROM questions q JOIN exam_tracks et ON q.exam_track_id = et.id WHERE et.slug = 'lvn'::exam_track_slug AND q.stem LIKE '%pressure injury has exposed bone%' LIMIT 1;
INSERT INTO question_options (question_id, option_key, option_text, is_correct, display_order)
SELECT q.id, 'C', 'Unstageable', false, 3 FROM questions q JOIN exam_tracks et ON q.exam_track_id = et.id WHERE et.slug = 'lvn'::exam_track_slug AND q.stem LIKE '%pressure injury has exposed bone%' LIMIT 1;
INSERT INTO question_options (question_id, option_key, option_text, is_correct, display_order)
SELECT q.id, 'D', 'Deep tissue injury', false, 4 FROM questions q JOIN exam_tracks et ON q.exam_track_id = et.id WHERE et.slug = 'lvn'::exam_track_slug AND q.stem LIKE '%pressure injury has exposed bone%' LIMIT 1;

INSERT INTO questions (exam_track_id, question_type_id, domain_id, system_id, topic_id, stem, status)
SELECT et.id, qt.id, d.id, s.id, t.id,
  'A patient with AKI has decreased urine output. Which lab should the nurse monitor most closely?',
  'approved'
FROM exam_tracks et, question_types qt, domains d, systems s
LEFT JOIN topics t ON t.domain_id = d.id AND t.slug = 'aki'
WHERE et.slug = 'lvn'::exam_track_slug AND qt.slug = 'single_best_answer' AND d.slug = 'safe-care'
  AND s.exam_track_id = et.id AND s.slug = 'renal'
  AND NOT EXISTS (SELECT 1 FROM questions q2 WHERE q2.exam_track_id = et.id AND q2.stem = 'A patient with AKI has decreased urine output. Which lab should the nurse monitor most closely?')
LIMIT 1;
INSERT INTO question_options (question_id, option_key, option_text, is_correct, display_order)
SELECT q.id, 'A', 'Potassium and creatinine', true, 1 FROM questions q JOIN exam_tracks et ON q.exam_track_id = et.id WHERE et.slug = 'lvn'::exam_track_slug AND q.stem LIKE '%AKI has decreased urine output%' LIMIT 1;
INSERT INTO question_options (question_id, option_key, option_text, is_correct, display_order)
SELECT q.id, 'B', 'Hemoglobin', false, 2 FROM questions q JOIN exam_tracks et ON q.exam_track_id = et.id WHERE et.slug = 'lvn'::exam_track_slug AND q.stem LIKE '%AKI has decreased urine output%' LIMIT 1;
INSERT INTO question_options (question_id, option_key, option_text, is_correct, display_order)
SELECT q.id, 'C', 'WBC count', false, 3 FROM questions q JOIN exam_tracks et ON q.exam_track_id = et.id WHERE et.slug = 'lvn'::exam_track_slug AND q.stem LIKE '%AKI has decreased urine output%' LIMIT 1;
INSERT INTO question_options (question_id, option_key, option_text, is_correct, display_order)
SELECT q.id, 'D', 'Platelets', false, 4 FROM questions q JOIN exam_tracks et ON q.exam_track_id = et.id WHERE et.slug = 'lvn'::exam_track_slug AND q.stem LIKE '%AKI has decreased urine output%' LIMIT 1;

-- RN Questions (6-10)
INSERT INTO questions (exam_track_id, question_type_id, domain_id, system_id, topic_id, stem, status)
SELECT et.id, qt.id, d.id, s.id, t.id,
  'A patient with STEMI receives fibrinolytic therapy. The nurse should monitor for which complication?',
  'approved'
FROM exam_tracks et, question_types qt, domains d, systems s
LEFT JOIN topics t ON t.domain_id = d.id AND t.slug = 'heart-failure'
WHERE et.slug = 'rn'::exam_track_slug AND qt.slug = 'single_best_answer' AND d.slug = 'safe-care'
  AND s.exam_track_id = et.id AND s.slug = 'cardiovascular'
  AND NOT EXISTS (SELECT 1 FROM questions q2 WHERE q2.exam_track_id = et.id AND q2.stem = 'A patient with STEMI receives fibrinolytic therapy. The nurse should monitor for which complication?')
LIMIT 1;
INSERT INTO question_options (question_id, option_key, option_text, is_correct, display_order)
SELECT q.id, 'A', 'Bleeding', true, 1 FROM questions q JOIN exam_tracks et ON q.exam_track_id = et.id WHERE et.slug = 'rn'::exam_track_slug AND q.stem LIKE '%STEMI receives fibrinolytic%' LIMIT 1;
INSERT INTO question_options (question_id, option_key, option_text, is_correct, display_order)
SELECT q.id, 'B', 'Hyperglycemia', false, 2 FROM questions q JOIN exam_tracks et ON q.exam_track_id = et.id WHERE et.slug = 'rn'::exam_track_slug AND q.stem LIKE '%STEMI receives fibrinolytic%' LIMIT 1;
INSERT INTO question_options (question_id, option_key, option_text, is_correct, display_order)
SELECT q.id, 'C', 'Bradycardia', false, 3 FROM questions q JOIN exam_tracks et ON q.exam_track_id = et.id WHERE et.slug = 'rn'::exam_track_slug AND q.stem LIKE '%STEMI receives fibrinolytic%' LIMIT 1;
INSERT INTO question_options (question_id, option_key, option_text, is_correct, display_order)
SELECT q.id, 'D', 'Hypertension', false, 4 FROM questions q JOIN exam_tracks et ON q.exam_track_id = et.id WHERE et.slug = 'rn'::exam_track_slug AND q.stem LIKE '%STEMI receives fibrinolytic%' LIMIT 1;

INSERT INTO questions (exam_track_id, question_type_id, domain_id, system_id, topic_id, stem, status)
SELECT et.id, qt.id, d.id, s.id, t.id,
  'A patient with depression reports suicidal ideation. The nurse''s priority action is to:',
  'approved'
FROM exam_tracks et, question_types qt, domains d, systems s
LEFT JOIN topics t ON t.domain_id = d.id AND t.slug = 'depression'
WHERE et.slug = 'rn'::exam_track_slug AND qt.slug = 'single_best_answer' AND d.slug = 'psychosocial'
  AND s.exam_track_id = et.id AND s.slug = 'psychiatric'
  AND NOT EXISTS (SELECT 1 FROM questions q2 WHERE q2.exam_track_id = et.id AND q2.stem = 'A patient with depression reports suicidal ideation. The nurse''s priority action is to:')
LIMIT 1;
INSERT INTO question_options (question_id, option_key, option_text, is_correct, display_order)
SELECT q.id, 'A', 'Assess plan, means, and intent', true, 1 FROM questions q JOIN exam_tracks et ON q.exam_track_id = et.id WHERE et.slug = 'rn'::exam_track_slug AND q.stem LIKE '%depression reports suicidal ideation%' LIMIT 1;
INSERT INTO question_options (question_id, option_key, option_text, is_correct, display_order)
SELECT q.id, 'B', 'Notify the physician', false, 2 FROM questions q JOIN exam_tracks et ON q.exam_track_id = et.id WHERE et.slug = 'rn'::exam_track_slug AND q.stem LIKE '%depression reports suicidal ideation%' LIMIT 1;
INSERT INTO question_options (question_id, option_key, option_text, is_correct, display_order)
SELECT q.id, 'C', 'Place on one-to-one observation', false, 3 FROM questions q JOIN exam_tracks et ON q.exam_track_id = et.id WHERE et.slug = 'rn'::exam_track_slug AND q.stem LIKE '%depression reports suicidal ideation%' LIMIT 1;
INSERT INTO question_options (question_id, option_key, option_text, is_correct, display_order)
SELECT q.id, 'D', 'Administer antidepressant', false, 4 FROM questions q JOIN exam_tracks et ON q.exam_track_id = et.id WHERE et.slug = 'rn'::exam_track_slug AND q.stem LIKE '%depression reports suicidal ideation%' LIMIT 1;

-- FNP Questions (11-12)
INSERT INTO questions (exam_track_id, question_type_id, domain_id, system_id, topic_id, stem, status)
SELECT et.id, qt.id, d.id, s.id, t.id,
  'An adult with newly diagnosed Type 2 diabetes has an A1C of 9.2%. First-line pharmacologic therapy is:',
  'approved'
FROM exam_tracks et, question_types qt, domains d, systems s
LEFT JOIN topics t ON t.domain_id = d.id AND t.slug = 'diabetes'
WHERE et.slug = 'fnp'::exam_track_slug AND qt.slug = 'single_best_answer' AND d.slug = 'physiological'
  AND s.exam_track_id = et.id AND s.slug = 'endocrine'
  AND NOT EXISTS (SELECT 1 FROM questions q2 WHERE q2.exam_track_id = et.id AND q2.stem = 'An adult with newly diagnosed Type 2 diabetes has an A1C of 9.2%. First-line pharmacologic therapy is:')
LIMIT 1;
INSERT INTO question_options (question_id, option_key, option_text, is_correct, display_order)
SELECT q.id, 'A', 'Metformin', true, 1 FROM questions q JOIN exam_tracks et ON q.exam_track_id = et.id WHERE et.slug = 'fnp'::exam_track_slug AND q.stem LIKE '%newly diagnosed Type 2 diabetes%' LIMIT 1;
INSERT INTO question_options (question_id, option_key, option_text, is_correct, display_order)
SELECT q.id, 'B', 'Insulin', false, 2 FROM questions q JOIN exam_tracks et ON q.exam_track_id = et.id WHERE et.slug = 'fnp'::exam_track_slug AND q.stem LIKE '%newly diagnosed Type 2 diabetes%' LIMIT 1;
INSERT INTO question_options (question_id, option_key, option_text, is_correct, display_order)
SELECT q.id, 'C', 'Sulfonylurea', false, 3 FROM questions q JOIN exam_tracks et ON q.exam_track_id = et.id WHERE et.slug = 'fnp'::exam_track_slug AND q.stem LIKE '%newly diagnosed Type 2 diabetes%' LIMIT 1;
INSERT INTO question_options (question_id, option_key, option_text, is_correct, display_order)
SELECT q.id, 'D', 'GLP-1 agonist', false, 4 FROM questions q JOIN exam_tracks et ON q.exam_track_id = et.id WHERE et.slug = 'fnp'::exam_track_slug AND q.stem LIKE '%newly diagnosed Type 2 diabetes%' LIMIT 1;

-- PMHNP Questions (13-14)
INSERT INTO questions (exam_track_id, question_type_id, domain_id, system_id, topic_id, stem, status)
SELECT et.id, qt.id, d.id, s.id, t.id,
  'A patient with MDD has failed two adequate SSRI trials. Next step in treatment-resistant depression is:',
  'approved'
FROM exam_tracks et, question_types qt, domains d, systems s
LEFT JOIN topics t ON t.domain_id = d.id AND t.slug = 'depression'
WHERE et.slug = 'pmhnp'::exam_track_slug AND qt.slug = 'single_best_answer' AND d.slug = 'psychosocial'
  AND s.exam_track_id = et.id AND s.slug = 'psychiatric'
  AND NOT EXISTS (SELECT 1 FROM questions q2 WHERE q2.exam_track_id = et.id AND q2.stem = 'A patient with MDD has failed two adequate SSRI trials. Next step in treatment-resistant depression is:')
LIMIT 1;
INSERT INTO question_options (question_id, option_key, option_text, is_correct, display_order)
SELECT q.id, 'A', 'Switch to different class or augment', true, 1 FROM questions q JOIN exam_tracks et ON q.exam_track_id = et.id WHERE et.slug = 'pmhnp'::exam_track_slug AND q.stem LIKE '%failed two adequate SSRI trials%' LIMIT 1;
INSERT INTO question_options (question_id, option_key, option_text, is_correct, display_order)
SELECT q.id, 'B', 'Increase current SSRI dose', false, 2 FROM questions q JOIN exam_tracks et ON q.exam_track_id = et.id WHERE et.slug = 'pmhnp'::exam_track_slug AND q.stem LIKE '%failed two adequate SSRI trials%' LIMIT 1;
INSERT INTO question_options (question_id, option_key, option_text, is_correct, display_order)
SELECT q.id, 'C', 'Add benzodiazepine', false, 3 FROM questions q JOIN exam_tracks et ON q.exam_track_id = et.id WHERE et.slug = 'pmhnp'::exam_track_slug AND q.stem LIKE '%failed two adequate SSRI trials%' LIMIT 1;
INSERT INTO question_options (question_id, option_key, option_text, is_correct, display_order)
SELECT q.id, 'D', 'Discontinue medication', false, 4 FROM questions q JOIN exam_tracks et ON q.exam_track_id = et.id WHERE et.slug = 'pmhnp'::exam_track_slug AND q.stem LIKE '%failed two adequate SSRI trials%' LIMIT 1;
