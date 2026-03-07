"use server";

/**
 * AI Tutor server actions - call orchestrator directly (no API keys client-side)
 */

import { getSessionUser } from "@/lib/auth/session";
import { runAIAction } from "@/lib/ai/orchestrator";
import { logAIInteraction } from "@/lib/ai/logging";
import type { AIRequest, AIResponse } from "@/types/ai-tutor";

async function callAI(req: AIRequest): Promise<{ success: boolean; data?: AIResponse; error?: string }> {
  const user = await getSessionUser();
  const fullReq: AIRequest = { ...req, userId: user?.id };
  const result = await runAIAction(fullReq);
  if (result.success && result.data) {
    await logAIInteraction({
      userId: user?.id,
      action: req.action,
      track: req.track,
      contentRefs: result.data.contentRefs,
    });
  } else if (!result.success) {
    await logAIInteraction({
      userId: user?.id,
      action: req.action,
      track: req.track,
      error: result.error,
    });
  }
  return result;
}

export async function explainQuestion(params: {
  track: string;
  questionStem: string;
  rationale: string;
  correctAnswer: string;
}) {
  return callAI({
    action: "explain_question",
    track: params.track as "lvn" | "rn" | "fnp" | "pmhnp",
    questionStem: params.questionStem,
    rationale: params.rationale,
    correctAnswer: params.correctAnswer,
  });
}

export async function explainHighlight(params: {
  track: string;
  highlightedText: string;
  contentRef?: string;
}) {
  return callAI({
    action: "explain_highlight",
    track: params.track as "lvn" | "rn" | "fnp" | "pmhnp",
    highlightedText: params.highlightedText,
    contentRef: params.contentRef,
  });
}

export async function compareConcepts(params: {
  track: string;
  concepts: string[];
}) {
  return callAI({
    action: "compare_concepts",
    track: params.track as "lvn" | "rn" | "fnp" | "pmhnp",
    concepts: params.concepts,
  });
}

export async function generateFlashcards(params: {
  track: string;
  content: string;
}) {
  return callAI({
    action: "generate_flashcards",
    track: params.track as "lvn" | "rn" | "fnp" | "pmhnp",
    notebookContent: params.content,
  });
}

export async function summarizeToNotebook(params: {
  track: string;
  notebookContent: string;
}) {
  return callAI({
    action: "summarize_to_notebook",
    track: params.track as "lvn" | "rn" | "fnp" | "pmhnp",
    notebookContent: params.notebookContent,
  });
}

export async function weakAreaCoaching(params: {
  track: string;
  weakSystems: string[];
  weakDomains: string[];
}) {
  return callAI({
    action: "weak_area_coaching",
    track: params.track as "lvn" | "rn" | "fnp" | "pmhnp",
    weakSystems: params.weakSystems,
    weakDomains: params.weakDomains,
  });
}

export async function quizFollowup(params: {
  track: string;
  content: string;
}) {
  return callAI({
    action: "quiz_followup",
    track: params.track as "lvn" | "rn" | "fnp" | "pmhnp",
    notebookContent: params.content,
  });
}

export async function generateMnemonic(params: {
  track: string;
  topic: string;
  mnemonicType?: "simple" | "acronym" | "visual_hook" | "story" | "compare_contrast";
}) {
  return callAI({
    action: "generate_mnemonic",
    track: params.track as "lvn" | "rn" | "fnp" | "pmhnp",
    topic: params.topic,
    mnemonicType: params.mnemonicType ?? "simple",
  });
}
