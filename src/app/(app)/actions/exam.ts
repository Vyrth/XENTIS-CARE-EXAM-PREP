"use server";

/**
 * Exam server actions - for persistence and scoring
 * Replace with Supabase calls when DB is ready
 */

import type { ExamSession } from "@/types/exam";
import { computeScore, type ExamScoreResult } from "@/lib/exam/scoring";
import { getQuestionById } from "@/lib/exam/question-bank";

export async function saveExamSession(session: ExamSession): Promise<{ error: string | null }> {
  // TODO: Supabase insert/update exam_sessions
  return { error: null };
}

export async function loadExamSession(
  sessionId: string,
  userId: string
): Promise<{ session: ExamSession | null; error: string | null }> {
  // TODO: Supabase select from exam_sessions where id and user_id
  return { session: null, error: null };
}

export async function submitExamAndScore(
  session: ExamSession
): Promise<{ result: ExamScoreResult | null; error: string | null }> {
  const getCorrect = (qId: string) => getQuestionById(qId)?.correctAnswer;
  const getSystem = (qId: string) => getQuestionById(qId)?.systemId;
  const getDomain = (qId: string) => getQuestionById(qId)?.domainId;
  const getType = (qId: string) => getQuestionById(qId)?.type ?? "single_best_answer";

  const result = computeScore(session, getCorrect, getSystem, getDomain, getType);

  // TODO: Save result to exam_results table
  return { result, error: null };
}
