"use server";

/**
 * AI Tutor server actions - call orchestrator directly (no API keys client-side)
 * Track is resolved from signed-in user's primary track (hard constraint).
 * Entitlement: Free users limited to aiActionsPerDay (e.g. 3/day).
 * Analytics (readiness, weak areas) are loaded server-side for context-aware tutoring.
 */

import { getSessionUser } from "@/lib/auth/session";
import { canPerformAIAction } from "@/lib/billing/entitlements";
import { runAIAction } from "@/lib/ai/orchestrator";
import { logAIInteraction } from "@/lib/ai/logging";
import { enforceJadeTrackContext } from "@/lib/ai/jade-track-context";
import { loadAnalyticsForJade } from "@/lib/ai/jade-analytics";
import { createClient } from "@/lib/supabase/server";
import type { AIRequest, AIResponse } from "@/types/ai-tutor";

async function resolveTrack(userId: string | null): Promise<"lvn" | "rn" | "fnp" | "pmhnp" | null> {
  if (!userId) return null;
  const ctx = await enforceJadeTrackContext(userId, null, "server_action");
  return ctx?.track ?? null;
}

async function callAI(
  req: Omit<AIRequest, "track" | "userId">,
  userId: string | null
): Promise<{ success: boolean; data?: AIResponse; error?: string; upgradeRequired?: boolean }> {
  if (!userId) {
    return { success: false, error: "Sign in required to use Jade Tutor" };
  }
  const aiCheck = await canPerformAIAction(userId);
  if (!aiCheck.allowed) {
    return {
      success: false,
      error: `Daily Jade Tutor limit reached (${aiCheck.used}/${aiCheck.limit}). Upgrade for unlimited access.`,
      upgradeRequired: true,
    };
  }
  const track = await resolveTrack(userId);
  if (!track) {
    return { success: false, error: "Complete onboarding to set your exam track" };
  }
  const analytics = await loadAnalyticsForJade(userId);
  const fullReq: AIRequest = {
    ...req,
    userId,
    track,
    analytics: analytics ? (analytics as AIRequest["analytics"]) : undefined,
  };
  const result = await runAIAction(fullReq);
  const supabase = await createClient();
  if (result.success && result.data) {
    await logAIInteraction(
      {
        userId,
        action: req.action,
        track,
        contentRefs: result.data.contentRefs,
      },
      supabase
    );
  } else if (!result.success) {
    await logAIInteraction(
      {
        userId,
        action: req.action,
        track,
        error: result.error,
      },
      supabase
    );
  }
  return result;
}

export async function explainQuestion(params: {
  questionStem: string;
  rationale: string;
  correctAnswer: string;
  selectedAnswer?: string;
  userCorrect?: boolean;
  systemName?: string;
  topicName?: string;
  distractors?: { key: string; text: string }[];
  explainMode?: "simple" | "board_focus" | "why_others_wrong";
  questionId?: string;
}) {
  const user = await getSessionUser();
  return callAI(
    {
      action: "explain_question",
      questionStem: params.questionStem,
      rationale: params.rationale,
      correctAnswer: params.correctAnswer,
      selectedAnswer: params.selectedAnswer,
      userCorrect: params.userCorrect,
      systemName: params.systemName,
      topicName: params.topicName,
      distractors: params.distractors,
      explainMode: params.explainMode ?? "simple",
      questionId: params.questionId,
    },
    user?.id ?? null
  );
}

export async function explainHighlight(params: {
  highlightedText: string;
  contentRef?: string;
}) {
  const user = await getSessionUser();
  return callAI(
    {
      action: "explain_highlight",
      highlightedText: params.highlightedText,
      contentRef: params.contentRef,
    },
    user?.id ?? null
  );
}

export async function compareConcepts(params: { concepts: string[] }) {
  const user = await getSessionUser();
  return callAI(
    {
      action: "compare_concepts",
      concepts: params.concepts,
    },
    user?.id ?? null
  );
}

export async function generateFlashcards(params: { content: string }) {
  const user = await getSessionUser();
  return callAI(
    {
      action: "generate_flashcards",
      notebookContent: params.content,
    },
    user?.id ?? null
  );
}

export async function summarizeToNotebook(params: { notebookContent: string }) {
  const user = await getSessionUser();
  return callAI(
    {
      action: "summarize_to_notebook",
      notebookContent: params.notebookContent,
    },
    user?.id ?? null
  );
}

export async function weakAreaCoaching(params: {
  weakSystems: string[];
  weakDomains: string[];
}) {
  const user = await getSessionUser();
  return callAI(
    {
      action: "weak_area_coaching",
      weakSystems: params.weakSystems,
      weakDomains: params.weakDomains,
    },
    user?.id ?? null
  );
}

export async function quizFollowup(params: { content: string }) {
  const user = await getSessionUser();
  return callAI(
    {
      action: "quiz_followup",
      notebookContent: params.content,
    },
    user?.id ?? null
  );
}

export async function generateMnemonic(params: {
  topic: string;
  mnemonicType?: "simple" | "acronym" | "visual_hook" | "story" | "compare_contrast";
}) {
  const user = await getSessionUser();
  return callAI(
    {
      action: "generate_mnemonic",
      topic: params.topic,
      mnemonicType: params.mnemonicType ?? "simple",
    },
    user?.id ?? null
  );
}

/** Process free-form chat message: intent detection + routing. Returns validated output. */
export async function chatWithJade(params: {
  message: string;
  weakAreas?: { systems: string[]; domains: string[] };
}): Promise<{
  success: boolean;
  mode?: "question_set" | "flashcard_set" | "concept_explanation";
  content?: string;
  questions?: { stem: string; options: { key: string; text: string; isCorrect: boolean }[]; rationale: string; correctKey: string }[];
  flashcards?: { front: string; back: string }[];
  conceptExplanation?: { title: string; summary: string; high_yield_points: string[]; common_traps: string[] };
  track?: string;
  topic?: string;
  error?: string;
  upgradeRequired?: boolean;
}> {
  const user = await getSessionUser();
  if (!user?.id) {
    return { success: false, error: "Sign in required to use Jade Tutor" };
  }
  const aiCheck = await canPerformAIAction(user.id);
  if (!aiCheck.allowed) {
    return {
      success: false,
      error: `Daily Jade Tutor limit reached (${aiCheck.used}/${aiCheck.limit}). Upgrade for unlimited access.`,
      upgradeRequired: true,
    };
  }
  const trackCtx = await enforceJadeTrackContext(user.id, null, "chat");
  if (!trackCtx) {
    return { success: false, error: "Complete onboarding to set your exam track" };
  }

  const { processJadeChat } = await import("@/lib/ai/jade-tutor");
  const result = await processJadeChat(params.message, trackCtx.track, user.id, {
    weakAreas: params.weakAreas,
  });

  const supabase = await createClient();
  await logAIInteraction(
    {
      userId: user.id,
      action: "explain_highlight",
      track: trackCtx.track,
      contentRefs: result.success ? [] : undefined,
      error: result.error,
    },
    supabase
  );

  if (result.success) {
    return {
      success: true,
      mode: result.mode,
      content: result.content,
      questions: result.questions,
      flashcards: result.flashcards,
      conceptExplanation: result.conceptExplanation,
      track: result.track,
      topic: result.topic,
      error: result.error,
    };
  }
  return {
    success: false,
    error: result.error ?? "Jade Tutor couldn't respond. Please try again.",
  };
}
