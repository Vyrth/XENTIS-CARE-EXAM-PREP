/**
 * Adaptive exam engine - CAT question selection orchestration.
 * Loads session, config, candidates; applies blueprint + exposure + theta ranking.
 */

import { createServiceClient } from "@/lib/supabase/service";
import {
  rankCandidatesForAdaptive,
  type CandidateForRanking,
} from "./selection";
import {
  shouldStopAdaptiveExam,
  updateThetaEstimate,
  computeReadinessFromTheta,
  type ThetaUpdateInput,
  type StopRuleInput,
  type ReadinessInput,
} from "./scoring";
import type { BlueprintProgressRow, BlueprintTarget } from "./blueprint";
import { isBlueprintSatisfied } from "./blueprint";

export interface AdaptiveSession {
  id: string;
  userId: string;
  examTrackId: string;
  adaptiveExamConfigId: string;
  status: string;
  thetaEstimate: number;
  standardError: number;
  questionCount: number;
  correctCount: number;
  incorrectCount: number;
}

export interface AdaptiveConfig {
  id: string;
  examTrackId: string;
  minQuestions: number;
  maxQuestions: number;
  targetStandardError: number;
  passingTheta: number;
}

export interface NextQuestionResult {
  questionId: string;
  question: {
    id: string;
    stem: string;
    stemMetadata: Record<string, unknown>;
    domainId: string | null;
    systemId: string | null;
    topicId: string | null;
    questionTypeId: string;
  };
  servedOrder: number;
  difficultyB: number;
  shouldStop: boolean;
  stopReason: string | null;
}

export interface GetNextAdaptiveQuestionParams {
  sessionId: string;
  userId: string;
}

/**
 * Load adaptive session and verify ownership.
 */
async function loadSession(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  sessionId: string,
  userId: string
): Promise<AdaptiveSession | null> {
  const { data, error } = await supabase
    .from("adaptive_exam_sessions")
    .select("id, user_id, exam_track_id, adaptive_exam_config_id, status, theta_estimate, standard_error, question_count, correct_count, incorrect_count")
    .eq("id", sessionId)
    .single();

  if (error || !data) return null;
  if (data.user_id !== userId) return null;

  return {
    id: data.id,
    userId: data.user_id,
    examTrackId: data.exam_track_id,
    adaptiveExamConfigId: data.adaptive_exam_config_id,
    status: data.status,
    thetaEstimate: Number(data.theta_estimate ?? 0),
    standardError: Number(data.standard_error ?? 9.99),
    questionCount: data.question_count ?? 0,
    correctCount: data.correct_count ?? 0,
    incorrectCount: data.incorrect_count ?? 0,
  };
}

/**
 * Load adaptive config for session.
 */
async function loadConfig(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  configId: string
): Promise<AdaptiveConfig | null> {
  const { data, error } = await supabase
    .from("adaptive_exam_configs")
    .select("id, exam_track_id, min_questions, max_questions, target_standard_error, passing_theta")
    .eq("id", configId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    examTrackId: data.exam_track_id,
    minQuestions: data.min_questions ?? 75,
    maxQuestions: data.max_questions ?? 150,
    targetStandardError: Number(data.target_standard_error ?? 0.3),
    passingTheta: Number(data.passing_theta ?? 0),
  };
}

/**
 * Load already-served question IDs for session.
 */
async function loadServedIds(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  sessionId: string
): Promise<Set<string>> {
  const { data } = await supabase
    .from("adaptive_exam_items")
    .select("question_id")
    .eq("adaptive_exam_session_id", sessionId);

  return new Set((data ?? []).map((r) => r.question_id));
}

/**
 * Load blueprint progress for session.
 */
async function loadBlueprintProgress(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  sessionId: string
): Promise<BlueprintProgressRow[]> {
  const { data } = await supabase
    .from("adaptive_exam_blueprint_progress")
    .select("domain_id, system_id, topic_id, served_count, correct_count, target_min, target_max")
    .eq("adaptive_exam_session_id", sessionId);

  return (data ?? []).map((r) => ({
    domainId: r.domain_id,
    systemId: r.system_id,
    topicId: r.topic_id,
    servedCount: r.served_count ?? 0,
    correctCount: r.correct_count ?? 0,
    targetMin: r.target_min,
    targetMax: r.target_max,
  }));
}

/**
 * Load blueprint targets from exam_blueprints for track.
 */
async function loadBlueprintTargets(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  examTrackId: string
): Promise<BlueprintTarget[]> {
  const { data } = await supabase
    .from("exam_blueprints")
    .select("domain_id, system_id, weight_pct, question_count")
    .eq("exam_track_id", examTrackId)
    .limit(100);

  return (data ?? []).map((r) => ({
    domainId: r.domain_id,
    systemId: r.system_id,
    weightPct: r.weight_pct ?? 0,
    questionCount: r.question_count,
  }));
}

/**
 * Load candidate questions with calibration.
 * Excludes served, inactive/unpublished. Prefers calibrated.
 */
async function loadCandidates(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  examTrackId: string,
  servedIds: Set<string>,
  limit: number
): Promise<CandidateForRanking[]> {
  const { data: rawQuestions } = await supabase
    .from("questions")
    .select("id, domain_id, system_id, topic_id, question_type_id")
    .eq("exam_track_id", examTrackId)
    .in("status", ["approved", "published"])
    .limit(limit * 3);

  const questions = (rawQuestions ?? [])
    .filter((q) => !servedIds.has(q.id))
    .slice(0, limit);

  if (questions.length === 0) return [];

  const ids = questions.map((q) => q.id);

  const { data: calibrations } = await supabase
    .from("question_calibration")
    .select("question_id, difficulty_b, exposure_count")
    .in("question_id", ids);

  const calMap = new Map(
    (calibrations ?? []).map((c) => [
      c.question_id,
      { difficultyB: Number(c.difficulty_b ?? 0), exposureCount: c.exposure_count ?? 0 },
    ])
  );

  return questions.map((q) => {
    const cal = calMap.get(q.id);
    return {
      questionId: q.id,
      difficultyB: cal?.difficultyB ?? 0,
      hasCalibration: !!cal,
      exposureCount: cal?.exposureCount ?? 0,
      domainId: q.domain_id,
      systemId: q.system_id,
      topicId: q.topic_id,
    };
  });
}

/**
 * Get the next adaptive question for a session.
 * Returns null if session invalid, completed, or no candidates.
 */
export async function getNextAdaptiveQuestion(
  params: GetNextAdaptiveQuestionParams
): Promise<NextQuestionResult | null> {
  const { sessionId, userId } = params;
  const supabase = createServiceClient();

  const session = await loadSession(supabase, sessionId, userId);
  if (!session) return null;
  if (session.status !== "in_progress") return null;

  const config = await loadConfig(supabase, session.adaptiveExamConfigId);
  if (!config) return null;
  if (config.examTrackId !== session.examTrackId) return null;

  const servedIds = await loadServedIds(supabase, sessionId);
  const blueprintProgress = await loadBlueprintProgress(supabase, sessionId);
  const blueprintTargets = await loadBlueprintTargets(supabase, session.examTrackId);

  const blueprintSatisfied = isBlueprintSatisfied(
    blueprintProgress,
    blueprintTargets,
    session.questionCount
  );

  const stopResult = shouldStopAdaptiveExam({
    questionCount: session.questionCount,
    minQuestions: config.minQuestions,
    maxQuestions: config.maxQuestions,
    standardError: session.standardError,
    targetStandardError: config.targetStandardError,
    blueprintSatisfied,
  });

  if (stopResult.shouldStop) {
    return null;
  }

  const candidates = await loadCandidates(
    supabase,
    session.examTrackId,
    servedIds,
    500
  );

  if (candidates.length === 0) return null;

  const ranked = rankCandidatesForAdaptive(candidates, {
    thetaEstimate: session.thetaEstimate,
    blueprintProgress,
    blueprintTargets,
    totalServed: session.questionCount,
  });

  const chosen = ranked[0];
  if (!chosen) return null;

  const { data: question } = await supabase
    .from("questions")
    .select("id, stem, stem_metadata, domain_id, system_id, topic_id, question_type_id")
    .eq("id", chosen.questionId)
    .single();

  if (!question) return null;

  return {
    questionId: chosen.questionId,
    question: {
      id: question.id,
      stem: question.stem,
      stemMetadata: (question.stem_metadata as Record<string, unknown>) ?? {},
      domainId: question.domain_id,
      systemId: question.system_id,
      topicId: question.topic_id,
      questionTypeId: question.question_type_id,
    },
    servedOrder: session.questionCount + 1,
    difficultyB: chosen.difficultyB,
    shouldStop: false,
    stopReason: null,
  };
}

// -----------------------------------------------------------------------------
// Re-exported for use by API/actions
// -----------------------------------------------------------------------------

export {
  updateThetaEstimate,
  shouldStopAdaptiveExam,
  computeReadinessFromTheta,
  getConfidenceBand,
  probabilityCorrect2PL,
} from "./scoring";

export type { ThetaUpdateInput, ThetaUpdateResult, StopRuleInput, StopRuleResult, ReadinessInput, ReadinessResult, ConfidenceBand } from "./scoring";

export { rankCandidatesForAdaptive, thetaProximityScore, exposurePenaltyScore } from "./selection";
export type { CandidateForRanking, RankedCandidate, RankingContext } from "./selection";

export { computeBlueprintBoost, isBlueprintSatisfied } from "./blueprint";
export type { BlueprintProgressRow, BlueprintTarget, CandidateTaxonomy } from "./blueprint";
