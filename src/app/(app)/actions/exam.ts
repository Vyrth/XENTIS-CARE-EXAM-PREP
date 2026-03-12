"use server";

/**
 * Exam server actions - persistence and scoring
 * Persists to exam_sessions and exam_session_questions.
 */

import type { ExamSession } from "@/types/exam";
import { computeScore, type ExamScoreResult } from "@/lib/exam/scoring";
import { loadQuestionMetadataForScoring, loadSystemNamesByIds, loadDomainNamesByIds } from "@/lib/questions/loaders";
import { getPrimaryTrack } from "@/lib/auth/track";
import { loadPrePracticeTemplate, loadSystemExamBySystemId } from "@/lib/exam/loaders";
import { createClient } from "@/lib/supabase/server";

function toSessionType(mode: string): string {
  if (mode === "pre_practice" || mode.startsWith("pre_practice_")) return "pre_practice";
  if (mode === "system") return "system_exam";
  return "practice";
}

export async function saveExamSession(
  session: ExamSession,
  scores?: Map<string, boolean>
): Promise<{ error: string | null }> {
  const primary = await getPrimaryTrack(session.userId);
  const trackId = primary?.trackId ?? null;
  if (!trackId) return { error: "No track selected" };

  const supabase = await createClient();

  let examTemplateId: string | null = null;
  let systemExamId: string | null = null;
  if (session.config.mode === "pre_practice" || session.config.mode.startsWith("pre_practice_")) {
    const t = await loadPrePracticeTemplate(trackId);
    examTemplateId = t?.id ?? null;
  } else if (session.config.mode === "system" && session.config.systemId) {
    const e = await loadSystemExamBySystemId(trackId, session.config.systemId);
    systemExamId = e?.id ?? null;
  }

  const scratchpadData: Record<string, unknown> = {
    clientExamId: session.config.id,
    seed: session.config.seed,
  };
  if (session.completedAt && scores) {
    const rawScore = Array.from(scores.values()).filter(Boolean).length;
    const total = session.questionIds.length;
    scratchpadData.results = {
      rawScore,
      maxScore: total,
      percentCorrect: total > 0 ? Math.round((rawScore / total) * 100) : 0,
      flaggedCount: session.flags.size,
    };
  }

  const row = {
    user_id: session.userId,
    exam_track_id: trackId,
    exam_template_id: examTemplateId,
    system_exam_id: systemExamId,
    session_type: toSessionType(session.config.mode),
    status: session.completedAt ? "completed" : "in_progress",
    started_at: session.startedAt,
    completed_at: session.completedAt ?? null,
    time_remaining_seconds: session.timeRemainingSeconds,
    scratchpad_data: scratchpadData,
  };

  const { data: existing } = await supabase
    .from("exam_sessions")
    .select("id")
    .eq("user_id", session.userId)
    .contains("scratchpad_data", { clientExamId: session.config.id })
    .maybeSingle();

  let sessionDbId: string;
  if (existing) {
    await supabase.from("exam_sessions").update(row).eq("id", existing.id);
    sessionDbId = existing.id;
    await supabase.from("exam_session_questions").delete().eq("exam_session_id", sessionDbId);
  } else {
    const { data: inserted, error: insertErr } = await supabase
      .from("exam_sessions")
      .insert(row)
      .select("id")
      .single();
    if (insertErr || !inserted) return { error: insertErr?.message ?? "Failed to save session" };
    sessionDbId = inserted.id;
  }

  const questions = session.questionIds.map((qId, i) => {
    const resp = session.responses[qId];
    const isFlagged = session.flags.has(qId);
    let responseData: Record<string, unknown> = {};
    if (resp) {
      if (resp.type === "single") responseData = { type: "single", value: resp.value };
      else if (resp.type === "multiple") responseData = { type: "multiple", value: resp.value };
      else if (resp.type === "ordered") responseData = { type: "ordered", value: resp.value };
      else if (resp.type === "numeric") responseData = { type: "numeric", value: resp.value };
      else if (resp.type === "dropdown") responseData = { type: "dropdown", value: resp.value };
      else if (resp.type === "hotspot") responseData = { type: "hotspot", value: resp.value };
      else if (resp.type === "highlight") responseData = { type: "highlight", value: resp.value };
      else if (resp.type === "matrix") responseData = { type: "matrix", value: resp.value };
      else responseData = resp as unknown as Record<string, unknown>;
    }
    const isCorrect = scores?.get(qId) ?? null;
    const timeSpent = session.timeSpentPerQuestion?.[qId] ?? null;
    return {
      exam_session_id: sessionDbId,
      question_id: qId,
      display_order: i,
      response_data: responseData,
      is_answered: !!resp,
      is_flagged: isFlagged,
      is_correct: isCorrect,
      time_spent_seconds: timeSpent,
    };
  });

  if (questions.length > 0) {
    const { error: qErr } = await supabase.from("exam_session_questions").insert(questions);
    if (qErr) return { error: qErr.message };
  }

  return { error: null };
}

export async function loadExamSession(
  sessionId: string,
  userId: string
): Promise<{ session: ExamSession | null; error: string | null }> {
  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("exam_sessions")
    .select("id, user_id, exam_track_id, exam_template_id, system_exam_id, session_type, status, started_at, completed_at, time_remaining_seconds, scratchpad_data")
    .eq("user_id", userId)
    .contains("scratchpad_data", { clientExamId: sessionId })
    .maybeSingle();

  if (error || !row) return { session: null, error: error?.message ?? null };

  const { data: qRows } = await supabase
    .from("exam_session_questions")
    .select("question_id, display_order, response_data, is_answered, is_flagged")
    .eq("exam_session_id", row.id)
    .order("display_order", { ascending: true });

  const questionIds = (qRows ?? []).map((r) => r.question_id);
  const responses: Record<string, ExamSession["responses"][string]> = {};
  const flags = new Set<string>();
  for (const r of qRows ?? []) {
    const rd = r.response_data as Record<string, unknown> | null;
    if (rd?.type && rd?.value !== undefined) {
      responses[r.question_id] = rd as ExamSession["responses"][string];
    }
    if (r.is_flagged) flags.add(r.question_id);
  }

  const scratch = (row.scratchpad_data as Record<string, unknown>) ?? {};
  const seed = (scratch.seed as number) ?? 0;

  const session: ExamSession = {
    id: sessionId,
    userId: row.user_id,
    config: {
      id: sessionId,
      mode: row.session_type === "system_exam" ? "system" : (row.session_type as ExamSession["config"]["mode"]),
      questionCount: questionIds.length,
      timeLimitMinutes: Math.ceil((row.time_remaining_seconds ?? 0) / 60) || 60,
      seed,
    },
    questionIds,
    responses,
    flags,
    timeRemainingSeconds: row.time_remaining_seconds ?? 0,
    startedAt: row.started_at,
    lastSavedAt: row.started_at,
    completedAt: row.completed_at ?? undefined,
  };

  return { session, error: null };
}

export async function submitExamAndScore(
  session: ExamSession
): Promise<{ result: ExamScoreResult | null; error: string | null; systemNames?: Record<string, string> }> {
  const primary = await getPrimaryTrack(session.userId);
  const trackId = primary?.trackId ?? null;
  if (!trackId) {
    return { result: null, error: "No track selected" };
  }

  const meta = await loadQuestionMetadataForScoring(trackId, session.questionIds);
  const getCorrect = (qId: string) => meta[qId]?.correctAnswer;
  const getSystem = (qId: string) => meta[qId]?.systemId;
  const getDomain = (qId: string) => meta[qId]?.domainId;
  const getType = (qId: string) => meta[qId]?.type ?? "single_best_answer";

  const result = computeScore(session, getCorrect, getSystem, getDomain, getType);

  const systemIds = Object.keys(result.bySystem).filter((k) => k !== "_unknown");
  const systemNames = systemIds.length > 0 ? await loadSystemNamesByIds(trackId, systemIds) : undefined;

  if (session.completedAt) {
    const scoresMap = new Map(result.items.map((i) => [i.questionId, i.correct]));
    await saveExamSession(session, scoresMap);
  }

  return { result, error: null, systemNames };
}

/** Record a standalone question attempt (e.g. from practice/browse, not exam session) */
export async function recordQuestionAttempt(
  userId: string,
  questionId: string,
  response: { type: string; value: unknown },
  isCorrect: boolean,
  timeSpentSeconds?: number
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.from("user_question_attempts").insert({
    user_id: userId,
    question_id: questionId,
    response_data: response,
    is_correct: isCorrect,
    time_spent_seconds: timeSpentSeconds ?? null,
  });
  return { error: error?.message ?? null };
}

export interface BreakdownData {
  percentCorrect: number;
  rawScore: number;
  maxScore: number;
  flaggedCount: number;
  timeSpentSeconds: number;
  firstQuestionId: string | null;
  bySystem: { systemId: string; name: string; score: number; questions: number; target: number }[];
  byDomain: { domainId: string; name: string; score: number }[];
  byItemType?: Record<string, { correct: number; total: number; percent: number }>;
}

/** Check if exam session exists and whether it's completed (for partial/paused handling). */
export async function getExamSessionStatus(
  clientExamId: string,
  userId: string
): Promise<{ exists: boolean; completed: boolean; questionCount: number }> {
  const { session, error } = await loadExamSession(clientExamId, userId);
  if (error || !session) return { exists: false, completed: false, questionCount: 0 };
  return {
    exists: true,
    completed: !!session.completedAt,
    questionCount: session.questionIds.length,
  };
}

/** Load performance breakdown for a completed exam (by client exam ID). Returns null if not completed. */
export async function loadBreakdownForExam(
  clientExamId: string,
  userId: string
): Promise<BreakdownData | null> {
  const primary = await getPrimaryTrack(userId);
  const trackId = primary?.trackId ?? null;
  if (!trackId) return null;

  const { session, error } = await loadExamSession(clientExamId, userId);
  if (error || !session || session.questionIds.length === 0) return null;
  if (!session.completedAt) return null;

  const meta = await loadQuestionMetadataForScoring(trackId, session.questionIds);
  const getCorrect = (qId: string) => meta[qId]?.correctAnswer;
  const getSystem = (qId: string) => meta[qId]?.systemId;
  const getDomain = (qId: string) => meta[qId]?.domainId;
  const getType = (qId: string) => meta[qId]?.type ?? "single_best_answer";

  const result = computeScore(session, getCorrect, getSystem, getDomain, getType);

  const systemIds = Object.keys(result.bySystem).filter((k) => k !== "_unknown");
  const domainIds = Object.keys(result.byDomain).filter((k) => k !== "_unknown");
  const [systemNames, domainNames] = await Promise.all([
    loadSystemNamesByIds(trackId, systemIds),
    loadDomainNamesByIds(domainIds),
  ]);

  const MASTERY_TARGET = 80;
  const bySystem = systemIds.map((id) => {
    const d = result.bySystem[id];
    return {
      systemId: id,
      name: systemNames[id] ?? id,
      score: Math.round(d.percent),
      questions: d.total,
      target: MASTERY_TARGET,
    };
  });
  const byDomain = domainIds.map((id) => {
    const d = result.byDomain[id];
    return {
      domainId: id,
      name: domainNames[id] ?? id,
      score: Math.round(d.percent),
    };
  });

  const firstQuestionId = session.questionIds[0] ?? null;

  return {
    percentCorrect: result.percentCorrect,
    rawScore: result.rawScore,
    maxScore: result.maxScore,
    flaggedCount: result.flaggedCount,
    timeSpentSeconds: result.timeSpentSeconds,
    firstQuestionId,
    bySystem,
    byDomain,
    byItemType: result.byItemType,
  };
}
