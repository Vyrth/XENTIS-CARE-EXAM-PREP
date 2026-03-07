/**
 * Minimal AI test endpoint - uses ai-orchestrator.sendPrompt.
 * For integration testing. Use /api/ai for full tutor actions.
 */

import { NextResponse } from "next/server";
import { isOpenAIConfigured } from "@/lib/ai/openai-client";
import { sendPrompt } from "@/lib/ai/ai-orchestrator";

const MAX_PROMPT_LENGTH = 500;

export async function POST(request: Request) {
  let body: { prompt?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";

  if (!prompt) {
    return NextResponse.json(
      { error: "Missing or empty prompt", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    return NextResponse.json(
      {
        error: `Prompt exceeds max length (${MAX_PROMPT_LENGTH} chars)`,
        code: "BAD_REQUEST",
      },
      { status: 400 }
    );
  }

  if (!isOpenAIConfigured()) {
    return NextResponse.json(
      {
        error: "AI service not configured",
        code: "MISSING_API_KEY",
      },
      { status: 503 }
    );
  }

  const result = await sendPrompt({
    prompt,
    systemPrompt: "You are a helpful assistant. Respond briefly in 1-2 sentences.",
    maxTokens: 150,
    temperature: 0.5,
  });

  if (!result.success) {
    return NextResponse.json(
      {
        error: result.error,
        code: "OPENAI_ERROR",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    response: result.data.content,
    usage: result.data.promptTokens
      ? {
          prompt_tokens: result.data.promptTokens,
          completion_tokens: result.data.completionTokens,
        }
      : undefined,
  });
}
