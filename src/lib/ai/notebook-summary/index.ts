/**
 * Notebook Summary orchestrator - calls OpenAI, formats response.
 * Reusable for: manual notebook entries, highlighted text, AI explanations, video transcript clips.
 */

import { getOpenAIClient, isOpenAIConfigured } from "../openai-client";
import { validateInput } from "../guardrails";
import {
  buildNotebookSummarySystemPrompt,
  buildNotebookSummaryUserPrompt,
} from "./prompt-builder";
import {
  formatNotebookSummaryResponse,
  getFallbackNotebookSummaryResponse,
} from "./response-formatter";
import { toSavePayload } from "./summary-formatter";
import type {
  NotebookSummaryRequest,
  NotebookSummaryResponse,
  SummaryMode,
  NotebookSummarySavePayload,
} from "./types";

const DEFAULT_MODE: SummaryMode = "clean_summary";
const DEFAULT_MODEL = "gpt-4o-mini";
const MAX_TOKENS = 1536;

export interface NotebookSummaryResult {
  success: boolean;
  data?: NotebookSummaryResponse;
  savePayload?: NotebookSummarySavePayload;
  error?: string;
  promptTokens?: number;
  completionTokens?: number;
}

export async function runNotebookSummary(
  request: NotebookSummaryRequest,
  options?: {
    userId?: string;
    retrievedContext?: string;
    adaptiveContext?: import("@/lib/readiness/adaptive-context").AdaptiveContextOutput | null;
  }
): Promise<NotebookSummaryResult> {
  const validation = validateInput(request.noteText, "notebook");
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

  const mode = request.summaryMode ?? DEFAULT_MODE;
  const systemPrompt = buildNotebookSummarySystemPrompt(
    request.examTrack,
    options?.adaptiveContext
  );
  const userPrompt = buildNotebookSummaryUserPrompt(
    request.noteText,
    request.examTrack,
    mode,
    {
      topicId: request.topicId,
      systemId: request.systemId,
      sourceType: request.sourceType,
      sourceId: request.sourceId,
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

    const formatted = formatNotebookSummaryResponse(content);

    if (!formatted) {
      const fallback = getFallbackNotebookSummaryResponse();
      return {
        success: true,
        data: fallback,
        savePayload: toSavePayload(fallback, {
          summaryMode: mode,
          examTrack: request.examTrack,
          sourceType: request.sourceType,
          sourceId: request.sourceId,
          topicId: request.topicId,
          systemId: request.systemId,
        }),
        promptTokens: res.usage?.prompt_tokens,
        completionTokens: res.usage?.completion_tokens,
      };
    }

    return {
      success: true,
      data: formatted,
      savePayload: toSavePayload(formatted, {
        summaryMode: mode,
        examTrack: request.examTrack,
        sourceType: request.sourceType,
        sourceId: request.sourceId,
        topicId: request.topicId,
        systemId: request.systemId,
      }),
      promptTokens: res.usage?.prompt_tokens,
      completionTokens: res.usage?.completion_tokens,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.warn("[notebook-summary] OpenAI request failed:", message);
    return {
      success: false,
      error: message,
    };
  }
}
