/**
 * Mnemonic Generator orchestrator - calls OpenAI, formats response.
 * Retrieval: inject retrievedContext when RAG is ready.
 */

import { getOpenAIClient, isOpenAIConfigured } from "../openai-client";
import { validateInput } from "../guardrails";
import {
  buildMnemonicSystemPrompt,
  buildMnemonicUserPrompt,
} from "./prompt-builder";
import {
  formatMnemonicResponse,
  getFallbackMnemonicResponse,
} from "./response-formatter";
import type {
  MnemonicRequest,
  MnemonicResponse,
  MnemonicStyle,
  MnemonicSavePayload,
} from "./types";

const DEFAULT_STYLE: MnemonicStyle = "phrase";
const DEFAULT_MODEL = "gpt-4o-mini";
const MAX_TOKENS = 1024;

export interface MnemonicResult {
  success: boolean;
  data?: MnemonicResponse;
  savePayload?: MnemonicSavePayload;
  error?: string;
  promptTokens?: number;
  completionTokens?: number;
}

export async function runMnemonic(
  request: MnemonicRequest,
  options?: {
    userId?: string;
    retrievedContext?: string;
    adaptiveContext?: import("@/lib/readiness/adaptive-context").AdaptiveContextOutput | null;
  }
): Promise<MnemonicResult> {
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

  const style = request.mnemonicStyle ?? DEFAULT_STYLE;
  const systemPrompt = buildMnemonicSystemPrompt(
    request.examTrack,
    options?.adaptiveContext
  );
  const userPrompt = buildMnemonicUserPrompt(
    request.selectedText,
    request.examTrack,
    style,
    {
      conceptTitle: request.conceptTitle,
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
      temperature: 0.6,
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

    const formatted = formatMnemonicResponse(content);

    if (!formatted) {
      const fallback = getFallbackMnemonicResponse();
      return {
        success: true,
        data: fallback,
        savePayload: buildSavePayload(fallback, request, style),
        promptTokens: res.usage?.prompt_tokens,
        completionTokens: res.usage?.completion_tokens,
      };
    }

    return {
      success: true,
      data: formatted,
      savePayload: buildSavePayload(formatted, request, style),
      promptTokens: res.usage?.prompt_tokens,
      completionTokens: res.usage?.completion_tokens,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.warn("[mnemonic] OpenAI request failed:", message);
    return {
      success: false,
      error: message,
    };
  }
}

/** Build payload for future notebook/flashcard save */
function buildSavePayload(
  data: MnemonicResponse,
  request: MnemonicRequest,
  style: MnemonicStyle
): MnemonicSavePayload {
  return {
    conceptSummary: data.conceptSummary,
    mnemonic: data.mnemonic,
    whyItWorks: data.whyItWorks,
    rapidRecallVersion: data.rapidRecallVersion,
    boardTip: data.boardTip,
    conceptTitle: request.conceptTitle,
    mnemonicStyle: style,
    examTrack: request.examTrack,
    sourceType: request.sourceType,
    sourceId: request.sourceId,
  };
}
