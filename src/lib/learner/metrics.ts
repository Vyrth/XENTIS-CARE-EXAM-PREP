/**
 * Central Learner Metrics Service
 *
 * Single source of truth for learner-facing metrics.
 * All values are DB-driven; zero-state when no real data exists.
 * No hardcoded baselines, fake defaults, or optimistic numbers.
 */

import {
  loadDashboardStats,
  loadMasteryData,
  loadReadinessScore,
  loadPerformanceTrends,
  loadStudyWorkflowRecommendations,
  loadHighYieldTopics,
  loadLastPrePracticeDate,
} from "@/lib/dashboard/loaders";
import { countTotalQuestionsAnswered } from "@/lib/analytics/loaders";
import { loadConfidenceData } from "@/lib/analytics/loaders";
import { buildConfidenceBuckets, computeCalibrationScore } from "@/lib/readiness/confidence-calibration";
import type { TrackSlug } from "@/data/mock/types";
import type { MasteryLoadResult } from "@/lib/dashboard/loaders";
import type { ContinueLearningCard } from "@/lib/dashboard/loaders";
import type { PerformanceTrendPoint } from "@/lib/dashboard/loaders";
import type { HighYieldTopic } from "@/types/high-yield";

export interface LearnerMetrics {
  /** Questions answered today */
  questionsToday: number;
  /** Questions answered yesterday */
  questionsYesterday: number;
  /** Study minutes today (from user_streaks or derived) */
  studyMinutesToday: number;
  /** User's daily study goal (from profile; 0 when not set) */
  studyMinutesGoal: number;
  /** Current streak in days; 0 when no activity */
  streakDays: number;
  /** Readiness score 0-100; 0 when no data */
  readinessScore: number;
  /** Whether readiness came from snapshot vs computed */
  readinessFromSnapshot: boolean;
  /** Total questions answered (all time) */
  totalQuestionsAnswered: number;
  /** Whether user has any activity */
  hasActivity: boolean;
  /** Mastery data */
  mastery: MasteryLoadResult;
  /** Performance trend points (last N days) */
  performanceTrends: PerformanceTrendPoint[];
  /** Continue learning / recommendations */
  continueLearningCards: ContinueLearningCard[];
  /** High-yield topics */
  highYieldTopics: HighYieldTopic[];
  /** Last pre-practice exam date (YYYY-MM-DD) or null */
  lastPrePracticeDate: string | null;
  /** Confidence calibration score 0-100; 0 when no data */
  confidenceCalibrationScore: number;
  /** Whether confidence data exists */
  hasConfidenceData: boolean;
}

/**
 * Load all learner metrics for a user + track.
 * Zero-state: readiness=0, streak=0, studyMinutesToday=0, etc. when no data.
 */
export async function loadLearnerMetrics(
  userId: string | null,
  trackId: string | null,
  trackSlug: TrackSlug,
  options?: {
    studyMinutesGoal?: number;
    trendDays?: number;
    highYieldLimit?: number;
  }
): Promise<LearnerMetrics> {
  const studyMinutesGoal = options?.studyMinutesGoal ?? 0;
  const trendDays = options?.trendDays ?? 7;
  const highYieldLimit = options?.highYieldLimit ?? 10;

  const [
    stats,
    mastery,
    trends,
    continueLearningCards,
    highYieldTopics,
    lastPrePracticeDate,
    confidenceRaw,
  ] = await Promise.all([
    loadDashboardStats(userId, trackId, studyMinutesGoal),
    loadMasteryData(userId, trackId),
    loadPerformanceTrends(userId, trackId, trendDays),
    loadStudyWorkflowRecommendations(userId, trackId, trackSlug),
    loadHighYieldTopics(trackId, trackSlug, highYieldLimit),
    loadLastPrePracticeDate(userId, trackId),
    loadConfidenceData(userId, trackId),
  ]);

  const readinessWithMastery = await loadReadinessScore(userId, trackId, mastery);
  const totalQuestionsAnswered = countTotalQuestionsAnswered(mastery);

  const hasActivity =
    mastery.systems.some((r) => r.total > 0) ||
    mastery.domains.some((r) => r.total > 0) ||
    mastery.skills.some((r) => r.total > 0) ||
    mastery.itemTypes.some((r) => r.total > 0);

  const confidenceBuckets = buildConfidenceBuckets(confidenceRaw);
  const totalConfidenceQuestions = confidenceBuckets.reduce((s, b) => s + b.total, 0);
  const confidenceCalibrationScore = totalConfidenceQuestions > 0 ? computeCalibrationScore(confidenceBuckets) : 0;
  const hasConfidenceData = totalConfidenceQuestions > 0;

  return {
    questionsToday: stats.questionsToday,
    questionsYesterday: stats.questionsYesterday,
    studyMinutesToday: stats.studyMinutesToday,
    studyMinutesGoal: stats.studyMinutesGoal,
    streakDays: stats.streakDays,
    readinessScore: readinessWithMastery.score,
    readinessFromSnapshot: readinessWithMastery.fromSnapshot,
    totalQuestionsAnswered,
    hasActivity,
    mastery,
    performanceTrends: trends,
    continueLearningCards,
    highYieldTopics,
    lastPrePracticeDate,
    confidenceCalibrationScore,
    hasConfidenceData,
  };
}

