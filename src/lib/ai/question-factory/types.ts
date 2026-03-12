/**
 * Question Factory - typed output schema for board-style question generation.
 * Maps to questions and question_options tables.
 */

export type ExamTrack = "lvn" | "rn" | "fnp" | "pmhnp";

export type QuestionItemType =
  | "single_best_answer"
  | "multiple_response"
  | "select_n"
  | "image_based"
  | "chart_table_exhibit"
  | "ordered_response"
  | "hotspot"
  | "case_study"
  | "dosage_calc";

export interface QuestionOptionPayload {
  key: string;
  text: string;
  isCorrect: boolean;
  distractorRationale?: string;
  /** For ordered_response: correct position 1-based */
  correctOrder?: number;
  /** For hotspot: placeholder coords { "x": 0.5, "y": 0.3, "radius": 0.05 } */
  coords?: { x: number; y: number; radius?: number };
}

export interface QuestionPayload {
  stem: string;
  leadIn?: string;
  instructions?: string;
  itemType: QuestionItemType;
  options: QuestionOptionPayload[];
  rationale: string;
  /** High-yield takeaway (Jade Tutor) */
  teachingPoint?: string;
  /** Why this topic is tested on boards (Jade Tutor) */
  boardRelevance?: string;
  /** Optional mnemonic (e.g., MONA for MI = Morphine, Oxygen, Nitroglycerin, Aspirin) */
  mnemonic?: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  domain?: string;
  system?: string;
  topic?: string;
  learningObjective?: string;
  tags?: string[];
  /** For select_n: how many to select (e.g., 2) */
  selectN?: number;
  /** For image_based/chart_table_exhibit: placeholder hint */
  exhibitPlaceholder?: string;
  /** For dosage_calc: medication/concentration context */
  dosageContext?: string;
  /** Evidence source governance: primary reference slug (approved_evidence_sources) */
  primaryReference?: string;
  /** Evidence source governance: guideline reference slug (optional) */
  guidelineReference?: string;
  /** Evidence tier 1-3 (1=test plan, 2=textbook, 3=guideline) */
  evidenceTier?: 1 | 2 | 3;
}

/** Database-ready question row (before insert) */
export interface QuestionRow {
  exam_track_id: string;
  question_type_id: string;
  domain_id: string | null;
  system_id: string | null;
  topic_id: string | null;
  stem: string;
  stem_metadata: Record<string, unknown>;
  status: "draft" | "editor_review";
  difficulty_tier: number | null;
}

/** Database-ready question_option row */
export interface QuestionOptionRow {
  question_id: string;
  option_key: string;
  option_text: string | null;
  is_correct: boolean;
  option_metadata: Record<string, unknown>;
  display_order: number;
}
