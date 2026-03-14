/**
 * Board-Specific AI Factory Profiles
 *
 * Defines item-writing style, clinical setting, cognitive level, question types,
 * rationale/distractor style, safety constraints, and evidence framing per board.
 * Generation prompt composition uses these profiles so content aligns to each exam.
 */

import type { ExamTrack } from "./question-factory/types";
import type { QuestionItemType } from "./question-factory/types";

export type BoardProfileId = "NCLEX_RN" | "NCLEX_LVN" | "FNP_BOARD" | "PMHNP_BOARD";

export interface BoardProfile {
  id: BoardProfileId;
  name: string;
  /** How to write items: stem structure, question phrasing, NCLEX vs board style */
  itemWritingStyle: string;
  /** Preferred clinical settings (emphasize in scenarios) */
  preferredClinicalSetting: string;
  /** Cognitive level emphasis: recall, application, analysis, prioritization */
  cognitiveLevelEmphasis: string;
  /** Allowed question types for this board (primary first) */
  allowedQuestionTypes: QuestionItemType[];
  /** How rationales should be written */
  rationaleStyle: string;
  /** How distractors should be designed */
  distractorStyle: string;
  /** Safety and scope constraints */
  safetyConstraints: string;
  /** How to frame and cite evidence */
  evidenceFraming: string;
}

const NCLEX_RN_PROFILE: BoardProfile = {
  id: "NCLEX_RN",
  name: "NCLEX-RN",
  itemWritingStyle: `NCLEX-style item writing: scenario-based stems with a single best answer. Emphasize what the nurse should do first, which client to see first, or which action is most appropriate. Use nursing process language (assess, plan, implement, evaluate). Stems often present a situation and ask for the next action, priority, or best response. Avoid medical diagnosis as the endpoint—focus on nursing intervention and safety.`,
  preferredClinicalSetting: `Vary settings: acute care (medical-surgical, ICU, ED), long-term care, community, clinic. Prioritization and delegation questions often use acute or shift-based scenarios. Include telemetry, post-op, and bedside nursing contexts.`,
  cognitiveLevelEmphasis: `Emphasize: safety and prioritization (ABCs, Maslow, risk), delegation (RN vs LPN vs UAP), first action / immediate intervention, nursing assessment before action, and clinical judgment. Mix application and analysis; avoid pure recall. "Which client to see first?" and "What is the nurse's best response?" are classic.`,
  allowedQuestionTypes: [
    "single_best_answer",
    "multiple_response",
    "ordered_response",
    "case_study",
    "chart_table_exhibit",
    "dosage_calc",
    "image_based",
    "select_n",
    "hotspot",
  ],
  rationaleStyle: `Explain why the correct answer is correct in terms of safety, priority, or nursing standard. For wrong options, state why each is incorrect (e.g., "delays treatment," "outside scope," "not the priority"). Reference nursing process step or principle (e.g., assess before act). Teaching point: one high-yield nursing takeaway.`,
  distractorStyle: `Distractors should be plausible nursing actions or responses that are wrong because they are unsafe, out of order, outside scope, or less appropriate. Common traps: doing something before assessing, delegating inappropriately, or choosing a correct-but-not-first action.`,
  safetyConstraints: `Never recommend actions outside RN scope. Emphasize when to report to provider, when to delegate, and when to act independently. Patient safety and risk reduction must be explicit. No prescribing or medical diagnosis as the primary focus.`,
  evidenceFraming: `Align to NCSBN test plan and NCLEX-style item design. Cite nursing standards, guidelines, and evidence-based practice. Use Tier 1/2/3 sources; primary_reference should reflect NCLEX content (e.g., ncsbn_nclex, lippincott_manual, saunders_nclex).`,
};

const NCLEX_LVN_PROFILE: BoardProfile = {
  id: "NCLEX_LVN",
  name: "NCLEX-PN / LVN/LPN",
  itemWritingStyle: `LVN/LPN item writing: simpler, more concrete stems. Focus on tasks within LVN scope: data collection, reporting, basic nursing care, medication administration (within scope), and when to notify the RN or provider. Use clear, direct language. Avoid complex multi-step reasoning that assumes RN-level decision-making.`,
  preferredClinicalSetting: `Skilled nursing, long-term care, clinic, home health, and acute care under RN direction. Emphasize settings where LVNs commonly work: vital signs, ADLs, wound care, medication pass, documentation, and reporting.`,
  cognitiveLevelEmphasis: `Emphasize: safe scope of practice (what LVN can and cannot do), when to report to RN/provider, fundamentals (infection control, safety, basic care), medication administration safety, and documentation. Application over analysis; avoid advanced prioritization that requires RN judgment.`,
  allowedQuestionTypes: [
    "single_best_answer",
    "multiple_response",
    "ordered_response",
    "case_study",
    "chart_table_exhibit",
    "dosage_calc",
    "select_n",
  ],
  rationaleStyle: `Explain in simple terms why the answer is correct and why others are wrong. Emphasize scope: "The LVN should report to the RN" or "This is within LVN scope." Teaching point: one foundational takeaway.`,
  distractorStyle: `Distractors often represent RN-only actions, unsafe delegation, or failure to report. Plausible wrong answers include doing something beyond scope or delaying reporting.`,
  safetyConstraints: `Strict scope: no independent diagnosis, no prescribing, no RN-only delegation decisions. Emphasize reportable findings and when to seek RN/provider guidance. Patient safety and infection control are paramount.`,
  evidenceFraming: `Align to NCSBN LPN/LVN test plan. Use same Tier 1/2/3 sources as RN where appropriate; emphasize fundamentals and scope. primary_reference: ncsbn_nclex and fundamentals-oriented texts.`,
};

const FNP_BOARD_PROFILE: BoardProfile = {
  id: "FNP_BOARD",
  name: "FNP Certification (ANCC/AANP)",
  itemWritingStyle: `FNP board-style: primary care management focus. Stems typically present a patient in outpatient or clinic setting with symptoms or findings; ask for diagnosis, next step in workup, first-line treatment, or follow-up. Use guideline-based language (e.g., USPSTF, specialty guidelines). Differential diagnosis and "most likely" or "best next step" are common.`,
  preferredClinicalSetting: `Outpatient primary care, clinic, telehealth, and follow-up visits. Screening, chronic disease management, acute office visits, and preventive care. Inpatient only when relevant to primary care (e.g., discharge follow-up).`,
  cognitiveLevelEmphasis: `Emphasize: diagnosis (history, physical, labs/imaging), first-line management, screening recommendations, when to refer, guideline-based treatment, and follow-up. Application and analysis; integrate USPSTF and specialty guidelines.`,
  allowedQuestionTypes: [
    "single_best_answer",
    "multiple_response",
    "case_study",
    "chart_table_exhibit",
    "select_n",
    "ordered_response",
  ],
  rationaleStyle: `Rationale must explain why the diagnosis or management option is correct per guidelines or evidence. For wrong options: why they are incorrect or less appropriate (e.g., "not first-line," "indicated for different presentation"). Cite guideline or evidence tier when relevant. Teaching point: high-yield primary care pearl.`,
  distractorStyle: `Distractors: other plausible diagnoses, alternative treatments (second-line or wrong context), or actions that are not best next step. Common traps: over-testing, wrong first-line drug, or missing red flags.`,
  safetyConstraints: `Stay within NP scope; emphasize when to refer to specialist or escalate. Red flags and safety nets (e.g., when to avoid a drug, when to order further workup) must be clear. No experimental or off-label as first choice unless guideline-supported.`,
  evidenceFraming: `Frame evidence using FNP blueprints (ANCC, AANP), USPSTF, CDC, and specialty guidelines (e.g., ADA, AHA, ACOG). primary_reference and guideline_reference should reflect primary care sources. evidence_tier: 1 for test plan, 2 for textbooks, 3 for guidelines.`,
};

const PMHNP_BOARD_PROFILE: BoardProfile = {
  id: "PMHNP_BOARD",
  name: "PMHNP Certification (ANCC)",
  itemWritingStyle: `PMHNP board-style: psychiatric diagnosis and treatment. Stems present a patient with mental health symptoms or history; ask for DSM-aligned diagnosis, best medication, therapy modality, or risk assessment. Use DSM-5-TR language and psychiatric terminology. Psychopharmacology and safety (suicide, violence, capacity) are core.`,
  preferredClinicalSetting: `Outpatient psychiatry, partial hospitalization, inpatient psychiatric unit, crisis assessment, telehealth. Include therapy settings and medication management visits.`,
  cognitiveLevelEmphasis: `Emphasize: DSM differential diagnosis, psychopharmacology (indications, side effects, interactions), suicide and violence risk assessment, therapeutic communication, and when to hospitalize or adjust treatment. Application and analysis; align logic to DSM and evidence-based psych care.`,
  allowedQuestionTypes: [
    "single_best_answer",
    "multiple_response",
    "case_study",
    "select_n",
    "ordered_response",
  ],
  rationaleStyle: `Rationale must explain diagnosis per DSM criteria or why a treatment is first-line (or contraindicated). For wrong options: why they don't fit the presentation or have worse risk/benefit. Reference DSM or guideline when relevant. Teaching point: high-yield psych pearl.`,
  distractorStyle: `Distractors: other DSM diagnoses that are plausible but don't fit best, alternative medications (wrong indication or higher risk), or actions that are not first-line or safe. Common traps: missing safety assessment, wrong drug class, or ignoring contraindications.`,
  safetyConstraints: `Safety first: suicide risk, violence risk, and capacity must be addressed when relevant. Do not recommend treatments that are contraindicated (e.g., drug interactions, medical comorbidity). Escalate or hospitalize when scenario warrants.`,
  evidenceFraming: `Frame evidence using DSM-5-TR, ANCC PMHNP outline, and psychopharmacology/guideline sources (e.g., APA, VA/DoD). primary_reference: ancc_pmhnp_outline, dsm5tr. guideline_reference for APA or SAMHSA when applicable. evidence_tier: 1 test plan, 2 Stahl/Kaplan-Sadock, 3 guidelines.`,
};

const TRACK_TO_PROFILE: Record<ExamTrack, BoardProfile> = {
  rn: NCLEX_RN_PROFILE,
  lvn: NCLEX_LVN_PROFILE,
  fnp: FNP_BOARD_PROFILE,
  pmhnp: PMHNP_BOARD_PROFILE,
};

/** Get the board profile for an exam track */
export function getBoardProfile(track: ExamTrack): BoardProfile {
  return TRACK_TO_PROFILE[track];
}

/** Build the combined board-profile block for prompt composition (item style, setting, cognitive level, rationale, distractor, safety, evidence) */
export function buildBoardProfilePromptBlock(profile: BoardProfile): string {
  const allowedTypesList = profile.allowedQuestionTypes.join(", ").replace(/_/g, " ");
  return `BOARD PROFILE: ${profile.name} (${profile.id})

Item-writing style: ${profile.itemWritingStyle}

Preferred clinical setting: ${profile.preferredClinicalSetting}

Cognitive level emphasis: ${profile.cognitiveLevelEmphasis}

Allowed question types for this board: ${allowedTypesList}. Generate the requested item type; when in doubt, prefer types listed first.

Rationale style: ${profile.rationaleStyle}

Distractor style: ${profile.distractorStyle}

Safety constraints: ${profile.safetyConstraints}

Evidence framing: ${profile.evidenceFraming}`;
}

/** Get allowed question types for the board (for validation or UI) */
export function getAllowedQuestionTypes(track: ExamTrack): QuestionItemType[] {
  return getBoardProfile(track).allowedQuestionTypes;
}
