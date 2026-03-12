/**
 * Entitlement checks - gates for learner access
 * Uses centralized getEntitlements (trial = full access, expired trial = free limits)
 */

import { createClient } from "@/lib/supabase/server";
import { getEntitlements } from "./access";
import { FREE_ENTITLEMENTS } from "@/config/billing";

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Count AI actions today for user (from ai_interaction_logs) */
export async function getAIActionsUsedToday(userId: string): Promise<number> {
  const supabase = await createClient();
  const today = todayUtc();
  const { count, error } = await supabase
    .from("ai_interaction_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", `${today}T00:00:00Z`);
  if (error) return 0;
  return count ?? 0;
}

/** Count questions answered today (exam_session_questions + user_question_attempts) */
export async function getQuestionsUsedToday(userId: string): Promise<number> {
  const supabase = await createClient();
  const today = todayUtc();

  const { data: sessionsToday } = await supabase
    .from("exam_sessions")
    .select("id")
    .eq("user_id", userId)
    .gte("started_at", `${today}T00:00:00Z`);

  let count = 0;
  if (sessionsToday?.length) {
    const { count: sessionCount } = await supabase
      .from("exam_session_questions")
      .select("id", { count: "exact", head: true })
      .in("exam_session_id", sessionsToday.map((s) => s.id));
    count += sessionCount ?? 0;
  }

  const { count: standaloneCount } = await supabase
    .from("user_question_attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", `${today}T00:00:00Z`);
  count += standaloneCount ?? 0;

  return count;
}

/** Check if user can perform another AI action today */
export async function canPerformAIAction(userId: string): Promise<{
  allowed: boolean;
  used: number;
  limit: number;
  plan: "free" | "paid";
}> {
  const [entitlements, used] = await Promise.all([
    getEntitlements(userId),
    getAIActionsUsedToday(userId),
  ]);
  const limit = entitlements.aiActionsPerDay;
  return {
    allowed: used < limit,
    used,
    limit,
    plan: entitlements.plan,
  };
}

/** Check if user can answer more questions today */
export async function canAnswerQuestions(userId: string): Promise<{
  allowed: boolean;
  used: number;
  limit: number;
  plan: "free" | "paid";
}> {
  const [entitlements, used] = await Promise.all([
    getEntitlements(userId),
    getQuestionsUsedToday(userId),
  ]);
  const limit = entitlements.questionsPerDay;
  return {
    allowed: used < limit,
    used,
    limit,
    plan: entitlements.plan,
  };
}

/** Check if user can access full pre-practice exam */
export async function canAccessFullPrePractice(userId: string): Promise<boolean> {
  const entitlements = await getEntitlements(userId);
  return entitlements.prePracticeAccess === "full";
}

/** Check if user can access system exams */
export async function canAccessSystemExams(userId: string): Promise<boolean> {
  const entitlements = await getEntitlements(userId);
  return entitlements.fullSystemExams;
}

/** Check if user can access advanced analytics */
export async function canAccessAdvancedAnalytics(userId: string): Promise<boolean> {
  const entitlements = await getEntitlements(userId);
  return entitlements.advancedAnalytics;
}

/** Get study guide index limit for free users (0-based, first N guides) */
export function getStudyGuidesLimit(plan: "free" | "paid"): number {
  return plan === "free" ? FREE_ENTITLEMENTS.studyGuidesLimit : 999;
}
