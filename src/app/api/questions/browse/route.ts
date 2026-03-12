/**
 * GET /api/questions/browse - Paginated question list with filters (track-scoped)
 * Query params: page, systemSlug, domainSlug, topicSlug, subtopicSlug, difficultyTier, itemTypeSlug
 */

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getPrimaryTrack } from "@/lib/auth/track";
import { loadQuestionsPage } from "@/lib/questions/loaders";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const primary = await getPrimaryTrack(user.id);
  const trackId = primary?.trackId ?? null;
  if (!trackId) return NextResponse.json({ error: "No track selected" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const systemSlug = searchParams.get("system") ?? undefined;
  const domainSlug = searchParams.get("domain") ?? undefined;
  const topicSlug = searchParams.get("topic") ?? undefined;
  const subtopicSlug = searchParams.get("subtopic") ?? undefined;
  const difficultyParam = searchParams.get("difficulty");
  const difficultyTier =
    difficultyParam != null
      ? Math.min(5, Math.max(1, parseInt(difficultyParam, 10) || 0)) || undefined
      : undefined;
  const itemTypeSlug = searchParams.get("itemType") ?? undefined;

  const filters = {
    systemSlug,
    domainSlug,
    topicSlug,
    subtopicSlug,
    difficultyTier: difficultyTier && difficultyTier >= 1 && difficultyTier <= 5 ? difficultyTier : undefined,
    itemTypeSlug,
  };

  const { questions, total, hasMore } = await loadQuestionsPage(trackId, filters, page);

  return NextResponse.json({ questions, total, hasMore, page });
}
