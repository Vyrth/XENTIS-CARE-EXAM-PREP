/**
 * Weak Area Coach orchestrator - uses analytics context to generate coaching.
 * Prepares for retrieval-aware coaching (inject retrievedContext when RAG ready).
 */

import { getOpenAIClient, isOpenAIConfigured } from "../openai-client";
import { buildCoachContext } from "@/lib/readiness/context-builder";
import {
  buildWeakAreaCoachSystemPrompt,
  buildWeakAreaCoachUserPrompt,
} from "./prompt-builder";
import {
  formatWeakAreaCoachResponse,
  getFallbackWeakAreaCoachResponse,
} from "./response-formatter";
import type {
  WeakAreaCoachRequest,
  WeakAreaCoachResponse,
  CoachingMode,
} from "./types";

const DEFAULT_MODE: CoachingMode = "explain_weakness";
const DEFAULT_MODEL = "gpt-4o-mini";
const MAX_TOKENS = 1024;

export interface WeakAreaCoachResult {
  success: boolean;
  data?: WeakAreaCoachResponse;
  error?: string;
  promptTokens?: number;
  completionTokens?: number;
}

export async function runWeakAreaCoach(
  request: WeakAreaCoachRequest,
  options?: {
    retrievedContext?: string;
    adaptiveContext?: import("@/lib/readiness/adaptive-context").AdaptiveContextOutput | null;
  }
): Promise<WeakAreaCoachResult> {
  if (!isOpenAIConfigured()) {
    return { success: false, error: "AI service not configured" };
  }

  const client = getOpenAIClient();
  if (!client) {
    return { success: false, error: "Failed to initialize AI client" };
  }

  const analyticsContext = buildCoachContext({
    weakSystems: request.weakSystems,
    weakDomains: request.weakDomains,
    weakSkills: request.weakSkills,
    weakItemTypes: request.weakItemTypes,
    readinessBand: request.readinessBand,
    recentMistakes: request.recentMistakes,
    currentStudyPlan: request.currentStudyPlan,
  });

  const mode = request.coachingMode ?? DEFAULT_MODE;
  const systemPrompt = buildWeakAreaCoachSystemPrompt(
    request.examTrack,
    options?.adaptiveContext
  );
  const userPrompt = buildWeakAreaCoachUserPrompt(
    analyticsContext,
    request.examTrack,
    mode,
    {
      retrievedContext: options?.retrievedContext,
      adaptiveContext: options?.adaptiveContext,
    }
  );

  try {
    const res = await client.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: MAX_TOKENS,
      temperature: 0.5,
    });

    const content = res.choices[0]?.message?.content?.trim() ?? "";

    if (!content) {
      return {
        success: false,
        error: "Empty response from AI",
        promptTokens: res.usage?.prompt_tokens,
        completionTokens: res.usage?.completion_tokens,
      };
    }

    const formatted = formatWeakAreaCoachResponse(content);

    if (!formatted) {
      return {
        success: true,
        data: getFallbackWeakAreaCoachResponse(),
        promptTokens: res.usage?.prompt_tokens,
        completionTokens: res.usage?.completion_tokens,
      };
    }

    return {
      success: true,
      data: formatted,
      promptTokens: res.usage?.prompt_tokens,
      completionTokens: res.usage?.completion_tokens,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.warn("[weak-area-coach] OpenAI request failed:", message);
    return {
      success: false,
      error: message,
    };
  }
}
