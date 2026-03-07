/**
 * Readiness engine types - aligned with analytics schema
 */

export type ReadinessBand = "not_ready" | "developing" | "ready" | "exam_ready";

export interface MasteryRollup {
  id: string;
  type: "topic" | "subtopic" | "system" | "domain" | "skill" | "item_type";
  name: string;
  correct: number;
  total: number;
  percent: number;
  targetPercent: number;
  atTarget: boolean;
}

export interface TrendDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface ConfidenceBucket {
  range: string;
  correct: number;
  total: number;
  actualPercent: number;
  expectedMidpoint: number;
  calibrated: boolean;
}

export interface ReadinessInputs {
  questionAccuracy: number;
  domainPerformance: number;
  systemPerformance: number;
  skillPerformance: number;
  systemExamPerformance: number;
  prePracticeExamPerformance: number;
  studyGuideCompletion: number;
  videoCompletion: number;
  confidenceCalibration: number;
  consistencyOverTime: number;
}

export interface RemediationItem {
  id: string;
  type: "system" | "domain" | "skill" | "item_type" | "topic" | "subtopic";
  entityId: string;
  name: string;
  currentPercent: number;
  targetPercent: number;
  gap: number;
  suggestedActions: string[];
  estimatedQuestions: number;
}
