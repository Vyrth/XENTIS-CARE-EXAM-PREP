/**
 * GET /api/questions/ids - Fetch question IDs for exam (track-scoped)
 * Entitlement: Free users limited to questionsPerDay (e.g. 25/day)
 * Query params: trackId (required), mode, systemSlug, systemId, domainSlug, topicSlug, limit, seed
 */

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getPrimaryTrack } from "@/lib/auth/track";
import { canAnswerQuestions } from "@/lib/billing/entitlements";
import { PRE_PRACTICE_CONFIG, READINESS_CONFIG } from "@/types/exam";
import { SYSTEM_EXAM_PRACTICE_IDEAL_QUESTIONS } from "@/config/exam";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const primary = await getPrimaryTrack(user.id);
  const trackId = primary?.trackId ?? null;
  if (!trackId) return NextResponse.json({ error: "No track selected" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode") ?? "pre_practice";
  const systemSlug = searchParams.get("systemSlug") ?? undefined;
  const systemId = searchParams.get("systemId") ?? undefined;
  const domainSlug = searchParams.get("domainSlug") ?? undefined;
  const topicSlug = searchParams.get("topicSlug") ?? undefined;
  const seed = parseInt(searchParams.get("seed") ?? "0", 10) || 0;
  const limitParam = searchParams.get("limit");

  const prePracticeVersion = /^pre_practice_(i|ii|iii|iv|v)$/.exec(mode)?.[1];
  const baseMode = prePracticeVersion ? "pre_practice" : mode;

  let limit: number;
  if (limitParam) {
    limit = parseInt(limitParam, 10) || 20;
  } else {
    switch (baseMode) {
      case "pre_practice":
        limit = PRE_PRACTICE_CONFIG.questionCount;
        break;
      case "readiness":
        limit = READINESS_CONFIG.questionCount;
        break;
      case "system":
      case "custom_quiz":
        limit = SYSTEM_EXAM_PRACTICE_IDEAL_QUESTIONS;
        break;
      default:
        limit = 20;
    }
  }

  // Entitlement: cap limit for free users by daily question allowance
  const qCheck = await canAnswerQuestions(user.id);
  if (!qCheck.allowed) {
    return NextResponse.json(
      {
        error: `Daily question limit reached (${qCheck.used}/${qCheck.limit}). Upgrade for unlimited access.`,
        code: "ENTITLEMENT_LIMIT",
        upgradeRequired: true,
      },
      { status: 402 }
    );
  }
  const effectiveLimit = Math.min(limit, qCheck.limit - qCheck.used);

  const { loadQuestionIds, loadQuestionIdsForPrePracticeVersion } = await import("@/lib/questions/loaders");

  const ids = prePracticeVersion
    ? await loadQuestionIdsForPrePracticeVersion(trackId, prePracticeVersion, effectiveLimit, seed)
    : await loadQuestionIds(
        trackId,
        { systemSlug, systemId, domainSlug, topicSlug },
        effectiveLimit,
        seed
      );

  return NextResponse.json({ ids });
}
