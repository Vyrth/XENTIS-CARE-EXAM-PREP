-- =============================================================================
-- Foundational Seed Dataset - Xentis Care Exam Prep
-- =============================================================================
-- Track-specific content for LVN, RN, FNP, PMHNP. Board-focused, original.
-- Run after seed_extended.sql. Use: \ir seed_foundational.sql from seed.sql
-- Content marked [Seed] in descriptions for admin identification.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. TOPIC_SYSTEM_LINKS (expand for all tracks)
-- -----------------------------------------------------------------------------
-- LVN: heart-failure, copd, aki -> cardiovascular, respiratory, renal
INSERT INTO topic_system_links (topic_id, system_id, display_order)
SELECT t.id, s.id, 1
FROM topics t JOIN domains d ON t.domain_id = d.id
CROSS JOIN systems s JOIN exam_tracks et ON s.exam_track_id = et.id
WHERE d.slug = 'safe-care' AND t.slug = 'heart-failure' AND s.slug = 'cardiovascular' AND et.slug = 'lvn'::exam_track_slug
ON CONFLICT (topic_id, system_id) DO NOTHING;

INSERT INTO topic_system_links (topic_id, system_id, display_order)
SELECT t.id, s.id, 1
FROM topics t JOIN domains d ON t.domain_id = d.id
CROSS JOIN systems s JOIN exam_tracks et ON s.exam_track_id = et.id
WHERE d.slug = 'safe-care' AND t.slug = 'copd' AND s.slug = 'respiratory' AND et.slug = 'lvn'::exam_track_slug
ON CONFLICT (topic_id, system_id) DO NOTHING;

INSERT INTO topic_system_links (topic_id, system_id, display_order)
SELECT t.id, s.id, 1
FROM topics t JOIN domains d ON t.domain_id = d.id
CROSS JOIN systems s JOIN exam_tracks et ON s.exam_track_id = et.id
WHERE d.slug = 'safe-care' AND t.slug = 'aki' AND s.slug = 'renal' AND et.slug = 'lvn'::exam_track_slug
ON CONFLICT (topic_id, system_id) DO NOTHING;

-- RN: add renal, psychiatric links
INSERT INTO topic_system_links (topic_id, system_id, display_order)
SELECT t.id, s.id, 1
FROM topics t JOIN domains d ON t.domain_id = d.id
CROSS JOIN systems s JOIN exam_tracks et ON s.exam_track_id = et.id
WHERE d.slug = 'safe-care' AND t.slug = 'aki' AND s.slug = 'renal' AND et.slug = 'rn'::exam_track_slug
ON CONFLICT (topic_id, system_id) DO NOTHING;

INSERT INTO topic_system_links (topic_id, system_id, display_order)
SELECT t.id, s.id, 1
FROM topics t JOIN domains d ON t.domain_id = d.id
CROSS JOIN systems s JOIN exam_tracks et ON s.exam_track_id = et.id
WHERE d.slug = 'psychosocial' AND t.slug = 'depression' AND s.slug = 'psychiatric' AND et.slug = 'rn'::exam_track_slug
ON CONFLICT (topic_id, system_id) DO NOTHING;

-- FNP: cardiovascular, respiratory, psychiatric
INSERT INTO topic_system_links (topic_id, system_id, display_order)
SELECT t.id, s.id, 1
FROM topics t JOIN domains d ON t.domain_id = d.id
CROSS JOIN systems s JOIN exam_tracks et ON s.exam_track_id = et.id
WHERE d.slug = 'safe-care' AND t.slug = 'heart-failure' AND s.slug = 'cardiovascular' AND et.slug = 'fnp'::exam_track_slug
ON CONFLICT (topic_id, system_id) DO NOTHING;

INSERT INTO topic_system_links (topic_id, system_id, display_order)
SELECT t.id, s.id, 1
FROM topics t JOIN domains d ON t.domain_id = d.id
CROSS JOIN systems s JOIN exam_tracks et ON s.exam_track_id = et.id
WHERE d.slug = 'psychosocial' AND t.slug = 'depression' AND s.slug = 'psychiatric' AND et.slug = 'fnp'::exam_track_slug
ON CONFLICT (topic_id, system_id) DO NOTHING;

-- PMHNP: depression -> psychiatric
INSERT INTO topic_system_links (topic_id, system_id, display_order)
SELECT t.id, s.id, 1
FROM topics t JOIN domains d ON t.domain_id = d.id
CROSS JOIN systems s JOIN exam_tracks et ON s.exam_track_id = et.id
WHERE d.slug = 'psychosocial' AND t.slug = 'depression' AND s.slug = 'psychiatric' AND et.slug = 'pmhnp'::exam_track_slug
ON CONFLICT (topic_id, system_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. ADDITIONAL SUBTOPICS (for PMHNP, FNP)
-- -----------------------------------------------------------------------------
INSERT INTO subtopics (topic_id, slug, name, description, display_order)
SELECT t.id, 'ssris', 'SSRIs', 'First-line antidepressants', 1
FROM topics t JOIN domains d ON t.domain_id = d.id
WHERE d.slug = 'psychosocial' AND t.slug = 'depression'
ON CONFLICT (topic_id, slug) DO NOTHING;

INSERT INTO subtopics (topic_id, slug, name, description, display_order)
SELECT t.id, 'assessment', 'Assessment', 'PHQ-9, suicide screening', 2
FROM topics t JOIN domains d ON t.domain_id = d.id WHERE d.slug = 'psychosocial' AND t.slug = 'depression'
ON CONFLICT (topic_id, slug) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 3. LVN STUDY GUIDES (2 guides)
-- -----------------------------------------------------------------------------
INSERT INTO study_guides (exam_track_id, system_id, slug, title, description, display_order, status)
SELECT et.id, s.id, 'lvn-cardiovascular-basics', 'LVN Cardiovascular Basics', '[Seed] Heart, circulation, vital signs for LVN scope', 1, 'approved'
FROM exam_tracks et, systems s
WHERE et.slug = 'lvn'::exam_track_slug AND s.exam_track_id = et.id AND s.slug = 'cardiovascular'
ON CONFLICT (exam_track_id, slug) DO NOTHING;

INSERT INTO study_material_sections (study_guide_id, slug, title, content_markdown, display_order)
SELECT sg.id, 'vital-signs', 'Vital Signs', '**Normal ranges:** BP 90-120/60-80, HR 60-100, RR 12-20, Temp 97.8-99.1°F. Report abnormal values to RN or provider. Document trends.', 1
FROM study_guides sg JOIN exam_tracks et ON sg.exam_track_id = et.id
WHERE et.slug = 'lvn'::exam_track_slug AND sg.slug = 'lvn-cardiovascular-basics';

INSERT INTO study_material_sections (study_guide_id, slug, title, content_markdown, display_order)
SELECT sg.id, 'chest-pain', 'Chest Pain Response', 'Assess location, duration, radiation. Obtain vital signs. Report immediately. Do not delay notification for suspected cardiac event.', 2
FROM study_guides sg JOIN exam_tracks et ON sg.exam_track_id = et.id
WHERE et.slug = 'lvn'::exam_track_slug AND sg.slug = 'lvn-cardiovascular-basics';

INSERT INTO study_guides (exam_track_id, system_id, slug, title, description, display_order, status)
SELECT et.id, s.id, 'lvn-respiratory-basics', 'LVN Respiratory Basics', '[Seed] Oxygen safety, COPD basics for LVN scope', 2, 'approved'
FROM exam_tracks et, systems s
WHERE et.slug = 'lvn'::exam_track_slug AND s.exam_track_id = et.id AND s.slug = 'respiratory'
ON CONFLICT (exam_track_id, slug) DO NOTHING;

INSERT INTO study_material_sections (study_guide_id, slug, title, content_markdown, display_order)
SELECT sg.id, 'oxygen-safety', 'Oxygen Safety', '**COPD caution:** High-flow O2 can suppress hypoxic drive. Titrate per order. Monitor SpO2 and mental status. Report drowsiness or decreased RR.', 1
FROM study_guides sg JOIN exam_tracks et ON sg.exam_track_id = et.id
WHERE et.slug = 'lvn'::exam_track_slug AND sg.slug = 'lvn-respiratory-basics';

INSERT INTO study_material_sections (study_guide_id, slug, title, content_markdown, display_order)
SELECT sg.id, 'breathing-exercises', 'Breathing Exercises', 'Pursed-lip breathing, diaphragmatic breathing. Teach and reinforce. Document patient response.', 2
FROM study_guides sg JOIN exam_tracks et ON sg.exam_track_id = et.id
WHERE et.slug = 'lvn'::exam_track_slug AND sg.slug = 'lvn-respiratory-basics';

-- -----------------------------------------------------------------------------
-- 4. RN STUDY GUIDES (add 2nd - Respiratory)
-- -----------------------------------------------------------------------------
INSERT INTO study_guides (exam_track_id, system_id, slug, title, description, display_order, status)
SELECT et.id, s.id, 'respiratory-guide', 'Respiratory System', '[Seed] COPD, oxygenation, respiratory assessment', 2, 'approved'
FROM exam_tracks et, systems s
WHERE et.slug = 'rn'::exam_track_slug AND s.exam_track_id = et.id AND s.slug = 'respiratory'
ON CONFLICT (exam_track_id, slug) DO NOTHING;

INSERT INTO study_material_sections (study_guide_id, slug, title, content_markdown, display_order)
SELECT sg.id, 'copd-overview', 'COPD Overview', '**Types:** Emphysema (destruction of alveoli), chronic bronchitis (productive cough 3+ months). **Key risk:** Smoking. **Hypoxic drive:** Chronic retainers rely on low O2 to breathe; high O2 can cause CO2 narcosis.', 1
FROM study_guides sg JOIN exam_tracks et ON sg.exam_track_id = et.id
WHERE et.slug = 'rn'::exam_track_slug AND sg.slug = 'respiratory-guide';

INSERT INTO study_material_sections (study_guide_id, slug, title, content_markdown, display_order)
SELECT sg.id, 'oxygen-therapy', 'Oxygen Therapy', 'Nasal cannula: low flow. Venturi mask: precise FiO2. Non-rebreather: high flow. **COPD:** Titrate to SpO2 88-92%, not 95%+. Monitor for sedation.', 2
FROM study_guides sg JOIN exam_tracks et ON sg.exam_track_id = et.id
WHERE et.slug = 'rn'::exam_track_slug AND sg.slug = 'respiratory-guide';

-- -----------------------------------------------------------------------------
-- 5. FNP STUDY GUIDES (2 guides)
-- -----------------------------------------------------------------------------
INSERT INTO study_guides (exam_track_id, system_id, slug, title, description, display_order, status)
SELECT et.id, s.id, 'fnp-cardiovascular', 'FNP Cardiovascular', '[Seed] HF management, antihypertensives for primary care', 1, 'approved'
FROM exam_tracks et, systems s
WHERE et.slug = 'fnp'::exam_track_slug AND s.exam_track_id = et.id AND s.slug = 'cardiovascular'
ON CONFLICT (exam_track_id, slug) DO NOTHING;

INSERT INTO study_material_sections (study_guide_id, slug, title, content_markdown, display_order)
SELECT sg.id, 'hf-gdmt', 'HFrEF Guideline-Directed Therapy', '**GDMT:** ACE-I/ARB/ARNI, beta-blocker, MRA, SGLT2i. Titrate to target doses. Monitor K+, Cr, eGFR. Avoid NSAIDs in HF.', 1
FROM study_guides sg JOIN exam_tracks et ON sg.exam_track_id = et.id
WHERE et.slug = 'fnp'::exam_track_slug AND sg.slug = 'fnp-cardiovascular';

INSERT INTO study_guides (exam_track_id, system_id, slug, title, description, display_order, status)
SELECT et.id, s.id, 'fnp-depression', 'FNP Depression Management', '[Seed] MDD assessment, SSRI selection, monitoring', 2, 'approved'
FROM exam_tracks et, systems s
WHERE et.slug = 'fnp'::exam_track_slug AND s.exam_track_id = et.id AND s.slug = 'psychiatric'
ON CONFLICT (exam_track_id, slug) DO NOTHING;

INSERT INTO study_material_sections (study_guide_id, slug, title, content_markdown, display_order)
SELECT sg.id, 'ssri-selection', 'SSRI Selection', 'First-line: sertraline, escitalopram. Consider drug interactions, side effects. **Black box:** Suicidality in young adults. Assess at each visit.', 1
FROM study_guides sg JOIN exam_tracks et ON sg.exam_track_id = et.id
WHERE et.slug = 'fnp'::exam_track_slug AND sg.slug = 'fnp-depression';

-- -----------------------------------------------------------------------------
-- 6. PMHNP STUDY GUIDES (2 guides)
-- -----------------------------------------------------------------------------
INSERT INTO study_guides (exam_track_id, system_id, slug, title, description, display_order, status)
SELECT et.id, s.id, 'pmhnp-depression', 'PMHNP Major Depressive Disorder', '[Seed] MDD criteria, psychopharmacology, therapy', 1, 'approved'
FROM exam_tracks et, systems s
WHERE et.slug = 'pmhnp'::exam_track_slug AND s.exam_track_id = et.id AND s.slug = 'psychiatric'
ON CONFLICT (exam_track_id, slug) DO NOTHING;

INSERT INTO study_material_sections (study_guide_id, slug, title, content_markdown, display_order)
SELECT sg.id, 'mdd-criteria', 'MDD Diagnostic Criteria', '**DSM-5:** 5+ symptoms x 2+ weeks: depressed mood, anhedonia, weight change, sleep change, psychomotor, fatigue, worthlessness, concentration, SI. Rule out medical, substance.', 1
FROM study_guides sg JOIN exam_tracks et ON sg.exam_track_id = et.id
WHERE et.slug = 'pmhnp'::exam_track_slug AND sg.slug = 'pmhnp-depression';

INSERT INTO study_material_sections (study_guide_id, slug, title, content_markdown, display_order)
SELECT sg.id, 'treatment-resistant', 'Treatment-Resistant Depression', 'After 2 adequate trials: switch, augment (Li, T3, buspirone), or combine. Consider ECT for severe. Assess adherence, medical causes.', 2
FROM study_guides sg JOIN exam_tracks et ON sg.exam_track_id = et.id
WHERE et.slug = 'pmhnp'::exam_track_slug AND sg.slug = 'pmhnp-depression';

INSERT INTO study_guides (exam_track_id, system_id, slug, title, description, display_order, status)
SELECT et.id, s.id, 'pmhnp-neuro-basics', 'PMHNP Neurological Basics', '[Seed] Neuro exam, delirium vs dementia', 2, 'approved'
FROM exam_tracks et, systems s
WHERE et.slug = 'pmhnp'::exam_track_slug AND s.exam_track_id = et.id AND s.slug = 'neurological'
ON CONFLICT (exam_track_id, slug) DO NOTHING;

INSERT INTO study_material_sections (study_guide_id, slug, title, content_markdown, display_order)
SELECT sg.id, 'delirium-dementia', 'Delirium vs Dementia', '**Delirium:** Acute, fluctuating, inattention, often reversible. **Dementia:** Chronic, progressive. Delirium is medical emergency; assess for infection, metabolic, drugs.', 1
FROM study_guides sg JOIN exam_tracks et ON sg.exam_track_id = et.id
WHERE et.slug = 'pmhnp'::exam_track_slug AND sg.slug = 'pmhnp-neuro-basics';

-- -----------------------------------------------------------------------------
-- 7. FLASHCARD DECKS (1+ per track)
-- -----------------------------------------------------------------------------
-- LVN
INSERT INTO flashcard_decks (exam_track_id, system_id, name, description, source, is_public)
SELECT et.id, s.id, 'LVN Vital Signs', '[Seed] Normal ranges, when to report', 'platform', true
FROM exam_tracks et, systems s
WHERE et.slug = 'lvn'::exam_track_slug AND s.exam_track_id = et.id AND s.slug = 'cardiovascular';

INSERT INTO flashcards (flashcard_deck_id, front_text, back_text, display_order)
SELECT fd.id, 'Normal adult blood pressure range?', 'Systolic 90-120 mmHg, diastolic 60-80 mmHg. Report outside range.', 1
FROM flashcard_decks fd JOIN systems s ON fd.system_id = s.id
WHERE s.slug = 'cardiovascular' AND fd.name = 'LVN Vital Signs';

INSERT INTO flashcards (flashcard_deck_id, front_text, back_text, display_order)
SELECT fd.id, 'When to report low SpO2?', 'Report if below 90% or per facility policy. COPD patients may have target 88-92%.', 2
FROM flashcard_decks fd JOIN systems s ON fd.system_id = s.id
WHERE s.slug = 'cardiovascular' AND fd.name = 'LVN Vital Signs';

-- FNP (add deck)
INSERT INTO flashcard_decks (exam_track_id, system_id, name, description, source, is_public)
SELECT et.id, s.id, 'FNP Depression Meds', '[Seed] SSRI dosing, black box', 'platform', true
FROM exam_tracks et, systems s
WHERE et.slug = 'fnp'::exam_track_slug AND s.exam_track_id = et.id AND s.slug = 'psychiatric';

INSERT INTO flashcards (flashcard_deck_id, front_text, back_text, display_order)
SELECT fd.id, 'Sertraline starting dose for MDD?', '50 mg daily. Titrate to 100-200 mg. Take 4-6 weeks for full effect.', 1
FROM flashcard_decks fd JOIN systems s ON fd.system_id = s.id
WHERE s.slug = 'psychiatric' AND fd.name = 'FNP Depression Meds';

-- PMHNP
INSERT INTO flashcard_decks (exam_track_id, system_id, name, description, source, is_public)
SELECT et.id, s.id, 'PMHNP MDD Criteria', '[Seed] DSM-5 symptoms', 'platform', true
FROM exam_tracks et, systems s
WHERE et.slug = 'pmhnp'::exam_track_slug AND s.exam_track_id = et.id AND s.slug = 'psychiatric';

INSERT INTO flashcards (flashcard_deck_id, front_text, back_text, display_order)
SELECT fd.id, 'How many symptoms for MDD diagnosis?', '5+ of 9 symptoms, most of the day, nearly every day, for 2+ weeks. Must include depressed mood or anhedonia.', 1
FROM flashcard_decks fd JOIN systems s ON fd.system_id = s.id
WHERE s.slug = 'psychiatric' AND fd.name = 'PMHNP MDD Criteria';

-- -----------------------------------------------------------------------------
-- 8. VIDEO LESSONS (1+ per track)
-- -----------------------------------------------------------------------------
INSERT INTO video_lessons (exam_track_id, system_id, slug, title, description, video_url, duration_seconds, status)
SELECT et.id, s.id, 'lvn-vital-signs', 'LVN Vital Signs Assessment', '[Seed] Technique, documentation', 'https://example.com/lvn-vitals', 600, 'approved'
FROM exam_tracks et, systems s
WHERE et.slug = 'lvn'::exam_track_slug AND s.exam_track_id = et.id AND s.slug = 'cardiovascular'
ON CONFLICT (exam_track_id, slug) DO NOTHING;

INSERT INTO video_lessons (exam_track_id, system_id, slug, title, description, video_url, duration_seconds, status)
SELECT et.id, s.id, 'fnp-hf-overview', 'FNP Heart Failure Overview', '[Seed] GDMT, monitoring', 'https://example.com/fnp-hf', 900, 'approved'
FROM exam_tracks et, systems s
WHERE et.slug = 'fnp'::exam_track_slug AND s.exam_track_id = et.id AND s.slug = 'cardiovascular'
ON CONFLICT (exam_track_id, slug) DO NOTHING;

INSERT INTO video_lessons (exam_track_id, system_id, slug, title, description, video_url, duration_seconds, status)
SELECT et.id, s.id, 'pmhnp-depression-assessment', 'PMHNP Depression Assessment', '[Seed] PHQ-9, suicide risk', 'https://example.com/pmhnp-dep', 720, 'approved'
FROM exam_tracks et, systems s
WHERE et.slug = 'pmhnp'::exam_track_slug AND s.exam_track_id = et.id AND s.slug = 'psychiatric'
ON CONFLICT (exam_track_id, slug) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 9. SYSTEM EXAMS (1+ per track, 50q target)
-- -----------------------------------------------------------------------------
INSERT INTO system_exams (exam_track_id, system_id, name, description, question_count, duration_minutes)
SELECT et.id, s.id, '[Seed] LVN Cardiovascular Exam', '50-question cardiovascular practice for LVN', 50, 60
FROM exam_tracks et, systems s
WHERE et.slug = 'lvn'::exam_track_slug AND s.exam_track_id = et.id AND s.slug = 'cardiovascular'
ON CONFLICT (exam_track_id, system_id, name) DO NOTHING;

INSERT INTO system_exams (exam_track_id, system_id, name, description, question_count, duration_minutes)
SELECT et.id, s.id, '[Seed] LVN Respiratory Exam', '50-question respiratory practice for LVN', 50, 60
FROM exam_tracks et, systems s
WHERE et.slug = 'lvn'::exam_track_slug AND s.exam_track_id = et.id AND s.slug = 'respiratory'
ON CONFLICT (exam_track_id, system_id, name) DO NOTHING;

INSERT INTO system_exams (exam_track_id, system_id, name, description, question_count, duration_minutes)
SELECT et.id, s.id, '[Seed] FNP Cardiovascular Exam', '50-question cardiovascular practice for FNP', 50, 60
FROM exam_tracks et, systems s
WHERE et.slug = 'fnp'::exam_track_slug AND s.exam_track_id = et.id AND s.slug = 'cardiovascular'
ON CONFLICT (exam_track_id, system_id, name) DO NOTHING;

INSERT INTO system_exams (exam_track_id, system_id, name, description, question_count, duration_minutes)
SELECT et.id, s.id, '[Seed] FNP Psychiatric Exam', '50-question psychiatric practice for FNP', 50, 60
FROM exam_tracks et, systems s
WHERE et.slug = 'fnp'::exam_track_slug AND s.exam_track_id = et.id AND s.slug = 'psychiatric'
ON CONFLICT (exam_track_id, system_id, name) DO NOTHING;

INSERT INTO system_exams (exam_track_id, system_id, name, description, question_count, duration_minutes)
SELECT et.id, s.id, '[Seed] PMHNP Psychiatric Exam', '50-question psychiatric practice for PMHNP', 50, 60
FROM exam_tracks et, systems s
WHERE et.slug = 'pmhnp'::exam_track_slug AND s.exam_track_id = et.id AND s.slug = 'psychiatric'
ON CONFLICT (exam_track_id, system_id, name) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 10. TOPIC SUMMARIES (1+ high-yield per track)
-- -----------------------------------------------------------------------------
INSERT INTO topic_summaries (topic_id, exam_track_id, summary_text, key_points)
SELECT t.id, et.id, '[Seed] LVN focus: vital signs, fluid balance, when to report. Heart failure signs: edema, crackles, weight gain.', '["Report low BP", "Fluid restriction compliance", "Daily weights", "Crackles"]'::jsonb
FROM topics t JOIN domains d ON t.domain_id = d.id, exam_tracks et
WHERE d.slug = 'safe-care' AND t.slug = 'heart-failure' AND et.slug = 'lvn'::exam_track_slug
ON CONFLICT (topic_id, exam_track_id) DO NOTHING;

INSERT INTO topic_summaries (topic_id, exam_track_id, summary_text, key_points)
SELECT t.id, et.id, '[Seed] LVN COPD focus: oxygen safety, hypoxic drive, SpO2 targets 88-92%. Report drowsiness.', '["Low-flow O2 for COPD", "Hypoxic drive", "Pursed-lip breathing"]'::jsonb
FROM topics t JOIN domains d ON t.domain_id = d.id, exam_tracks et
WHERE d.slug = 'safe-care' AND t.slug = 'copd' AND et.slug = 'lvn'::exam_track_slug
ON CONFLICT (topic_id, exam_track_id) DO NOTHING;

INSERT INTO topic_summaries (topic_id, exam_track_id, summary_text, key_points)
SELECT t.id, et.id, '[Seed] FNP HF: GDMT (ACE-I/ARNI, BB, MRA, SGLT2i). Titrate to target. Avoid NSAIDs.', '["GDMT", "Titration", "K+ monitoring", "NSAID avoidance"]'::jsonb
FROM topics t JOIN domains d ON t.domain_id = d.id, exam_tracks et
WHERE d.slug = 'safe-care' AND t.slug = 'heart-failure' AND et.slug = 'fnp'::exam_track_slug
ON CONFLICT (topic_id, exam_track_id) DO NOTHING;

INSERT INTO topic_summaries (topic_id, exam_track_id, summary_text, key_points)
SELECT t.id, et.id, '[Seed] FNP depression: SSRI first-line. PHQ-9. Black box suicidality. Assess adherence.', '["SSRI", "PHQ-9", "Suicide screening", "4-6 week trial"]'::jsonb
FROM topics t JOIN domains d ON t.domain_id = d.id, exam_tracks et
WHERE d.slug = 'psychosocial' AND t.slug = 'depression' AND et.slug = 'fnp'::exam_track_slug
ON CONFLICT (topic_id, exam_track_id) DO NOTHING;

INSERT INTO topic_summaries (topic_id, exam_track_id, summary_text, key_points)
SELECT t.id, et.id, '[Seed] PMHNP MDD: 5+ symptoms x 2 weeks. SSRI/SNRI first-line. Rule out bipolar, medical. Augment if resistant.', '["DSM-5 criteria", "SSRI/SNRI", "Bipolar screen", "Augmentation"]'::jsonb
FROM topics t JOIN domains d ON t.domain_id = d.id, exam_tracks et
WHERE d.slug = 'psychosocial' AND t.slug = 'depression' AND et.slug = 'pmhnp'::exam_track_slug
ON CONFLICT (topic_id, exam_track_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 11. QUESTIONS (20+ per track)
-- -----------------------------------------------------------------------------
\ir seed_questions.sql

-- -----------------------------------------------------------------------------
-- 12. SYSTEM EXAM QUESTION POOLS (link questions to system exams)
-- -----------------------------------------------------------------------------
INSERT INTO system_exam_question_pool (system_exam_id, question_id, display_order)
SELECT se.id, q.id, row_number() OVER (PARTITION BY se.id ORDER BY q.created_at)
FROM system_exams se
JOIN exam_tracks et ON se.exam_track_id = et.id
JOIN systems s ON se.system_id = s.id
JOIN questions q ON q.exam_track_id = et.id AND q.system_id = s.id
ON CONFLICT (system_exam_id, question_id) DO NOTHING;
