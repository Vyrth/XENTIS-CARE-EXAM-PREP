/**
 * Mock readiness data - for development and seeded examples
 */

import type { ReadinessInputs } from "@/types/readiness";
import type { MasteryRollup } from "@/types/readiness";
import type { RawPerformanceRecord } from "@/lib/readiness/mastery-rollups";
import type { DailyPerformance } from "@/lib/readiness/trend-aggregation";
import type { SystemProgress } from "@/lib/readiness/system-completion";
import type { ContentItem } from "@/lib/readiness/content-queue";
import type { QuestionCandidate } from "@/lib/readiness/adaptive-queue";

/** Example readiness inputs - produces ~72% readiness */
export const MOCK_READINESS_INPUTS: ReadinessInputs = {
  questionAccuracy: 68,
  domainPerformance: 70,
  systemPerformance: 72,
  skillPerformance: 65,
  systemExamPerformance: 75,
  prePracticeExamPerformance: 70,
  studyGuideCompletion: 40,
  videoCompletion: 30,
  confidenceCalibration: 65,
  consistencyOverTime: 80,
};

/** Raw performance by system for mastery rollups */
export const MOCK_RAW_SYSTEM_PERFORMANCE: RawPerformanceRecord[] = [
  { entityId: "sys-1", entityName: "Cardiovascular", correct: 28, total: 45 },
  { entityId: "sys-2", entityName: "Respiratory", correct: 25, total: 32 },
  { entityId: "sys-3", entityName: "Renal", correct: 15, total: 28 },
  { entityId: "sys-4", entityName: "Psychiatric", correct: 33, total: 40 },
];

/** Raw performance by domain */
export const MOCK_RAW_DOMAIN_PERFORMANCE: RawPerformanceRecord[] = [
  { entityId: "dom-1", entityName: "Safe and Effective Care", correct: 68, total: 100 },
  { entityId: "dom-2", entityName: "Health Promotion", correct: 52, total: 72 },
  { entityId: "dom-3", entityName: "Psychosocial Integrity", correct: 30, total: 40 },
];

/** Raw performance by skill */
export const MOCK_RAW_SKILL_PERFORMANCE: RawPerformanceRecord[] = [
  { entityId: "skill-1", entityName: "Assessment", correct: 45, total: 60 },
  { entityId: "skill-2", entityName: "Pharmacology", correct: 22, total: 40 },
  { entityId: "skill-3", entityName: "Prioritization", correct: 35, total: 45 },
];

/** Raw performance by item type */
export const MOCK_RAW_ITEM_TYPE_PERFORMANCE: RawPerformanceRecord[] = [
  { entityId: "single", entityName: "Single Best Answer", correct: 80, total: 100 },
  { entityId: "multiple", entityName: "Multiple Response", correct: 18, total: 35 },
  { entityId: "dosage", entityName: "Dosage Calculation", correct: 8, total: 15 },
];

/** Daily performance for trend aggregation */
export const MOCK_DAILY_PERFORMANCE: DailyPerformance[] = [
  { date: "2025-03-01", correct: 8, total: 12, percent: 66.7 },
  { date: "2025-03-02", correct: 10, total: 15, percent: 66.7 },
  { date: "2025-03-03", correct: 12, total: 18, percent: 66.7 },
  { date: "2025-03-04", correct: 14, total: 20, percent: 70 },
  { date: "2025-03-05", correct: 16, total: 22, percent: 72.7 },
  { date: "2025-03-06", correct: 18, total: 25, percent: 72 },
];

/** System progress for unlock logic */
export const MOCK_SYSTEM_PROGRESS: SystemProgress[] = [
  { systemId: "sys-1", questionsAnswered: 45, lastPracticeDate: "2025-03-06" },
  { systemId: "sys-2", questionsAnswered: 32, lastPracticeDate: "2025-03-05" },
  { systemId: "sys-3", questionsAnswered: 28, lastPracticeDate: "2025-03-04" },
  { systemId: "sys-4", questionsAnswered: 40, lastPracticeDate: "2025-03-06" },
];

/** Content items for recommended content queue */
export const MOCK_CONTENT_ITEMS: ContentItem[] = [
  { id: "sg-1", type: "study_guide", title: "Cardiovascular System", systemId: "sys-1", progress: 60 },
  { id: "sg-2", type: "study_guide", title: "Respiratory System", systemId: "sys-2", progress: 40 },
  { id: "sg-3", type: "study_guide", title: "Renal System", systemId: "sys-3", progress: 20 },
  { id: "v-1", type: "video", title: "Heart Failure Pathophysiology", systemId: "sys-1", progress: 100 },
  { id: "v-2", type: "video", title: "COPD Management", systemId: "sys-2", progress: 0 },
];

/** Question candidates for adaptive queue (simplified) */
export const MOCK_QUESTION_CANDIDATES: QuestionCandidate[] = [
  { id: "q-1", systemId: "sys-1", domainId: "dom-1", itemType: "single_best_answer" },
  { id: "q-2", systemId: "sys-1", domainId: "dom-1", itemType: "multiple_response" },
  { id: "q-3", systemId: "sys-2", domainId: "dom-1", itemType: "single_best_answer" },
  { id: "q-4", systemId: "sys-3", domainId: "dom-1", itemType: "dosage_calc" },
  { id: "q-5", systemId: "sys-1", domainId: "dom-2", itemType: "single_best_answer" },
];
