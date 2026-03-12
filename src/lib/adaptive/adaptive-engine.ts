/**
 * Adaptive Exam Engine - Main Service Orchestrator
 *
 * Orchestrates: getNextAdaptiveQuestion, submitAdaptiveAnswer,
 * updateBlueprintProgress, question_calibration exposure update.
 * Uses adaptive-selection, adaptive-scoring, adaptive-session.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";
import {
  rankCandidatesForAdaptive,
  type CandidateForRanking,
  type BlueprintProgressRow,
  type BlueprintTarget,
  isBlueprintSatisfied,
} from "./adaptive-selection";
import {
  updateThetaEstimate,
  shouldStopAdaptiveExam,
  computeReadinessFromTheta,
  type ThetaUpdateInput,
  type StopRuleInput,
} from "./adaptive-scoring";
import { completeAdaptiveExamSession } from "./adaptive-session";
import {
  getCorrectAnswerForQuestion,
  scoreAdaptiveResponse,
} from "./api-helpers";
import type { ExamResponse } from "@/types/exam";
import { LEARNER_VISIBLE_STATUSES } from "@/config/content";

export interface GetNextAdaptiveQuestionParams {
  sessionId: string;
  userId: string;
}

export interface GetNextAdaptiveQuestionResult {
  questionId: string;
  itemId: string;
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

export interface SubmitAdaptiveAnswerParams {
  sessionId: string;
  itemId: string;
  userId: string;
  answerPayload: ExamResponse;
  timeSpentSeconds?: number | null;
}

export interface SubmitAdaptiveAnswerResult {
  success: boolean;
  correct?: boolean;
  theta?: number;
  standardError?: number;
  readinessScore?: number;
  confidenceBand?: string;
  stop?: boolean;
  stopReason?: string | null;
  error?: string;
}

/**
 * Get next adaptive question, create item, update session, update calibration.
 * Returns null if session invalid, completed, or no candidates.
 */
export async function getNextAdaptiveQuestion(
  params: GetNextAdaptiveQuestionParams
): Promise<GetNextAdaptiveQuestionResult | null> {
  if (!isSupabaseServiceRoleConfigured()) return null;

  const { sessionId, userId } = params;
  const supabase = createServiceClient();

  const session = await loadSession(supabase, sessionId, userId);
  if (!session || session.status !== "in_progress") return null;

  const config = await loadConfig(supabase, session.adaptiveExamConfigId);
  if (!config || config.examTrackId !== session.examTrackId) return null;

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

  if (stopResult.shouldStop) return null;

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

  const servedOrder = session.questionCount + 1;

  const { data: item, error: itemErr } = await supabase
    .from("adaptive_exam_items")
    .insert({
      adaptive_exam_session_id: sessionId,
      question_id: chosen.questionId,
      served_order: servedOrder,
      domain_id: question.domain_id,
      system_id: question.system_id,
      topic_id: question.topic_id,
      difficulty_b: chosen.difficultyB,
    })
    .select("id")
    .single();

  if (itemErr || !item) return null;

  await supabase
    .from("adaptive_exam_sessions")
    .update({ question_count: servedOrder })
    .eq("id", sessionId)
    .eq("user_id", userId);

  await updateQuestionCalibrationOnServe(supabase, chosen.questionId);

  return {
    questionId: chosen.questionId,
    itemId: item.id,
    question: {
      id: question.id,
      stem: question.stem ?? "",
      stemMetadata: (question.stem_metadata as Record<string, unknown>) ?? {},
      domainId: question.domain_id,
      systemId: question.system_id,
      topicId: question.topic_id,
      questionTypeId: question.question_type_id,
    },
    servedOrder,
    difficultyB: chosen.difficultyB,
    shouldStop: false,
    stopReason: null,
  };
}

/**
 * Submit answer for an adaptive item. Updates theta, SE, blueprint, session.
 * Completes session when stop rules are met.
 */
export async function submitAdaptiveAnswer(
  params: SubmitAdaptiveAnswerParams
): Promise<SubmitAdaptiveAnswerResult> {
  if (!isSupabaseServiceRoleConfigured()) {
    return { success: false, error: "Supabase not configured" };
  }

  const { sessionId, itemId, userId, answerPayload, timeSpentSeconds } = params;
  const supabase = createServiceClient();

  const session = await loadSession(supabase, sessionId, userId);
  if (!session) return { success: false, error: "Session not found" };
  if (session.status !== "in_progress") return { success: false, error: "Session not in progress" };

  const { data: item, error: itemError } = await supabase
    .from("adaptive_exam_items")
    .select("id, question_id, domain_id, system_id, topic_id, difficulty_b, is_correct")
    .eq("id", itemId)
    .eq("adaptive_exam_session_id", sessionId)
    .single();

  if (itemError || !item) return { success: false, error: "Item not found" };
  if (item.is_correct != null) return { success: false, error: "Item already answered" };

  const { correctAnswer, itemType } = await getCorrectAnswerForQuestion(item.question_id);
  const isCorrect = scoreAdaptiveResponse(answerPayload, correctAnswer, itemType);

  const { data: cal } = await supabase
    .from("question_calibration")
    .select("difficulty_b, discrimination_a, guessing_c")
    .eq("question_id", item.question_id)
    .single();

  const difficultyB = cal ? Number(cal.difficulty_b ?? 0) : Number(item.difficulty_b ?? 0);
  const discriminationA = cal ? Number(cal.discrimination_a ?? 1) : 1;
  const guessingC = cal ? Number(cal.guessing_c ?? 0) : 0;

  const config = await loadConfig(supabase, session.adaptiveExamConfigId);
  if (!config) return { success: false, error: "Config not found" };

  const thetaInput: ThetaUpdateInput = {
    currentTheta: session.thetaEstimate,
    currentSE: session.standardError,
    isCorrect,
    difficultyB,
    discriminationA,
    guessingC,
  };

  const { theta, standardError } = updateThetaEstimate(thetaInput);

  const blueprintProgress = await loadBlueprintProgress(supabase, sessionId);
  const blueprintTargets = await loadBlueprintTargets(supabase, session.examTrackId);

  const questionCount = session.questionCount;
  const correctCount = session.correctCount + (isCorrect ? 1 : 0);
  const incorrectCount = session.incorrectCount + (isCorrect ? 0 : 1);

  const blueprintSatisfied = isBlueprintSatisfied(
    blueprintProgress,
    blueprintTargets,
    questionCount
  );

  const stopResult = shouldStopAdaptiveExam({
    questionCount,
    minQuestions: config.minQuestions,
    maxQuestions: config.maxQuestions,
    standardError,
    targetStandardError: config.targetStandardError,
    blueprintSatisfied,
  });

  await supabase
    .from("adaptive_exam_items")
    .update({
      user_answer: answerPayload,
      is_correct: isCorrect,
      time_spent_seconds: timeSpentSeconds ?? null,
      theta_before: session.thetaEstimate,
      theta_after: theta,
      standard_error_before: session.standardError,
      standard_error_after: standardError,
    })
    .eq("id", itemId)
    .eq("adaptive_exam_session_id", sessionId);

  const readiness = computeReadinessFromTheta({
    theta,
    standardError,
    passingTheta: config.passingTheta,
  });

  await supabase
    .from("adaptive_exam_sessions")
    .update({
      theta_estimate: theta,
      standard_error: standardError,
      correct_count: correctCount,
      incorrect_count: incorrectCount,
      ...(stopResult.shouldStop
        ? {
            status: "completed",
            completed_at: new Date().toISOString(),
            stop_reason: stopResult.reason,
            readiness_score: readiness.score,
            confidence_band: readiness.band,
            result: { theta, standardError, correctCount, incorrectCount },
          }
        : {}),
    })
    .eq("id", sessionId)
    .eq("user_id", userId);

  await updateBlueprintProgress(supabase, sessionId, {
    domainId: item.domain_id,
    systemId: item.system_id,
    topicId: item.topic_id,
  }, isCorrect);

  return {
    success: true,
    correct: isCorrect,
    theta,
    standardError,
    readinessScore: readiness.score,
    confidenceBand: readiness.band,
    stop: stopResult.shouldStop,
    stopReason: stopResult.reason ?? null,
  };
}

/**
 * Update blueprint progress for domain/system/topic after an item is answered.
 */
export async function updateBlueprintProgress(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  sessionId: string,
  taxonomy: { domainId: string | null; systemId: string | null; topicId: string | null },
  isCorrect: boolean
): Promise<void> {
  const keys = [
    { domain_id: taxonomy.domainId, system_id: null, topic_id: null },
    { domain_id: null, system_id: taxonomy.systemId, topic_id: null },
    { domain_id: null, system_id: null, topic_id: taxonomy.topicId },
  ].filter((k) => k.domain_id || k.system_id || k.topic_id);

  for (const key of keys) {
    const { data: rows } = await supabase
      .from("adaptive_exam_blueprint_progress")
      .select("id, served_count, correct_count")
      .eq("adaptive_exam_session_id", sessionId)
      .eq("domain_id", key.domain_id)
      .eq("system_id", key.system_id)
      .eq("topic_id", key.topic_id)
      .limit(1);

    const existing = rows?.[0] ?? null;

    if (existing) {
      await supabase
        .from("adaptive_exam_blueprint_progress")
        .update({
          served_count: (existing.served_count ?? 0) + 1,
          correct_count: (existing.correct_count ?? 0) + (isCorrect ? 1 : 0),
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("adaptive_exam_blueprint_progress").insert({
        adaptive_exam_session_id: sessionId,
        domain_id: key.domain_id,
        system_id: key.system_id,
        topic_id: key.topic_id,
        served_count: 1,
        correct_count: isCorrect ? 1 : 0,
      });
    }
  }
}

/**
 * Update question_calibration exposure_count and last_served_at when a question is served.
 */
async function updateQuestionCalibrationOnServe(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  questionId: string
): Promise<void> {
  const { data: cal } = await supabase
    .from("question_calibration")
    .select("id, exposure_count")
    .eq("question_id", questionId)
    .single();

  if (cal) {
    await supabase
      .from("question_calibration")
      .update({
        exposure_count: (cal.exposure_count ?? 0) + 1,
        last_served_at: new Date().toISOString(),
      })
      .eq("question_id", questionId);
  } else {
    await supabase.from("question_calibration").insert({
      question_id: questionId,
      exposure_count: 1,
      last_served_at: new Date().toISOString(),
      calibration_source: "adaptive_exam_serve",
    });
  }
}

// -----------------------------------------------------------------------------
// Loaders (internal)
// -----------------------------------------------------------------------------

interface SessionData {
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

async function loadSession(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  sessionId: string,
  userId: string
): Promise<SessionData | null> {
  const { data, error } = await supabase
    .from("adaptive_exam_sessions")
    .select("id, user_id, exam_track_id, adaptive_exam_config_id, status, theta_estimate, standard_error, question_count, correct_count, incorrect_count")
    .eq("id", sessionId)
    .single();

  if (error || !data || data.user_id !== userId) return null;

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

async function loadConfig(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  configId: string
): Promise<{ examTrackId: string; minQuestions: number; maxQuestions: number; targetStandardError: number; passingTheta: number } | null> {
  const { data, error } = await supabase
    .from("adaptive_exam_configs")
    .select("exam_track_id, min_questions, max_questions, target_standard_error, passing_theta")
    .eq("id", configId)
    .single();

  if (error || !data) return null;

  return {
    examTrackId: data.exam_track_id,
    minQuestions: data.min_questions ?? 75,
    maxQuestions: data.max_questions ?? 150,
    targetStandardError: Number(data.target_standard_error ?? 0.3),
    passingTheta: Number(data.passing_theta ?? 0),
  };
}

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
    .in("status", [...LEARNER_VISIBLE_STATUSES])
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
