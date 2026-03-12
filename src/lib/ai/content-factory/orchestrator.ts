/**
 * Jade Tutor Content Factory - generation orchestrator.
 * Unified server-side generation with retries and structured parsing.
 * Uses provider-client for rate control, timeout, exponential backoff.
 */

import { getOpenAIClient, isOpenAIConfigured } from "../openai-client";
import { validateInput } from "../guardrails";
import { getPromptForMode } from "./prompts";
import { parseByMode } from "./parsers";
import { executeWithRetry } from "../provider-client";
import type {
  ContentFactoryRequest,
  ContentFactoryResult,
  ContentFactoryOutput,
  ContentMode,
} from "./types";

const DEFAULT_MODEL = "gpt-4o-mini";
const MAX_TOKENS: Record<ContentMode, number> = {
  question: 2048,
  study_guide_section: 4096,
  study_guide: 8192,
  study_guide_section_pack: 8192,
  flashcard_deck: 4096,
  flashcard_cards: 2048,
  high_yield_summary: 2048,
  common_confusion: 2048,
  board_trap: 1536,
  compare_contrast: 1536,
};

const MAX_RETRIES = 2;
const TEMPERATURE = 0.6;

/**
 * Generate structured content via Jade Tutor.
 * Retries on parse failure with slightly different temperature.
 */
export async function generateContent(
  req: ContentFactoryRequest
): Promise<ContentFactoryResult> {
  if (!isOpenAIConfigured()) {
    return { success: false, error: "AI service not configured" };
  }

  const contextStr = [req.objective, req.domain, req.system, req.topic].filter(Boolean).join(" ");
  if (contextStr) {
    const validation = validateInput(contextStr, "general");
    if (!validation.valid) {
      return { success: false, error: validation.error ?? "Invalid input" };
    }
  }

  const client = getOpenAIClient();
  if (!client) {
    return { success: false, error: "Failed to initialize AI client" };
  }

  const { system, user } = getPromptForMode(req);
  const maxTokens = MAX_TOKENS[req.contentMode] ?? 2048;

  let lastError: string | undefined;
  let lastErrorCode: import("./types").ProviderErrorCode | undefined;
  let rawContent: string | undefined;
  let promptTokens: number | undefined;
  let completionTokens: number | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const temperature = attempt === 0 ? TEMPERATURE : Math.min(0.8, TEMPERATURE + 0.1 * (attempt + 1));

    const apiResult = await executeWithRetry(
      () =>
        client!.chat.completions.create({
          model: DEFAULT_MODEL,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          max_tokens: maxTokens,
          temperature,
        }),
      { model: DEFAULT_MODEL }
    );

    if (!apiResult.success) {
      lastError = apiResult.error.message;
      lastErrorCode = apiResult.error.code;
      continue;
    }

    const res = apiResult.data;
    const content = res.choices[0]?.message?.content?.trim() ?? "";
    rawContent = content;
    promptTokens = res.usage?.prompt_tokens;
    completionTokens = res.usage?.completion_tokens;

    if (!content) {
      lastError = "Empty AI response";
      lastErrorCode = "invalid_output";
      continue;
    }

    const parsed = parseByMode(req.contentMode, content);
    if (parsed) {
      const output = buildOutput(req.contentMode, parsed);
      return {
        success: true,
        output,
        rawContent,
        promptTokens,
        completionTokens,
      };
    }

    lastError = "Could not parse structured output from AI response";
    lastErrorCode = "invalid_output";
  }

  return {
    success: false,
    error: lastError ?? "Generation failed",
    errorCode: lastErrorCode ?? "unknown",
    rawContent,
    promptTokens,
    completionTokens,
  };
}

function buildOutput(
  mode: ContentMode,
  parsed: unknown
): ContentFactoryOutput {
  switch (mode) {
    case "question":
      return { mode: "question", data: parsed as import("./types").QuestionOutput };
    case "study_guide_section":
      return { mode: "study_guide_section", data: parsed as import("./types").StudyGuideSectionOutput };
    case "study_guide":
      return { mode: "study_guide", data: parsed as import("./types").StudyGuideOutput };
    case "study_guide_section_pack":
      return { mode: "study_guide_section_pack", data: parsed as import("./types").StudyGuideSectionPackOutput };
    case "flashcard_deck":
      return { mode: "flashcard_deck", data: parsed as import("./types").FlashcardDeckOutput };
    case "flashcard_cards":
      return { mode: "flashcard_cards", data: parsed as import("./types").FlashcardOutput[] };
    case "high_yield_summary":
      return { mode: "high_yield_summary", data: parsed as import("./types").HighYieldSummaryOutput };
    case "common_confusion":
      return { mode: "common_confusion", data: parsed as import("./types").CommonConfusionOutput };
    case "board_trap":
      return { mode: "board_trap", data: parsed as import("./types").BoardTrapOutput };
    case "compare_contrast":
      return { mode: "compare_contrast", data: parsed as import("./types").CompareContrastOutput };
    default:
      throw new Error(`Unknown mode: ${mode}`);
  }
}
