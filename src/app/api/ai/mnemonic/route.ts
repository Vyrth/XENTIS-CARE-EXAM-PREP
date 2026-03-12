/**
 * Mnemonic Generator - POST /api/ai/mnemonic
 * Creates memorable mnemonics for board-focused concepts.
 * Track is resolved from signed-in user's primary track (hard constraint).
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { enforceJadeTrackContext } from "@/lib/ai/jade-track-context";
import { loadAnalyticsForJade } from "@/lib/ai/jade-analytics";
import { isOpenAIConfigured } from "@/lib/ai/openai-client";
import { runMnemonic } from "@/lib/ai/mnemonic";
import { retrieveForMnemonic } from "@/lib/ai/retrieval/retrieve-for-action";
import {
  buildAdaptiveContext,
  analyticsToAdaptiveInput,
} from "@/lib/readiness/adaptive-context";
import { logAIInteraction } from "@/lib/ai/logging";
import { canPerformAIAction } from "@/lib/billing/entitlements";
import type { ExamTrack, MnemonicStyle } from "@/lib/ai/mnemonic/types";

const VALID_TRACKS: ExamTrack[] = ["lvn", "rn", "fnp", "pmhnp"];
const VALID_STYLES: MnemonicStyle[] = [
  "acronym",
  "phrase",
  "story",
  "visual_hook",
  "compare_contrast",
];
const MAX_SELECTED_TEXT = 2000;

interface AnalyticsPayload {
  readinessScore?: number;
  readinessBand?: string;
  weakSystems?: { name: string; percent?: number }[];
  weakSkills?: { name: string; percent?: number }[];
  weakItemTypes?: { name: string; percent?: number }[];
  overconfidentRanges?: string[];
  underconfidentRanges?: string[];
  confidenceCalibration?: number;
}

interface RequestBody {
  selectedText?: string;
  conceptTitle?: string;
  examTrack?: string;
  topicId?: string;
  systemId?: string;
  sourceType?: string;
  sourceId?: string;
  mnemonicStyle?: string;
  analytics?: AnalyticsPayload;
}

function validateRequest(
  body: RequestBody
): { valid: true; data: RequestBody } | { valid: false; error: string; status: number } {
  if (!body.selectedText || typeof body.selectedText !== "string") {
    return {
      valid: false,
      error: "selectedText is required and must be a string",
      status: 400,
    };
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

  if (body.examTrack && !VALID_TRACKS.includes(body.examTrack as ExamTrack)) {
    return {
      valid: false,
      error: `examTrack must be one of: ${VALID_TRACKS.join(", ")}`,
      status: 400,
    };
  }

  if (
    body.mnemonicStyle &&
    !VALID_STYLES.includes(body.mnemonicStyle as MnemonicStyle)
  ) {
    return {
      valid: false,
      error: `mnemonicStyle must be one of: ${VALID_STYLES.join(", ")}`,
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
    "generate_mnemonic"
  );
  if (!trackContext) {
    return NextResponse.json(
      { error: "Complete onboarding to set your exam track", code: "NO_TRACK" },
      { status: 400 }
    );
  }
  const examTrack = trackContext.track;

  const [retrieveResult, analytics] = await Promise.all([
    retrieveForMnemonic({
      query: data.selectedText!.trim(),
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

  const result = await runMnemonic(
    {
      selectedText: data.selectedText!.trim(),
      conceptTitle: data.conceptTitle?.trim(),
      examTrack,
      topicId: data.topicId,
      systemId: data.systemId,
      sourceType: data.sourceType,
      sourceId: data.sourceId,
      mnemonicStyle: (data.mnemonicStyle as MnemonicStyle) ?? "phrase",
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
      action: "generate_mnemonic",
      track: examTrack,
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
