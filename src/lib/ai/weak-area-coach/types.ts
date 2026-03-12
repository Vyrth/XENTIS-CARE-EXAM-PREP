/**
 * Weak Area Coach types - request/response for /api/ai/weak-area-coach
 */

export type ExamTrack = "lvn" | "rn" | "fnp" | "pmhnp";

export type CoachingMode =
  | "explain_weakness"
  | "remediation_plan"
  | "teach_from_zero"
  | "exam_readiness"
  | "mnemonic"
  | "follow_up_questions";

export interface WeakAreaInput {
  name: string;
  percent: number;
  targetPercent: number;
  correct: number;
  total: number;
  type?: string;
}

export interface WeakAreaCoachRequest {
  userId: string;
  examTrack: ExamTrack;
  weakSystems?: WeakAreaInput[];
  weakDomains?: WeakAreaInput[];
  weakSkills?: WeakAreaInput[];
  weakItemTypes?: WeakAreaInput[];
  readinessBand?: string;
  recentMistakes?: string[];
  currentStudyPlan?: string;
  coachingMode?: CoachingMode;
}

export interface WeakAreaCoachResponse {
  summaryOfWeakAreas: string;
  likelyCausesOfMistakes: string;
  whatLearnerProbablyConfusing: string;
  recommendedContentToReview: string;
  recommendedQuestionVolume: string;
  suggestedNextStep: string;
  mnemonicSuggestion?: string;
  /** When coachingMode is follow_up_questions: 5 sample question stems or practice prompts */
  followUpQuestions?: string[];
}

/** Structured output for Weak Area Center, dashboard widgets, user_remediation_plans */
export interface WeakAreaCoachStructuredOutput {
  summaryOfWeakAreas: string;
  likelyCausesOfMistakes: string;
  whatLearnerProbablyConfusing: string;
  recommendedContentToReview: string;
  recommendedQuestionVolume: string;
  suggestedNextStep: string;
  mnemonicSuggestion?: string;
  /** For user_remediation_plans.plan_data */
  remediationPlanData?: {
    focusAreas: { name: string; type: string; entityId: string; gap: number }[];
    suggestedQuestionCount: number;
    suggestedSections?: string[];
  };
}
