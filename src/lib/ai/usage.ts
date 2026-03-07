/**
 * Usage controls for free vs paid plans
 */

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
};

/** Check if user can perform action (mock - replace with DB count) */
export function checkUsageLimit(
  userId: string | undefined,
  action: AIAction,
  plan: Plan = "free"
): { allowed: boolean; limit?: number; used?: number } {
  if (!userId) return { allowed: true }; // Unauthenticated - allow for demo, gate in API
  const limits = AI_USAGE_LIMITS[plan];
  const key = ACTION_TO_LIMIT_KEY[action];
  const limit = limits[key];
  // Mock: assume used = 0. In production, query ai_interaction_logs for today's count
  const used = 0;
  return {
    allowed: used < limit,
    limit,
    used,
  };
}
