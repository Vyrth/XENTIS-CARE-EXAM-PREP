/**
 * Explain Highlighted Text - POST /api/ai/explain-highlight
 * Board-prep tutor for selected text. Structured output with explanation, board tip, mnemonic, next step.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { isOpenAIConfigured } from "@/lib/ai/openai-client";
import { runExplainHighlight } from "@/lib/ai/explain-highlight";
import { logAIInteraction } from "@/lib/ai/logging";
import type { ExamTrack, ExplainMode } from "@/lib/ai/explain-highlight/types";

const VALID_TRACKS: ExamTrack[] = ["lvn", "rn", "fnp", "pmhnp"];
const VALID_MODES: ExplainMode[] = [
  "explain_simple",
  "board_focus",
  "deep_dive",
  "mnemonic",
];
const MAX_SELECTED_TEXT = 2000;

interface RequestBody {
  selectedText?: string;
  examTrack?: string;
  topicId?: string;
  systemId?: string;
  sourceType?: string;
  sourceId?: string;
  mode?: string;
}

function validateRequest(body: RequestBody): { valid: true; data: RequestBody } | { valid: false; error: string; status: number } {
  if (!body.selectedText || typeof body.selectedText !== "string") {
    return { valid: false, error: "selectedText is required and must be a string", status: 400 };
  }

  const trimmed = body.selectedText.trim();
  if (!trimmed) {
    return { valid: false, error: "selectedText cannot be empty", status: 400 };
  }

  if (trimmed.length > MAX_SELECTED_TEXT) {
    return {
      valid: false,
      error: `selectedText exceeds max length (${MAX_SELECTED_TEXT} chars)`,
      status: 400,
    };
  }

  if (!body.examTrack || !VALID_TRACKS.includes(body.examTrack as ExamTrack)) {
    return {
      valid: false,
      error: `examTrack must be one of: ${VALID_TRACKS.join(", ")}`,
      status: 400,
    };
  }

  if (body.mode && !VALID_MODES.includes(body.mode as ExplainMode)) {
    return {
      valid: false,
      error: `mode must be one of: ${VALID_MODES.join(", ")}`,
      status: 400,
    };
  }

  return { valid: true, data: body };
}

export async function POST(request: Request) {
  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const validation = validateRequest(body);
  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.error, code: "VALIDATION_ERROR" },
      { status: validation.status }
    );
  }

  const { data } = validation;

  if (!isOpenAIConfigured()) {
    return NextResponse.json(
      { error: "AI service not configured", code: "MISSING_API_KEY" },
      { status: 503 }
    );
  }

  const user = await getSessionUser();

  const result = await runExplainHighlight(
    {
      selectedText: data.selectedText!.trim(),
      examTrack: data.examTrack as ExamTrack,
      topicId: data.topicId,
      systemId: data.systemId,
      sourceType: data.sourceType,
      sourceId: data.sourceId,
      mode: (data.mode as ExplainMode) ?? "explain_simple",
    },
    {
      userId: user?.id,
      // retrievedContext: await getRetrievedContext(...) — inject when RAG is ready
    }
  );

  const supabase = await createClient();
  await logAIInteraction(
    {
      userId: user?.id,
      action: "explain_highlight",
      track: data.examTrack as ExamTrack,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      model: "gpt-4o-mini",
      contentRefs: data.sourceId ? [data.sourceId] : undefined,
      error: result.success ? undefined : result.error,
    },
    supabase
  );

  if (!result.success) {
    return NextResponse.json(
      {
        error: result.error ?? "AI request failed",
        code: "AI_ERROR",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data: result.data,
    usage:
      result.promptTokens != null
        ? {
            prompt_tokens: result.promptTokens,
            completion_tokens: result.completionTokens,
          }
        : undefined,
  });
}
