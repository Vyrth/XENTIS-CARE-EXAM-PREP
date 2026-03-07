/**
 * Explain Highlight orchestrator - calls OpenAI, formats response.
 * Retrieval: inject retrievedContext when RAG is ready.
 */

import { getOpenAIClient, isOpenAIConfigured } from "../openai-client";
import { validateInput } from "../guardrails";
import {
  buildExplainHighlightSystemPrompt,
  buildExplainHighlightUserPrompt,
} from "./prompt-builder";
import {
  formatExplainHighlightResponse,
  getFallbackResponse,
} from "./response-formatter";
import type {
  ExplainHighlightRequest,
  ExplainHighlightResponse,
  ExplainMode,
} from "./types";

const DEFAULT_MODE: ExplainMode = "explain_simple";
const DEFAULT_MODEL = "gpt-4o-mini";
const MAX_TOKENS = 1024;

export interface ExplainHighlightResult {
  success: boolean;
  data?: ExplainHighlightResponse;
  error?: string;
  promptTokens?: number;
  completionTokens?: number;
}

export async function runExplainHighlight(
  request: ExplainHighlightRequest,
  options?: {
    userId?: string;
    retrievedContext?: string;
  }
): Promise<ExplainHighlightResult> {
  const validation = validateInput(request.selectedText, "highlight");
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  if (!isOpenAIConfigured()) {
    return { success: false, error: "AI service not configured" };
  }

  const client = getOpenAIClient();
  if (!client) {
    return { success: false, error: "Failed to initialize AI client" };
  }

  const mode = request.mode ?? DEFAULT_MODE;
  const systemPrompt = buildExplainHighlightSystemPrompt(request.examTrack);
  const userPrompt = buildExplainHighlightUserPrompt(
    request.selectedText,
    request.examTrack,
    mode,
    {
      topicId: request.topicId,
      systemId: request.systemId,
      sourceType: request.sourceType,
      sourceId: request.sourceId,
      retrievedContext: options?.retrievedContext,
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

    const formatted = formatExplainHighlightResponse(content);

    if (!formatted) {
      return {
        success: true,
        data: getFallbackResponse(),
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
    console.warn("[explain-highlight] OpenAI request failed:", message);
    return {
      success: false,
      error: message,
    };
  }
}
