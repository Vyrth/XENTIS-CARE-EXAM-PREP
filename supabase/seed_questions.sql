-- =============================================================================
-- Foundational Questions - 20+ per track
-- =============================================================================
-- Board-focused, original stems. [Seed] content for demo functionality.
-- =============================================================================

CREATE TEMP TABLE _q_seed (
  track TEXT,
  sys TEXT,
  domain_slug TEXT,
  stem TEXT,
  opt_a TEXT, opt_b TEXT, opt_c TEXT, opt_d TEXT,
  correct TEXT
);

-- LVN (20)
INSERT INTO _q_seed VALUES
('lvn','cardiovascular','safe-care','An LVN obtains a blood pressure of 88/52 for a postoperative patient. What is the priority action?','Document and continue monitoring','Report to the RN or provider immediately','Recheck in 15 minutes','Administer fluids per standing order','B'),
('lvn','respiratory','safe-care','A patient with COPD has an SpO2 of 91% on 2 L/min nasal cannula. The LVN should:','Increase oxygen to 4 L/min','Maintain current oxygen and monitor','Discontinue oxygen','Apply non-rebreather mask','B'),
('lvn','renal','safe-care','An LVN is caring for a patient with strict fluid balance. The best way to obtain accurate intake is:','Estimate based on cup sizes','Measure all fluids with a graduated container','Record intake at end of shift','Ask the patient to estimate','B'),
('lvn','cardiovascular','safe-care','A patient reports sudden chest pressure. The LVN''s first action is:','Obtain vital signs and notify RN','Administer aspirin','Have patient lie down','Document and continue','A'),
('lvn','respiratory','safe-care','A patient with COPD becomes drowsy after oxygen increase. The LVN suspects:','CO2 narcosis from high oxygen','Pneumonia','Anxiety reduction','Medication effect','A'),
('lvn','renal','safe-care','When measuring urine output, the LVN should:','Estimate from voiding pattern','Use a graduated container and record each void','Record total at shift end','Ask the patient','B'),
('lvn','cardiovascular','safe-care','An LVN notes a patient''s heart rate is 118. Priority action:','Document only','Assess for cause and report if abnormal','Administer beta-blocker','Have patient rest','B'),
('lvn','respiratory','safe-care','A patient with respiratory distress has retractions. The LVN should:','Notify RN or provider immediately','Apply oxygen at 6 L/min','Have patient cough','Document and continue','A'),
('lvn','renal','safe-care','For accurate daily weight, the LVN ensures:','Same scale, same time, same clothing','Patient estimates','Weigh weekly','Skip if patient refuses','A'),
('lvn','cardiovascular','safe-care','A patient with edema has 2+ pitting. The LVN reports:','Only if it worsens','To RN or provider per facility policy','At discharge','Never, it is expected','B'),
('lvn','cardiovascular','safe-care','Before administering a prescribed medication, the LVN verifies:','Patient name only','Right patient, drug, dose, route, time','Only the drug name','With the family','B'),
('lvn','cardiovascular','safe-care','A patient''s temperature is 101.4°F. The LVN:','Documents only','Reports to RN or provider per policy','Administers acetaminophen without order','Discontinues monitoring','B'),
('lvn','respiratory','safe-care','When a patient has oxygen via nasal cannula, the LVN:','Increases flow if restless','Monitors SpO2 and maintains ordered flow','Removes it when patient sleeps','Uses a mask instead','B'),
('lvn','cardiovascular','safe-care','An LVN prepares a patient for transfer. Essential action:','Pack belongings','Ensure report is given and handoff complete','Leave immediately','Document only','B'),
('lvn','renal','safe-care','A patient with kidney disease has potassium of 5.8. The LVN:','Administers Kayexalate per standing order','Reports to RN or provider','Documents only','Withholds potassium-rich foods without order','B'),
('lvn','respiratory','safe-care','The LVN notes a respiratory rate of 8. The priority is:','Document the finding','Assess responsiveness and notify immediately','Increase oxygen','Have patient deep breathe','B'),
('lvn','renal','safe-care','For a patient on fluid restriction, the LVN:','Encourages extra fluids','Measures and tracks all intake','Ignores restriction if patient is thirsty','Estimates intake','B'),
('lvn','cardiovascular','safe-care','A patient with heart failure has crackles. The LVN should:','Document and continue','Report to RN or provider','Administer diuretic','Have patient ambulate','B'),
('lvn','cardiovascular','safe-care','When obtaining a blood pressure, the LVN:','Uses any available cuff','Selects correct cuff size for arm circumference','Uses thigh cuff for arm','Skips if patient is eating','B'),
('lvn','respiratory','safe-care','A patient with COPD is receiving breathing treatment. The LVN:','Leaves during treatment','Monitors patient and documents response','Increases treatment time','Skips if patient refuses','B');

-- RN (20 - seed_extended has 3, add 17 more)
INSERT INTO _q_seed VALUES
('rn','cardiovascular','safe-care','A 65-year-old with hypertension has chest pain radiating to the left arm. BP 90/60, HR 110. Priority nursing action?','Administer nitroglycerin','Obtain 12-lead ECG within 10 minutes','Place in high Fowler''s','Start IV and draw enzymes','B'),
('rn','respiratory','safe-care','A COPD patient on 4 L/min O2 has decreased RR from 24 to 12 and is drowsy. Most likely cause?','Oxygen-induced hypoventilation (CO2 narcosis)','Pneumonia','Pulmonary embolism','Anxiety reduction','A'),
('rn','renal','safe-care','A 45-year-old has acute flank pain and hematuria. CT shows 6mm kidney stone. Anticipate first:','Lithotripsy','Ureteroscopy','Pain management and increased fluids','Nephrostomy tube','C'),
('rn','cardiovascular','safe-care','A patient with HFrEF is started on lisinopril. The nurse monitors for:','Hyperkalemia and hypotension','Hypokalemia and hypertension','Bradycardia','Hyperglycemia','A'),
('rn','respiratory','safe-care','Before extubation, the nurse ensures:','Patient is sedated','Cuff leak test and suction equipment ready','Family is present','Patient has eaten','B'),
('rn','renal','safe-care','A patient with AKI has urine output of 15 mL/hr. The nurse:','Increases IV fluids','Reports to provider and monitors','Administers diuretic','Documents only','B'),
('rn','psychiatric','psychosocial','A depressed patient says life is not worth living. The nurse''s priority:','Assess suicide risk directly','Change the subject','Offer reassurance only','Document at end of shift','A'),
('rn','cardiovascular','safe-care','A patient in atrial fibrillation has HR 140. Before diltiazem, the nurse verifies:','No allergies','BP is adequate; avoid if hypotensive','Patient has eaten','IV is saline lock','B'),
('rn','respiratory','safe-care','A patient with pneumonia has SpO2 88% on 2 L. The nurse:','Increases to 4 L','Increases to maintain SpO2 92%+ and notifies provider','Maintains current','Applies non-rebreather','B'),
('rn','renal','safe-care','A patient receiving amphotericin B is at risk for:','Nephrotoxicity and hypokalemia','Hepatotoxicity only','Ototoxicity','Peripheral neuropathy','A'),
('rn','cardiovascular','safe-care','ST elevation in leads V1-V4 suggests:','Inferior MI','Anterior MI','Lateral MI','Right ventricular MI','B'),
('rn','respiratory','safe-care','A patient with ARDS is on mechanical ventilation. PEEP is increased. The nurse monitors for:','Hypotension from decreased venous return','Hypertension','Bradycardia','Increased urine output','A'),
('rn','renal','safe-care','Before dialysis, the nurse assesses the AV fistula by:','Avoiding the arm for BP','Palpating thrill and auscultating bruit','Applying a tourniquet','Checking pedal pulses','B'),
('rn','psychiatric','psychosocial','A patient taking lithium should have levels monitored. Therapeutic range:','0.5-1.0 mEq/L','1.5-2.0 mEq/L','2.0-2.5 mEq/L','0.1-0.5 mEq/L','A'),
('rn','cardiovascular','safe-care','A patient with chest tube has continuous bubbling in water seal. The nurse:','Clamps the tube','Assesses for air leak; notifies if new or increased','Increases suction','Removes the tube','B'),
('rn','respiratory','safe-care','A patient with asthma has wheezing and use of accessory muscles. Priority:','Administer albuterol nebulizer','Obtain peak flow','Start IV','Order chest x-ray','A'),
('rn','renal','safe-care','Contrast-induced nephropathy risk is reduced by:','NPO 8 hours','IV hydration before and after','Restricting fluids','Administering NSAIDs','B'),
('rn','cardiovascular','safe-care','A patient with DVT on heparin has aPTT of 90 seconds. The nurse:','Continues heparin','Holds next dose and notifies provider','Increases rate','Obtains PT/INR','B'),
('rn','respiratory','safe-care','High-flow nasal cannula provides:','Low FiO2 only','Heated, humidified oxygen with positive pressure','Same as simple mask','No benefit over nasal cannula','B'),
('rn','psychiatric','psychosocial','A patient with schizophrenia has tardive dyskinesia. The nurse:','Increases antipsychotic','Documents and reports; considers medication change','Administers benztropine','Restrains the patient','B');

-- FNP (20)
INSERT INTO _q_seed VALUES
('fnp','cardiovascular','safe-care','A 55-year-old with HFrEF (EF 35%) is on lisinopril 10 mg. Next step per GDMT:','Add beta-blocker','Titrate lisinopril to target dose','Switch to ARNI','Add SGLT2i','B'),
('fnp','psychiatric','psychosocial','A 30-year-old with MDD has no response to sertraline 100 mg x 8 weeks. Best next step:','Increase to 200 mg','Switch to different antidepressant','Add psychotherapy','Reassess diagnosis and adherence','D'),
('fnp','cardiovascular','safe-care','A 60-year-old has BP 148/92 on two medications. Workup shows no secondary cause. Next:','Add third agent','Increase current agents to max','Consider spironolactone','Refer to cardiology','B'),
('fnp','respiratory','safe-care','A 45-year-old smoker has chronic cough. Spirometry shows FEV1/FVC 0.65. Diagnosis:','Asthma','COPD','Restrictive disease','Normal','B'),
('fnp','psychiatric','psychosocial','First-line pharmacotherapy for generalized anxiety disorder:','Benzodiazepine','SSRI or SNRI','Antipsychotic','Beta-blocker','B'),
('fnp','cardiovascular','safe-care','A patient with HFrEF should avoid:','ACE inhibitors','NSAIDs','Beta-blockers','SGLT2 inhibitors','B'),
('fnp','psychiatric','psychosocial','Before starting an SSRI, the NP screens for:','Diabetes','Bipolar disorder and suicide risk','Hypertension','Liver disease','B'),
('fnp','cardiovascular','safe-care','A 70-year-old with atrial fibrillation and CHA2DS2-VASc 4 should receive:','Aspirin only','Anticoagulation','No anticoagulation','Clopidogrel','B'),
('fnp','respiratory','safe-care','In COPD, long-acting muscarinic antagonist (LAMA) is used for:','Acute exacerbation only','Maintenance bronchodilation','Steroid-sparing','Antibiotic coverage','B'),
('fnp','psychiatric','psychosocial','Black box warning for SSRIs in young adults:','Weight gain','Suicidality','Sedation','Hypertension','B'),
('fnp','cardiovascular','safe-care','SGLT2 inhibitors in HFrEF:','Are contraindicated','Reduce hospitalization and mortality','Cause significant hypoglycemia only','Are for diabetes only','B'),
('fnp','psychiatric','psychosocial','Escitalopram starting dose for MDD:','5 mg daily','10 mg daily','20 mg daily','40 mg daily','B'),
('fnp','cardiovascular','safe-care','A patient on warfarin has INR 4.5. Action:','Hold dose and reduce; recheck in 1 week','Continue current dose','Give vitamin K','Increase dose','A'),
('fnp','respiratory','safe-care','Inhaled corticosteroid in asthma:','Used for acute rescue','Used for maintenance control','Replaces SABA','Not recommended','B'),
('fnp','psychiatric','psychosocial','Bupropion is a reasonable choice when:','Patient has seizure history','Patient has sexual dysfunction on SSRI','Patient has bipolar disorder','Patient is on MAOI','B'),
('fnp','cardiovascular','safe-care','ARNI (sacubitril-valsartan) requires:','Stopping ACE-I 48 hours before','No washout','Stopping beta-blocker','Hospitalization for initiation','A'),
('fnp','psychiatric','psychosocial','PHQ-9 score of 15 indicates:','Minimal depression','Moderate depression','Severe depression','Remission','B'),
('fnp','cardiovascular','safe-care','Statin therapy for primary prevention:','Start at age 40','Based on 10-year ASCVD risk','Only if LDL >190','Not for diabetics','B'),
('fnp','respiratory','safe-care','Peak flow monitoring in asthma:','Replaces spirometry','Helps with daily control assessment','Is only for diagnosis','Not useful','B'),
('fnp','psychiatric','psychosocial','Treatment-resistant depression: After 2 adequate trials, consider:','Continue same medication','Switch, augment, or combine','Discontinue all medications','ECT only','B');

-- PMHNP (20)
INSERT INTO _q_seed VALUES
('pmhnp','psychiatric','psychosocial','DSM-5 criteria for MDD require how many symptoms for 2+ weeks?','3','5','7','9','B'),
('pmhnp','psychiatric','psychosocial','MDD must include depressed mood or:','Anxiety','Anhedonia','Irritability','Insomnia','B'),
('pmhnp','neurological','psychosocial','Delirium is characterized by:','Chronic progressive decline','Acute fluctuating inattention','Stable cognitive deficit','Only in elderly','B'),
('pmhnp','psychiatric','psychosocial','First-line medication for MDD:','Benzodiazepine','SSRI or SNRI','Antipsychotic','Mood stabilizer','B'),
('pmhnp','psychiatric','psychosocial','Serotonin syndrome signs include:','Bradycardia, hypotension','Agitation, hyperreflexia, hyperthermia','Hypothermia, bradycardia','Only GI symptoms','B'),
('pmhnp','psychiatric','psychosocial','Before starting an antidepressant, rule out:','Diabetes','Hypothyroidism and bipolar disorder','Hypertension','Anemia','B'),
('pmhnp','psychiatric','psychosocial','Treatment-resistant depression: augmentation options include:','Increasing SSRI dose only','Lithium, T3, buspirone','Benzodiazepines','Antipsychotics only','B'),
('pmhnp','neurological','psychosocial','Differentiating delirium from dementia: delirium is:','Chronic','Reversible, acute onset','Progressive','Always fatal','B'),
('pmhnp','psychiatric','psychosocial','MAOI diet restrictions include avoiding:','Dairy','Tyramine-rich foods','Gluten','Caffeine','B'),
('pmhnp','psychiatric','psychosocial','Washout period between fluoxetine and MAOI:','24 hours','2 weeks','5 weeks','No washout','C'),
('pmhnp','psychiatric','psychosocial','ECT is indicated for:','Mild depression','Severe, treatment-resistant, or catatonic depression','First-line always','Never in elderly','B'),
('pmhnp','psychiatric','psychosocial','Venlafaxine is an:','SSRI','SNRI','NDRI','MAOI','B'),
('pmhnp','psychiatric','psychosocial','Mirtazapine is useful when:','Patient needs stimulation','Patient has insomnia and poor appetite','Patient has hypertension','Patient is on SSRI','B'),
('pmhnp','psychiatric','psychosocial','Vortioxetine mechanism:','Dopamine reuptake only','Multimodal: 5-HT reuptake and receptor modulation','GABA agonist','NMDA antagonist','B'),
('pmhnp','psychiatric','psychosocial','Suicide risk assessment includes:','Only current ideation','Ideation, plan, intent, means, protective factors','Past attempts only','Family history only','B'),
('pmhnp','neurological','psychosocial','Anticholinergic burden increases risk for:','Hypertension','Delirium and falls','Diabetes','Weight gain','B'),
('pmhnp','psychiatric','psychosocial','Buspirone:','Is a benzodiazepine','Is a 5-HT1A partial agonist','Causes dependence','Works immediately','B'),
('pmhnp','psychiatric','psychosocial','Trazodone at low dose is commonly used for:','Depression as monotherapy','Insomnia as adjunct','Anxiety','Psychosis','B'),
('pmhnp','psychiatric','psychosocial','Clozapine requires:','No monitoring','ANC monitoring (agranulocytosis risk)','Only metabolic monitoring','ECG only','B'),
('pmhnp','psychiatric','psychosocial','Bipolar depression: first-line mood stabilizer for acute episode:','SSRI alone','Lithium or quetiapine','Benzodiazepine','Antipsychotic alone','B');

-- Insert questions and options from temp table
DO $$
DECLARE
  r RECORD;
  qid UUID;
  et_id UUID;
  qt_id UUID;
  d_id UUID;
  s_id UUID;
BEGIN
  FOR r IN SELECT * FROM _q_seed
  LOOP
    SELECT id INTO et_id FROM exam_tracks WHERE slug = r.track LIMIT 1;
    SELECT id INTO qt_id FROM question_types WHERE slug = 'single_best_answer' LIMIT 1;
    SELECT id INTO d_id FROM domains WHERE slug = r.domain_slug LIMIT 1;
    SELECT id INTO s_id FROM systems WHERE exam_track_id = et_id AND slug = r.sys LIMIT 1;
    IF et_id IS NOT NULL AND qt_id IS NOT NULL AND d_id IS NOT NULL AND s_id IS NOT NULL THEN
      INSERT INTO questions (exam_track_id, question_type_id, domain_id, system_id, stem, status)
      VALUES (et_id, qt_id, d_id, s_id, r.stem, 'approved')
      RETURNING id INTO qid;
      INSERT INTO question_options (question_id, option_key, option_text, is_correct, display_order)
      VALUES
        (qid, 'A', r.opt_a, r.correct = 'A', 1),
        (qid, 'B', r.opt_b, r.correct = 'B', 2),
        (qid, 'C', r.opt_c, r.correct = 'C', 3),
        (qid, 'D', r.opt_d, r.correct = 'D', 4);
    END IF;
  END LOOP;
END $$;

DROP TABLE _q_seed;
