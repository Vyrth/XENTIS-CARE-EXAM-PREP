/**
 * Weak Area Coach - POST /api/ai/weak-area-coach
 * Uses learner analytics to explain weaknesses and recommend next steps.
 * Track is resolved from signed-in user's primary track (hard constraint).
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { enforceJadeTrackContext } from "@/lib/ai/jade-track-context";
import { isOpenAIConfigured } from "@/lib/ai/openai-client";
import { runWeakAreaCoach } from "@/lib/ai/weak-area-coach";
import { retrieveForWeakAreaCoach } from "@/lib/ai/retrieval/retrieve-for-action";
import {
  buildAdaptiveContext,
  analyticsToAdaptiveInput,
} from "@/lib/readiness/adaptive-context";
import { logAIInteraction } from "@/lib/ai/logging";
import { canPerformAIAction } from "@/lib/billing/entitlements";
import type { ExamTrack, CoachingMode } from "@/lib/ai/weak-area-coach/types";

const VALID_TRACKS: ExamTrack[] = ["lvn", "rn", "fnp", "pmhnp"];
const VALID_MODES: CoachingMode[] = [
  "explain_weakness",
  "remediation_plan",
  "teach_from_zero",
  "exam_readiness",
  "mnemonic",
  "follow_up_questions",
];

interface WeakAreaInputBody {
  name?: string;
  percent?: number;
  targetPercent?: number;
  correct?: number;
  total?: number;
  type?: string;
}

interface RequestBody {
  userId?: string;
  examTrack?: string;
  weakSystems?: WeakAreaInputBody[];
  weakDomains?: WeakAreaInputBody[];
  weakSkills?: WeakAreaInputBody[];
  weakItemTypes?: WeakAreaInputBody[];
  readinessBand?: string;
  readinessScore?: number;
  recentMistakes?: string[];
  currentStudyPlan?: string;
  coachingMode?: string;
  /** When coaching a single area, e.g. "system:Cardiovascular" */
  focusAreaId?: string;
  /** Optional: overconfident/underconfident ranges, confidence calibration, study progress */
  overconfidentRanges?: string[];
  underconfidentRanges?: string[];
  confidenceCalibration?: number;
  studyGuideCompletion?: number;
  videoCompletion?: number;
  lastStudyMaterialsCompleted?: string[];
}

function normalizeWeakAreas(
  arr: WeakAreaInputBody[] | undefined
): { name: string; percent: number; targetPercent: number; correct: number; total: number }[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((a) => a && typeof a.name === "string" && typeof a.percent === "number")
    .map((a) => ({
      name: String(a.name),
      percent: Number(a.percent),
      targetPercent: Number(a.targetPercent ?? 80),
      correct: Number(a.correct ?? 0),
      total: Number(a.total ?? 0),
    }));
}

function validateRequest(
  body: RequestBody
): { valid: true; data: RequestBody } | { valid: false; error: string; status: number } {
  if (!body.userId || typeof body.userId !== "string") {
    return {
      valid: false,
      error: "userId is required and must be a string",
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

  if (
    body.coachingMode &&
    !VALID_MODES.includes(body.coachingMode as CoachingMode)
  ) {
    return {
      valid: false,
      error: `coachingMode must be one of: ${VALID_MODES.join(", ")}`,
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
  if (!user || user.id !== data.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    "weak_area_coaching"
  );
  if (!trackContext) {
    return NextResponse.json(
      { error: "Complete onboarding to set your exam track", code: "NO_TRACK" },
      { status: 400 }
    );
  }
  const examTrack = trackContext.track;

  const query = [
    ...normalizeWeakAreas(data.weakSystems).map((s) => s.name),
    ...normalizeWeakAreas(data.weakDomains).map((d) => d.name),
  ].join(" ");
  const { context: retrievedContext } = await retrieveForWeakAreaCoach({
    query: query || "weak areas nursing exam prep",
    examTrack,
  });

  const adaptiveInput = analyticsToAdaptiveInput({
    readinessScore: data.readinessScore,
    readinessBand: data.readinessBand,
    weakSystems: normalizeWeakAreas(data.weakSystems),
    weakDomains: normalizeWeakAreas(data.weakDomains),
    weakSkills: normalizeWeakAreas(data.weakSkills),
    weakItemTypes: normalizeWeakAreas(data.weakItemTypes),
    recentMistakes: data.recentMistakes,
    overconfidentRanges: data.overconfidentRanges,
    underconfidentRanges: data.underconfidentRanges,
    confidenceCalibration: data.confidenceCalibration,
    studyGuideCompletion: data.studyGuideCompletion,
    videoCompletion: data.videoCompletion,
    lastStudyMaterialsCompleted: data.lastStudyMaterialsCompleted,
  });
  const adaptiveContext = buildAdaptiveContext(adaptiveInput);

  const result = await runWeakAreaCoach(
    {
      userId: data.userId!,
      examTrack,
      weakSystems: normalizeWeakAreas(data.weakSystems),
      weakDomains: normalizeWeakAreas(data.weakDomains),
      weakSkills: normalizeWeakAreas(data.weakSkills),
      weakItemTypes: normalizeWeakAreas(data.weakItemTypes),
      readinessBand: data.readinessBand,
      recentMistakes: Array.isArray(data.recentMistakes) ? data.recentMistakes : undefined,
      currentStudyPlan: data.currentStudyPlan,
      coachingMode: (data.coachingMode as CoachingMode) ?? "explain_weakness",
    },
    {
      retrievedContext,
      adaptiveContext,
    }
  );

  const supabase = await createClient();
  const contentRefs = [
    ...normalizeWeakAreas(data.weakSystems).map((s) => `system:${s.name}`),
    ...normalizeWeakAreas(data.weakDomains).map((d) => `domain:${d.name}`),
    ...(data.focusAreaId ? [data.focusAreaId] : []),
  ].slice(0, 10);
  await logAIInteraction(
    {
      userId: user.id,
      action: "weak_area_coaching",
      track: examTrack,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      model: "gpt-4o-mini",
      contentRefs: contentRefs.length ? contentRefs : undefined,
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
    remediationSuggestions:
      adaptiveContext.remediationSuggestions?.length > 0
        ? adaptiveContext.remediationSuggestions
        : undefined,
    learnerProfile: adaptiveContext.learnerProfile,
    usage:
      result.promptTokens != null
        ? {
            prompt_tokens: result.promptTokens,
            completion_tokens: result.completionTokens,
          }
        : undefined,
  });
}
