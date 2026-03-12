/**
 * Usage controls for free vs paid plans.
 * Queries ai_interaction_logs for real counts; 0 when no data.
 */

import { createClient } from "@/lib/supabase/server";
import { AI_USAGE_LIMITS } from "@/config/ai-tutor";
import type { AIAction } from "@/types/ai-tutor";

type Plan = "free" | "paid";

const ACTION_TO_LIMIT_KEY: Record<AIAction, keyof typeof AI_USAGE_LIMITS.free> = {
  explain_question: "explainPerDay",
  explain_highlight: "explainPerDay",
  compare_concepts: "comparePerDay",
  generate_flashcards: "flashcardsPerDay",
  summarize_to_notebook: "summarizePerDay",
  weak_area_coaching: "coachingPerDay",
  quiz_followup: "quizPerDay",
  generate_mnemonic: "mnemonicPerDay",
  notebook_summary: "summarizePerDay",
};

const ACTION_TO_INTERACTION_TYPE: Record<AIAction, string> = {
  explain_question: "explain",
  explain_highlight: "explain",
  compare_concepts: "explain",
  generate_flashcards: "flashcards",
  summarize_to_notebook: "summarize",
  weak_area_coaching: "coaching",
  quiz_followup: "explain",
  generate_mnemonic: "mnemonic",
  notebook_summary: "summarize",
};

/** Load today's usage count from ai_interaction_logs */
async function loadUsageCount(userId: string, action: AIAction): Promise<number> {
  try {
    const supabase = await createClient();
    const type = ACTION_TO_INTERACTION_TYPE[action];
    const today = new Date().toISOString().slice(0, 10);
    const { count, error } = await supabase
      .from("ai_interaction_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("interaction_type", type)
      .gte("created_at", `${today}T00:00:00Z`)
      .lt("created_at", `${today}T23:59:59.999Z`);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

/** Async: check if user can perform action (DB-backed usage count) */
export async function checkUsageLimitAsync(
  userId: string | undefined,
  action: AIAction,
  plan: Plan = "free"
): Promise<{ allowed: boolean; limit?: number; used?: number }> {
  if (!userId) return { allowed: true };
  const limits = AI_USAGE_LIMITS[plan];
  const key = ACTION_TO_LIMIT_KEY[action];
  const limit = limits[key];
  const used = await loadUsageCount(userId, action);
  return {
    allowed: used < limit,
    limit,
    used,
  };
}

/** Sync fallback for callers that cannot await (returns allowed: true; used: 0) */
export function checkUsageLimit(
  userId: string | undefined,
  action: AIAction,
  plan: Plan = "free"
): { allowed: boolean; limit?: number; used?: number } {
  if (!userId) return { allowed: true };
  const limits = AI_USAGE_LIMITS[plan];
  const key = ACTION_TO_LIMIT_KEY[action];
  const limit = limits[key];
  return { allowed: true, limit, used: 0 };
}
