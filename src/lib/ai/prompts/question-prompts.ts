/**
 * Track-specific question prompt templates for AI Content Factory.
 * RN → NCLEX-style; FNP → diagnosis/management; PMHNP → psych; LVN → fundamentals.
 */

import { appendTrackStrictInstruction } from "../jade-track-context";
import type { ExamTrack, QuestionItemType } from "../question-factory/types";

const TRACK_NAMES: Record<ExamTrack, string> = {
  lvn: "LVN/LPN",
  rn: "RN",
  fnp: "FNP",
  pmhnp: "PMHNP",
};

/** Track-specific quality rules—generator must change tone and emphasis by track */
const TRACK_FRAMING: Record<ExamTrack, string> = {
  rn: `RN (NCLEX Style) — Emphasize: prioritization, patient safety, nursing assessment, early intervention, delegation, medication safety, clinical judgment.
Use nursing process thinking: Assessment → Diagnosis → Planning → Implementation → Evaluation.`,

  fnp: `FNP (Primary Care Boards) — Emphasize: diagnosis, outpatient management, medication selection, screening recommendations, follow-up care, prevention.
Typical FNP question flow: patient presents with symptoms → identify diagnosis → select best management.`,

  pmhnp: `PMHNP (Psychiatry Boards) — Emphasize: DSM diagnostic distinctions, psychopharmacology, therapy modalities, suicide risk assessment, crisis intervention, substance use disorders.
Psych questions must often test: diagnosis, best medication, therapy selection, risk assessment.`,

  lvn: `LVN/LPN (Fundamentals) — Emphasize: safe scope of practice, fundamentals, medication administration, documentation, patient safety, infection control.
Use simple language. Focus on what LVNs do and do not do.`,
};

/** Approved evidence sources per track (must cite at least one). Slug = primary_reference / guideline_reference. */
const APPROVED_SOURCES_BY_TRACK: Record<ExamTrack, string> = {
  rn: "Tier 1: ncsbn_nclex. Tier 2: lippincott_manual, saunders_nclex, lippincott_drug, davis_drug, brunner_suddarth. Tier 3: cdc_guidelines, uspstf, aha_guidelines, ada_standards.",
  lvn: "Tier 1: ncsbn_nclex. Tier 2: lippincott_manual, saunders_nclex, lippincott_drug, davis_drug, brunner_suddarth. Tier 3: cdc_guidelines, uspstf, aha_guidelines, ada_standards.",
  fnp: "Tier 1: ancc_fnp_outline, aanp_fnp_blueprint. Tier 2: current_medical_dx, bates_physical, fitzgerald_np, primary_care_interprofessional. Tier 3: uspstf, cdc_guidelines, ada_standards, acc_aha, acog, aap.",
  pmhnp: "Tier 1: ancc_pmhnp_outline, dsm5tr. Tier 2: stahl_psychopharmacology, kaplan_sadock, carlat_psychiatry. Tier 3: apa_guidelines, va_dod_psychiatric, samhsa.",
};

const EVIDENCE_SOURCE_REQUIREMENTS = `EVIDENCE SOURCE REQUIREMENTS — Use ONLY approved sources. Include in JSON:
- primary_reference: slug from approved list (required)
- guideline_reference: slug from Tier 3 if applicable (optional)
- evidence_tier: 1 (test plan), 2 (textbook), or 3 (guideline)
Content without valid source mapping cannot be published.`;

const ITEM_TYPE_GUIDANCE: Record<QuestionItemType, string> = {
  single_best_answer:
    "Single Best Answer: 4 options, exactly one correct. Clear clinical scenario, one focused question.",
  multiple_response:
    "Multiple Response: Select all that apply. 4-6 options, 2+ correct. Include 'Select all that apply' in instructions.",
  select_n:
    "Select N: Choose exactly N options (e.g., 2). Specify N in instructions. 4-6 options, exactly N correct.",
  image_based:
    "Image-based: Stem references [IMAGE PLACEHOLDER - insert ECG, X-ray, or diagram]. Generate options as if image showed the finding. Use placeholder text '[See image above]' where needed.",
  chart_table_exhibit:
    "Chart/Table Exhibit: Stem references [CHART/TABLE PLACEHOLDER]. Generate options based on typical chart data (vitals, labs). Use '[Refer to chart]' in stem.",
  ordered_response:
    "Ordered Response: 4 options to drag into correct sequence. Each option has correctOrder (1-4). Instructions: 'Place in correct order.'",
  hotspot:
    "Hotspot: Stem describes image region to select. Options use coords placeholder {x,y,radius}. Generate 4 regions; one correct. Stem: '[HOTSPOT PLACEHOLDER - identify the correct area]'.",
  case_study:
    "Case Study: leadIn has 2-4 paragraph scenario. Stem is the specific question. 4 options, one correct. Realistic patient scenario.",
  dosage_calc:
    "Dosage calculation: Stem has medication, order, supply. 4 numeric options, one correct. Include units. Instructions: 'Round to nearest tenth. Include unit.'",
};

function buildContextBlock(ctx: {
  track: ExamTrack;
  domain?: string;
  system?: string;
  topic?: string;
  objective?: string;
  difficulty?: number;
}): string {
  const parts: string[] = [
    `Track: ${TRACK_NAMES[ctx.track]}`,
    ctx.domain ? `Domain: ${ctx.domain}` : null,
    ctx.system ? `System: ${ctx.system}` : null,
    ctx.topic ? `Topic: ${ctx.topic}` : null,
    ctx.objective ? `Learning objective: ${ctx.objective}` : null,
    ctx.difficulty ? `Difficulty: ${ctx.difficulty}/5` : null,
  ].filter((x): x is string => x != null);
  return parts.join("\n");
}

const JADE_QUESTION_PERSONA = `You are Jade Tutor, an expert nursing and advanced practice exam content writer.

Your task is to create board-style exam questions comparable in quality to leading exam preparation platforms.

Your questions must evaluate clinical reasoning, not simple recall.`;

const JADE_QUESTION_RULES = `Follow these strict rules:
1. Questions must resemble real board exam questions.
2. Avoid trivial recall questions.
3. Each question must require clinical reasoning.
4. The correct answer must be clearly correct.
5. Distractors must be plausible but incorrect (see Distractor Design Rules).
6. Avoid "all of the above" or "none of the above".
7. Avoid trick questions.
8. Focus on safe clinical decision making.`;

/** Case complexity: use varied stem structures by difficulty */
const CASE_COMPLEXITY_GUIDELINES = `Case Complexity Guidelines — Use varied stem structures:
- Simple Recall (Easy): "Which medication treats hypertension?" — direct, focused.
- Clinical Reasoning (Moderate): "A 58-year-old patient with diabetes presents with chest pain..." — scenario + one-step reasoning.
- Multi-Step Thinking (Hard): "A patient with COPD exacerbation develops respiratory acidosis... What is the next best step?" — complex scenario, requires synthesis.`;

/** Reject questions that fail quality guardrails */
const QUALITY_GUARDRAILS = `Question Quality Guardrails — Reject (do not generate) questions that:
- Test pure memorization
- Have ambiguous answers
- Lack clinical reasoning
- Would repeat existing questions (vary scenarios and phrasing)`;

/** Weak distractors ruin question quality. Each distractor must be tempting but wrong. */
const DISTRACTOR_DESIGN_RULES = `Distractor Design Rules (Critical):
Distractors must be:
1. Clinically plausible
2. Common student mistakes
3. Incorrect due to a specific reasoning flaw

Example: Correct answer = treat DKA with insulin.
Good distractors: Give bicarbonate | Start oral diabetes medication | Give glucose
Each distractor must be tempting but wrong.`;

const STEM_REQUIREMENTS = `Question Stem must include:
- Realistic clinical scenario
- Patient age
- Relevant symptoms
- Relevant history
- Key lab or imaging findings if applicable
- Enough detail to require reasoning`;

const OPTION_REQUIREMENTS = `Answer Choices:
- 4 answer choices
- One correct answer
- Distractors: clinically plausible, common student mistakes, wrong due to a specific reasoning flaw
- Each distractor must be tempting but wrong`;

const RATIONALE_REQUIREMENTS = `Rationale: Explain why the correct answer is correct and the clinical reasoning.
Distractor Rationales (Important — most platforms skip this; yours must not): For each wrong option, explain why it is wrong and why students might choose it.
Teaching Point: One high-yield takeaway.`;

/** Realistic example output format — options as strings, correct_index, distractor_rationales */
const REALISTIC_QUESTION_EXAMPLE = `Example output format:
{
  "stem": "A 68-year-old man with a history of hypertension and diabetes presents with crushing chest pain radiating to his left arm. ECG shows ST elevation in leads II, III, and aVF. What is the most appropriate initial medication?",
  "options": ["Aspirin", "Metformin", "Furosemide", "Warfarin"],
  "correct_index": 0,
  "rationale": "Aspirin should be given immediately in suspected myocardial infarction because it inhibits platelet aggregation and reduces mortality.",
  "distractor_rationales": [
    "Metformin is used to treat diabetes but does not treat myocardial infarction.",
    "Furosemide treats fluid overload but is not first-line in acute MI.",
    "Warfarin is an anticoagulant used for chronic management but is not the immediate first treatment."
  ],
  "teaching_point": "Early aspirin administration improves survival in myocardial infarction."
}`;

export function buildQuestionPrompt(
  track: ExamTrack,
  itemType: QuestionItemType,
  context: {
    domain?: string;
    system?: string;
    topic?: string;
    objective?: string;
    difficulty?: number;
  }
): { system: string; user: string } {
  const ctxBlock = buildContextBlock({ track, ...context });
  const typeGuidance = ITEM_TYPE_GUIDANCE[itemType];
  const trackFraming = TRACK_FRAMING[track];

  const system = `${JADE_QUESTION_PERSONA}

You generate ${itemType.replace(/_/g, " ")} question drafts for ${TRACK_NAMES[track]} board prep.

Item type: ${typeGuidance}

Track framing: ${trackFraming}

Approved sources for ${TRACK_NAMES[track]}: ${APPROVED_SOURCES_BY_TRACK[track]}

${EVIDENCE_SOURCE_REQUIREMENTS}

${JADE_QUESTION_RULES}

${QUALITY_GUARDRAILS}

${CASE_COMPLEXITY_GUIDELINES}

${DISTRACTOR_DESIGN_RULES}

Each question must include:
${STEM_REQUIREMENTS}

${OPTION_REQUIREMENTS}

${RATIONALE_REQUIREMENTS}

Output rules:
- Output ONLY valid JSON. No markdown, no preamble.
- Options: key (A,B,C,D), text, isCorrect, distractorRationale for wrong options.
- Never provide specific medical advice. Educational exam prep only.
- Board-Style Language Filter: Avoid ambiguous wording, vague symptoms, or missing patient context. Reject your own output if these are present.
- Post-Generation Self-Check: Stem length > 120 characters; rationale > 200 characters; distractor rationales present for all wrong options.`;

  const sysWithTrack = appendTrackStrictInstruction(system, track);

  const preferredSchema =
    itemType === "single_best_answer"
      ? `${REALISTIC_QUESTION_EXAMPLE}

You may also use object format with key/text/isCorrect. Both formats are accepted. Include teaching_point, primary_reference (required), guideline_reference (optional), evidence_tier (1-3), and optionally mnemonic, difficulty (1-5), domain, system, topic, learningObjective.`
      : `{
  "stem": "Clinical scenario and question (patient age, symptoms, history, key findings)",
  "leadIn": "Optional scenario intro",
  "instructions": "e.g. Select the best answer",
  "itemType": "${itemType}",
  "options": [
    {"key": "A", "text": "Option text", "isCorrect": false, "distractorRationale": "Why wrong"},
    {"key": "B", "text": "Correct option", "isCorrect": true},
    {"key": "C", "text": "Distractor", "isCorrect": false, "distractorRationale": "Why wrong"},
    {"key": "D", "text": "Distractor", "isCorrect": false, "distractorRationale": "Why wrong"}
  ],
  "rationale": "Why correct; explain clinical reasoning",
  "teaching_point": "One high-yield takeaway",
  "primary_reference": "slug from approved list (e.g. ncsbn_nclex, brunner_suddarth)",
  "guideline_reference": "optional slug (e.g. aha_guidelines)",
  "evidence_tier": 2,
  "mnemonic": "Optional: e.g. MONA for MI = Morphine, Oxygen, Nitroglycerin, Aspirin",
  "difficulty": 3,
  "domain": "${context.domain ?? "—"}",
  "system": "${context.system ?? "—"}",
  "topic": "${context.topic ?? "—"}",
  "learningObjective": "${context.objective ?? "—"}",
  "tags": ["tag1", "tag2"]
}`;

  const baseSchema =
    itemType === "single_best_answer"
      ? preferredSchema
      : `{
  "stem": "Clinical scenario and question (patient age, symptoms, history, key findings)",
  "leadIn": "Optional scenario intro",
  "instructions": "e.g. Select the best answer",
  "itemType": "${itemType}",
  "options": [
    {"key": "A", "text": "Option text", "isCorrect": false, "distractorRationale": "Why wrong"},
    {"key": "B", "text": "Correct option", "isCorrect": true},
    {"key": "C", "text": "Distractor", "isCorrect": false, "distractorRationale": "Why wrong"},
    {"key": "D", "text": "Distractor", "isCorrect": false, "distractorRationale": "Why wrong"}
  ],
  "rationale": "Why correct; explain clinical reasoning",
  "teaching_point": "One high-yield takeaway",
  "primary_reference": "slug from approved list",
  "guideline_reference": "optional slug",
  "evidence_tier": 2,
  "mnemonic": "Optional: e.g. MONA for MI = Morphine, Oxygen, Nitroglycerin, Aspirin",
  "difficulty": 3,
  "domain": "${context.domain ?? "—"}",
  "system": "${context.system ?? "—"}",
  "topic": "${context.topic ?? "—"}",
  "learningObjective": "${context.objective ?? "—"}",
  "tags": ["tag1", "tag2"]
}`;

  const schemaByType: Partial<Record<QuestionItemType, string>> = {
    ordered_response: `{
  "stem": "Question",
  "instructions": "Place in correct order.",
  "itemType": "ordered_response",
  "options": [
    {"key": "1", "text": "First step", "isCorrect": true, "correctOrder": 1},
    {"key": "2", "text": "Second step", "isCorrect": true, "correctOrder": 2},
    {"key": "3", "text": "Third step", "isCorrect": true, "correctOrder": 3},
    {"key": "4", "text": "Fourth step", "isCorrect": true, "correctOrder": 4}
  ],
  "rationale": "Correct sequence explanation",
  "difficulty": 3,
  "domain": "${context.domain ?? "—"}",
  "system": "${context.system ?? "—"}",
  "topic": "${context.topic ?? "—"}",
  "learningObjective": "${context.objective ?? "—"}",
  "tags": []
}`,
    select_n: `{
  "stem": "Question",
  "instructions": "Select the 2 most appropriate responses.",
  "itemType": "select_n",
  "selectN": 2,
  "options": [
    {"key": "A", "text": "Option", "isCorrect": true, "distractorRationale": null},
    {"key": "B", "text": "Option", "isCorrect": true, "distractorRationale": null},
    {"key": "C", "text": "Option", "isCorrect": false, "distractorRationale": "Why wrong"},
    {"key": "D", "text": "Option", "isCorrect": false, "distractorRationale": "Why wrong"}
  ],
  "rationale": "Why these 2 are correct",
  "difficulty": 3,
  "domain": "${context.domain ?? "—"}",
  "system": "${context.system ?? "—"}",
  "topic": "${context.topic ?? "—"}",
  "learningObjective": "${context.objective ?? "—"}",
  "tags": []
}`,
    multiple_response: `{
  "stem": "Question",
  "instructions": "Select all that apply.",
  "itemType": "multiple_response",
  "options": [
    {"key": "A", "text": "Option", "isCorrect": true, "distractorRationale": null},
    {"key": "B", "text": "Option", "isCorrect": false, "distractorRationale": "Why wrong"},
    {"key": "C", "text": "Option", "isCorrect": true, "distractorRationale": null},
    {"key": "D", "text": "Option", "isCorrect": false, "distractorRationale": "Why wrong"}
  ],
  "rationale": "Why correct options; why wrong ones",
  "difficulty": 3,
  "domain": "${context.domain ?? "—"}",
  "system": "${context.system ?? "—"}",
  "topic": "${context.topic ?? "—"}",
  "learningObjective": "${context.objective ?? "—"}",
  "tags": []
}`,
    image_based: `{
  "stem": "Based on the [IMAGE PLACEHOLDER - insert ECG/diagram above], what is the correct interpretation?",
  "instructions": "Refer to the image above.",
  "itemType": "image_based",
  "exhibitPlaceholder": "ECG or diagram",
  "options": [
    {"key": "A", "text": "Option", "isCorrect": false, "distractorRationale": "Why wrong"},
    {"key": "B", "text": "Correct interpretation", "isCorrect": true},
    {"key": "C", "text": "Option", "isCorrect": false, "distractorRationale": "Why wrong"},
    {"key": "D", "text": "Option", "isCorrect": false, "distractorRationale": "Why wrong"}
  ],
  "rationale": "Why correct",
  "difficulty": 3,
  "domain": "${context.domain ?? "—"}",
  "system": "${context.system ?? "—"}",
  "topic": "${context.topic ?? "—"}",
  "learningObjective": "${context.objective ?? "—"}",
  "tags": []
}`,
    chart_table_exhibit: `{
  "stem": "Refer to the [CHART PLACEHOLDER]. Based on the data, what finding requires immediate action?",
  "instructions": "Refer to the chart above.",
  "itemType": "chart_table_exhibit",
  "exhibitPlaceholder": "Vitals/labs chart",
  "options": [
    {"key": "A", "text": "Option", "isCorrect": false, "distractorRationale": "Why wrong"},
    {"key": "B", "text": "Correct", "isCorrect": true},
    {"key": "C", "text": "Option", "isCorrect": false, "distractorRationale": "Why wrong"},
    {"key": "D", "text": "Option", "isCorrect": false, "distractorRationale": "Why wrong"}
  ],
  "rationale": "Why correct",
  "difficulty": 3,
  "domain": "${context.domain ?? "—"}",
  "system": "${context.system ?? "—"}",
  "topic": "${context.topic ?? "—"}",
  "learningObjective": "${context.objective ?? "—"}",
  "tags": []
}`,
    hotspot: `{
  "stem": "[HOTSPOT PLACEHOLDER] Identify the correct area on the diagram.",
  "instructions": "Click on the correct region.",
  "itemType": "hotspot",
  "options": [
    {"key": "A", "text": "Region A", "isCorrect": false, "coords": {"x": 0.2, "y": 0.3, "radius": 0.05}, "distractorRationale": "Why wrong"},
    {"key": "B", "text": "Region B (correct)", "isCorrect": true, "coords": {"x": 0.5, "y": 0.5, "radius": 0.05}},
    {"key": "C", "text": "Region C", "isCorrect": false, "coords": {"x": 0.7, "y": 0.3, "radius": 0.05}, "distractorRationale": "Why wrong"},
    {"key": "D", "text": "Region D", "isCorrect": false, "coords": {"x": 0.5, "y": 0.7, "radius": 0.05}, "distractorRationale": "Why wrong"}
  ],
  "rationale": "Why correct region",
  "difficulty": 3,
  "domain": "${context.domain ?? "—"}",
  "system": "${context.system ?? "—"}",
  "topic": "${context.topic ?? "—"}",
  "learningObjective": "${context.objective ?? "—"}",
  "tags": []
}`,
    case_study: `{
  "stem": "Specific question based on scenario",
  "leadIn": "2-4 paragraph patient scenario (demographics, presentation, vital signs, relevant history)",
  "instructions": "Select the best answer.",
  "itemType": "case_study",
  "options": [
    {"key": "A", "text": "Option", "isCorrect": false, "distractorRationale": "Why wrong"},
    {"key": "B", "text": "Correct", "isCorrect": true},
    {"key": "C", "text": "Option", "isCorrect": false, "distractorRationale": "Why wrong"},
    {"key": "D", "text": "Option", "isCorrect": false, "distractorRationale": "Why wrong"}
  ],
  "rationale": "Why correct",
  "difficulty": 3,
  "domain": "${context.domain ?? "—"}",
  "system": "${context.system ?? "—"}",
  "topic": "${context.topic ?? "—"}",
  "learningObjective": "${context.objective ?? "—"}",
  "tags": []
}`,
    dosage_calc: `{
  "stem": "The provider orders [medication] [dose] [route]. The pharmacy supplies [concentration]. How many [units] should the nurse administer?",
  "instructions": "Round to the nearest tenth. Include unit in your answer.",
  "itemType": "dosage_calc",
  "dosageContext": "Medication and concentration",
  "options": [
    {"key": "A", "text": "0.5 mL", "isCorrect": false, "distractorRationale": "Calculation error"},
    {"key": "B", "text": "1.2 mL", "isCorrect": true},
    {"key": "C", "text": "2.0 mL", "isCorrect": false, "distractorRationale": "Calculation error"},
    {"key": "D", "text": "1.0 mL", "isCorrect": false, "distractorRationale": "Calculation error"}
  ],
  "rationale": "Step-by-step calculation",
  "difficulty": 3,
  "domain": "${context.domain ?? "—"}",
  "system": "${context.system ?? "—"}",
  "topic": "${context.topic ?? "—"}",
  "learningObjective": "${context.objective ?? "—"}",
  "tags": ["dosage_calculation"]
}`,
  };

  const schema = schemaByType[itemType] ?? baseSchema;

  const user = `Generate one ${itemType.replace(/_/g, " ")} question.

Context:
${ctxBlock}

Respond with ONLY this JSON (no other text):
${schema}`;

  return { system: sysWithTrack, user };
}

// -----------------------------------------------------------------------------
// Worker batch prompt - originality-first, no copyrighted content
// -----------------------------------------------------------------------------

const ORIGINALITY_RULES = `CRITICAL — Originality Rules (Jade Tutor must follow strictly):
1. Generate ONLY original questions. Never copy, paraphrase, or adapt from copyrighted sources.
2. Do NOT use language, stems, or explanations from: UWorld, Kaplan, ATI, NCLEX prep books, or any trademarked exam prep materials.
3. Do NOT reproduce proprietary question formats, trademarked mnemonics, or branded content.
4. Create unique clinical scenarios. Vary patient demographics, presentations, and findings.
5. Write rationales and distractor rationales in your own words. Never copy explanations from external sources.
6. If a concept is commonly tested, create a NEW scenario and NEW phrasing—do not mimic existing questions.`;

export interface WorkerQuestionContext {
  examTrackId: string;
  systemId: string;
  topicId?: string | null;
  systemName?: string;
  topicName?: string;
  domainName?: string;
  objectives?: string[];
  blueprintTags?: string[];
  difficultyMix?: Record<number, number>;
  questionTypeMix?: Record<string, number>;
}

export function buildWorkerQuestionPrompt(
  track: ExamTrack,
  itemType: QuestionItemType,
  context: WorkerQuestionContext & {
    domain?: string;
    system?: string;
    topic?: string;
    objective?: string;
    difficulty?: number;
  }
): { system: string; user: string } {
  const base = buildQuestionPrompt(track, itemType, {
    domain: context.domain ?? context.domainName,
    system: context.system ?? context.systemName,
    topic: context.topic ?? context.topicName,
    objective: context.objective ?? context.objectives?.[0],
    difficulty: context.difficulty,
  });

  const originalityBlock = `${ORIGINALITY_RULES}

${base.system}`;

  return {
    system: originalityBlock,
    user: base.user,
  };
}

/** Build batch prompt for N questions of given type and difficulty */
export function buildWorkerBatchPrompt(
  track: ExamTrack,
  itemType: QuestionItemType,
  context: WorkerQuestionContext & { difficulty?: number },
  count: number
): { system: string; user: string } {
  const base = buildWorkerQuestionPrompt(track, itemType, context);

  const objList = context.objectives?.length
    ? `\nLearning objectives to cover:\n${context.objectives.map((o, i) => `${i + 1}. ${o}`).join("\n")}`
    : "";

  const tagList = context.blueprintTags?.length
    ? `\nBlueprint tags: ${context.blueprintTags.join(", ")}`
    : "";

  const user = `Generate ${count} distinct ${itemType.replace(/_/g, " ")} questions.
${objList}${tagList}

Context: Track ${track}, System: ${context.systemName ?? context.systemId}, Topic: ${context.topicName ?? "general"}${context.difficulty ? `, Difficulty: ${context.difficulty}/5` : ""}

Each question must be ORIGINAL. Vary scenarios, patient presentations, and phrasing.

Respond with a JSON array of ${count} question objects. Each object must match the schema from the system prompt.
Output ONLY the JSON array, no other text.`;
  return { system: base.system, user };
}
