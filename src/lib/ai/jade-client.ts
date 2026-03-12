/**
 * Jade Tutor - Unified AI Client
 *
 * Centralizes all AI generation calls. Uses OpenAI via provider-client for
 * retries, rate limiting, and error classification.
 */

import { getOpenAIClient, isOpenAIConfigured } from "./openai-client";
import { executeWithRetry } from "./provider-client";

export type ExamTrack = "lvn" | "rn" | "fnp" | "pmhnp";

const DEFAULT_MODEL = "gpt-4o-mini";

export interface JadeCompletionRequest {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export interface JadeCompletionResult {
  success: boolean;
  content?: string;
  error?: string;
  errorCode?: "provider_rate_limit" | "provider_timeout" | "invalid_output" | "unknown";
  promptTokens?: number;
  completionTokens?: number;
}

/**
 * Call Jade Tutor (OpenAI) with system + user prompts.
 * Handles retries, rate limiting, and returns structured result.
 */
export async function callJade(request: JadeCompletionRequest): Promise<JadeCompletionResult> {
  if (!isOpenAIConfigured()) {
    return { success: false, error: "AI service not configured" };
  }

  const client = getOpenAIClient();
  if (!client) {
    return { success: false, error: "Failed to initialize AI client" };
  }

  const model = request.model ?? DEFAULT_MODEL;
  const maxTokens = request.maxTokens ?? 2048;
  const temperature = request.temperature ?? 0.6;

  const apiResult = await executeWithRetry(
    () =>
      client!.chat.completions.create({
        model,
        messages: [
          { role: "system", content: request.systemPrompt },
          { role: "user", content: request.userPrompt },
        ],
        max_tokens: maxTokens,
        temperature,
      }),
    { model }
  );

  if (!apiResult.success) {
    return {
      success: false,
      error: apiResult.error.message,
      errorCode: apiResult.error.code as JadeCompletionResult["errorCode"],
    };
  }

  const res = apiResult.data;
  const content = res.choices[0]?.message?.content?.trim() ?? "";

  if (!content) {
    return {
      success: false,
      error: "Empty AI response",
      errorCode: "invalid_output",
      promptTokens: res.usage?.prompt_tokens,
      completionTokens: res.usage?.completion_tokens,
    };
  }

  return {
    success: true,
    content,
    promptTokens: res.usage?.prompt_tokens,
    completionTokens: res.usage?.completion_tokens,
  };
}

/** Check if Jade Tutor (AI) is configured and available */
export function isJadeConfigured(): boolean {
  return isOpenAIConfigured();
}
