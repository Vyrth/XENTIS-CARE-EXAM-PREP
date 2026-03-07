/**
 * AI Orchestrator - generic prompt sending and tutor mode execution.
 * Server-only. Uses openai-client, prompt-builder.
 *
 * RAG integration: When retrieval is ready, inject retrieved chunks into
 * buildPrompt's retrievedContext. Example:
 *   const chunks = await retrieveChunks(query, { limit: 8 });
 *   const context = chunks.map(c => c.chunkText).join("\n\n---\n\n");
 *   params.retrievedContext = context;
 */
import { getOpenAIClient, isOpenAIConfigured } from "./openai-client";
import { buildPrompt } from "./prompt-builder";
import type {
  SimplePromptRequest,
  SimplePromptResponse,
  TutorMode,
  TutorParams,
  TutorResponse,
} from "./types";

const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_MAX_TOKENS = 2048;
const DEFAULT_TEMPERATURE = 0.7;

/** Parse JSON array from response (for flashcards, quiz) */
function tryParseJSON<T>(text: string): T | null {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}

// -----------------------------------------------------------------------------
// Generic prompt - used by /api/ai/test and any simple flow
// -----------------------------------------------------------------------------

export async function sendPrompt(
  request: SimplePromptRequest
): Promise<{ success: true; data: SimplePromptResponse } | { success: false; error: string }> {
  if (!isOpenAIConfigured()) {
    return { success: false, error: "AI service not configured" };
  }

  const client = getOpenAIClient();
  if (!client) {
    return { success: false, error: "Failed to initialize AI client" };
  }

  const systemPrompt =
    request.systemPrompt ?? "You are a helpful assistant. Respond briefly.";
  const maxTokens = request.maxTokens ?? 150;
  const temperature = request.temperature ?? 0.5;

  try {
    const res = await client.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: request.prompt },
      ],
      max_tokens: maxTokens,
      temperature,
    });

    const content = res.choices[0]?.message?.content?.trim() ?? "";

    if (!content) {
      return { success: false, error: "Empty response from AI" };
    }

    return {
      success: true,
      data: {
        content,
        promptTokens: res.usage?.prompt_tokens,
        completionTokens: res.usage?.completion_tokens,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.warn("[ai-orchestrator] sendPrompt failed:", message);
    return { success: false, error: message };
  }
}

// -----------------------------------------------------------------------------
// Tutor mode - runs a specific tutor flow with prompt builder
// -----------------------------------------------------------------------------

export async function runTutorMode(
  mode: TutorMode,
  params: TutorParams
): Promise<{ success: true; data: TutorResponse } | { success: false; error: string }> {
  if (!isOpenAIConfigured()) {
    return { success: false, error: "AI service not configured" };
  }

  const client = getOpenAIClient();
  if (!client) {
    return { success: false, error: "Failed to initialize AI client" };
  }

  const { systemPrompt, userPrompt } = buildPrompt(mode, params);

  try {
    const res = await client.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
    });

    const content = res.choices[0]?.message?.content?.trim() ?? "";

    if (!content) {
      return { success: false, error: "Empty response from AI" };
    }

    // Parse structured output for flashcards
    if (mode === "generate_flashcards") {
      const parsed = tryParseJSON<{ front: string; back: string }[]>(content);
      if (parsed && Array.isArray(parsed)) {
        return {
          success: true,
          data: {
            content: content.split(/\[[\s\S]*\]/)[0]?.trim() || "Here are your flashcards:",
            flashcards: parsed.slice(0, 10),
            contentRefs: params.retrievedContext ? [] : undefined,
          },
        };
      }
    }

    return {
      success: true,
      data: {
        content,
        contentRefs: params.retrievedContext ? [] : undefined,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.warn("[ai-orchestrator] runTutorMode failed:", mode, message);
    return { success: false, error: message };
  }
}
