/**
 * Generate Flashcards orchestrator - calls OpenAI, formats response.
 */

import { getOpenAIClient, isOpenAIConfigured } from "../openai-client";
import { validateInput } from "../guardrails";
import {
  buildFlashcardSystemPrompt,
  buildFlashcardUserPrompt,
} from "./prompt-builder";
import { formatFlashcardsResponse } from "./response-formatter";
import type {
  GenerateFlashcardsRequest,
  GeneratedFlashcard,
  FlashcardMode,
  FlashcardSavePayload,
} from "./types";

const DEFAULT_MODE: FlashcardMode = "standard";
const DEFAULT_COUNT = 5;
const MIN_COUNT = 1;
const MAX_COUNT = 20;
const DEFAULT_MODEL = "gpt-4o-mini";
const MAX_TOKENS = 2048;

export interface GenerateFlashcardsResult {
  success: boolean;
  data?: { flashcards: GeneratedFlashcard[] };
  savePayload?: FlashcardSavePayload;
  error?: string;
  promptTokens?: number;
  completionTokens?: number;
}

export async function runGenerateFlashcards(
  request: GenerateFlashcardsRequest,
  options?: {
    userId?: string;
    retrievedContext?: string;
    adaptiveContext?: import("@/lib/readiness/adaptive-context").AdaptiveContextOutput | null;
  }
): Promise<GenerateFlashcardsResult> {
  const validation = validateInput(request.sourceText, "notebook");
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

  const mode = request.flashcardMode ?? DEFAULT_MODE;
  const count = Math.min(
    MAX_COUNT,
    Math.max(MIN_COUNT, request.numberOfCards ?? DEFAULT_COUNT)
  );

  const systemPrompt = buildFlashcardSystemPrompt(
    request.examTrack,
    options?.adaptiveContext
  );
  const userPrompt = buildFlashcardUserPrompt(
    request.sourceText,
    request.examTrack,
    mode,
    count,
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

    const flashcards = formatFlashcardsResponse(content);

    if (!flashcards || flashcards.length === 0) {
      return {
        success: false,
        error: "Could not parse flashcards from AI response",
        promptTokens: res.usage?.prompt_tokens,
        completionTokens: res.usage?.completion_tokens,
      };
    }

    const savePayload: FlashcardSavePayload = {
      outputType: "flashcard_set",
      flashcards,
      flashcardMode: mode,
      examTrack: request.examTrack,
      sourceType: request.sourceType,
      sourceId: request.sourceId,
      topicId: request.topicId,
      systemId: request.systemId,
    };

    return {
      success: true,
      data: { flashcards },
      savePayload,
      promptTokens: res.usage?.prompt_tokens,
      completionTokens: res.usage?.completion_tokens,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.warn("[generate-flashcards] OpenAI request failed:", message);
    return {
      success: false,
      error: message,
    };
  }
}
