/**
 * Generate Flashcards - POST /api/ai/generate-flashcards
 * Generates board-focused flashcards from selected content, notebook entries, study guides, etc.
 * Track is resolved from signed-in user's primary track (hard constraint).
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { enforceJadeTrackContext } from "@/lib/ai/jade-track-context";
import { loadAnalyticsForJade } from "@/lib/ai/jade-analytics";
import { isOpenAIConfigured } from "@/lib/ai/openai-client";
import { runGenerateFlashcards } from "@/lib/ai/generate-flashcards";
import { retrieveForFlashcards } from "@/lib/ai/retrieval/retrieve-for-action";
import {
  buildAdaptiveContext,
  analyticsToAdaptiveInput,
} from "@/lib/readiness/adaptive-context";
import { logAIInteraction } from "@/lib/ai/logging";
import { canPerformAIAction } from "@/lib/billing/entitlements";
import type { ExamTrack, FlashcardMode } from "@/lib/ai/generate-flashcards/types";

const VALID_TRACKS: ExamTrack[] = ["lvn", "rn", "fnp", "pmhnp"];
const VALID_MODES: FlashcardMode[] = [
  "standard",
  "high_yield",
  "rapid_recall",
  "compare_contrast",
  "pharm_focus",
];
const MAX_SOURCE_TEXT = 10000;

interface AnalyticsPayload {
  readinessScore?: number;
  readinessBand?: string;
  weakSystems?: { name: string; percent?: number }[];
  weakSkills?: { name: string; percent?: number }[];
}

interface RequestBody {
  sourceText?: string;
  examTrack?: string;
  topicId?: string;
  systemId?: string;
  sourceType?: string;
  sourceId?: string;
  numberOfCards?: number;
  flashcardMode?: string;
  analytics?: AnalyticsPayload;
}

function validateRequest(
  body: RequestBody
): { valid: true; data: RequestBody } | { valid: false; error: string; status: number } {
  if (!body.sourceText || typeof body.sourceText !== "string") {
    return {
      valid: false,
      error: "sourceText is required and must be a string",
      status: 400,
    };
  }

  const trimmed = body.sourceText.trim();
  if (!trimmed) {
    return { valid: false, error: "sourceText cannot be empty", status: 400 };
  }

  if (trimmed.length > MAX_SOURCE_TEXT) {
    return {
      valid: false,
      error: `sourceText exceeds max length (${MAX_SOURCE_TEXT} chars)`,
      status: 400,
    };
  }

  if (body.examTrack && !VALID_TRACKS.includes(body.examTrack as ExamTrack)) {
    return {
      valid: false,
      error: `examTrack must be one of: ${VALID_TRACKS.join(", ")}`,
      status: 400,
    };
  }

  if (
    body.flashcardMode &&
    !VALID_MODES.includes(body.flashcardMode as FlashcardMode)
  ) {
    return {
      valid: false,
      error: `flashcardMode must be one of: ${VALID_MODES.join(", ")}`,
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
  if (!user) {
    return NextResponse.json(
      { error: "Sign in required to use Jade Tutor", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const aiCheck = await canPerformAIAction(user.id);
  if (!aiCheck.allowed) {
    return NextResponse.json(
      {
        error: `Daily Jade Tutor limit reached (${aiCheck.used}/${aiCheck.limit}). Upgrade for unlimited access.`,
        code: "ENTITLEMENT_LIMIT",
        upgradeRequired: true,
      },
      { status: 402 }
    );
  }

  const trackContext = await enforceJadeTrackContext(
    user.id,
    data.examTrack,
    "generate_flashcards"
  );
  if (!trackContext) {
    return NextResponse.json(
      { error: "Complete onboarding to set your exam track", code: "NO_TRACK" },
      { status: 400 }
    );
  }
  const examTrack = trackContext.track;

  const [retrieveResult, analytics] = await Promise.all([
    retrieveForFlashcards({
      query: data.sourceText!.trim(),
      examTrack,
      topicId: data.topicId,
      systemId: data.systemId,
      sourceType: data.sourceType,
      sourceId: data.sourceId,
    }),
    loadAnalyticsForJade(user.id),
  ]);
  const { context: retrievedContext } = retrieveResult;

  const adaptiveContext = analytics
    ? buildAdaptiveContext(analyticsToAdaptiveInput(analytics))
    : null;

  const result = await runGenerateFlashcards(
    {
      sourceText: data.sourceText!.trim(),
      examTrack,
      topicId: data.topicId,
      systemId: data.systemId,
      sourceType: data.sourceType,
      sourceId: data.sourceId,
      numberOfCards: data.numberOfCards,
      flashcardMode: (data.flashcardMode as FlashcardMode) ?? "standard",
    },
    {
      userId: user?.id,
      retrievedContext,
      adaptiveContext,
    }
  );

  const supabase = await createClient();
  await logAIInteraction(
    {
      userId: user.id,
      action: "generate_flashcards",
      track: examTrack,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      model: "gpt-4o-mini",
      contentRefs: data.sourceId ? [data.sourceId] : data.sourceType ? [data.sourceType] : undefined,
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
    savePayload: result.savePayload,
    usage:
      result.promptTokens != null
        ? {
            prompt_tokens: result.promptTokens,
            completion_tokens: result.completionTokens,
          }
        : undefined,
  });
}
