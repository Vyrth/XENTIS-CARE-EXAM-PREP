/**
 * AI health check - verifies OpenAI is configured and reachable.
 * Never logs API key or sensitive data.
 */

import { NextResponse } from "next/server";
import { getOpenAIClient, isOpenAIConfigured } from "@/lib/ai/openai-client";

export async function GET() {
  if (!isOpenAIConfigured()) {
    return NextResponse.json(
      {
        status: "unconfigured",
        message: "OPENAI_API_KEY is not set",
        configured: false,
      },
      { status: 503 }
    );
  }

  const client = getOpenAIClient();
  if (!client) {
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to initialize OpenAI client",
        configured: true,
      },
      { status: 503 }
    );
  }

  try {
    // Minimal completion to verify key works (cheaper than models.list)
    await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Hi" }],
      max_tokens: 1,
    });
    return NextResponse.json({
      status: "ok",
      configured: true,
      message: "OpenAI API reachable",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    // Log safe info only - never API key
    console.warn("[ai/health] OpenAI check failed:", message);
    return NextResponse.json(
      {
        status: "error",
        configured: true,
        message: "OpenAI API unreachable",
        error: message,
      },
      { status: 503 }
    );
  }
}
