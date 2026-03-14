/**
 * GET /api/questions/browse - Paginated question list with filters (track-scoped)
 * Query params: page, systemSlug, domainSlug, topicSlug, subtopicSlug, difficultyTier, itemTypeSlug
 */

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getPrimaryTrack } from "@/lib/auth/track";
import { loadQuestionsPage } from "@/lib/questions/loaders";
import { LEARNER_VISIBLE_STATUSES, QUESTIONS_TRACK_COLUMN } from "@/config/content";

const DEV_LOG =
  process.env.NODE_ENV === "development" || process.env.DEBUG_LEARNER_CONTENT === "1";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const primary = await getPrimaryTrack(user.id);
  const trackId = primary?.trackId ?? null;
  const trackSlug = primary?.trackSlug ?? null;

  if (!trackId) {
    const noTrackDebug = DEV_LOG
      ? {
          debug: {
            userId: user.id,
            userEmail: user.email ?? undefined,
            resolvedTrackId: null,
            resolvedTrackSlug: null,
            supabaseProjectUrl:
              typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string"
                ? process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")
                : undefined,
            hint: "profiles.primary_exam_track_id not set or invalid",
          },
        }
      : {};
    if (DEV_LOG) {
      console.info("[questions:browse] no primary track", noTrackDebug.debug);
    }
    return NextResponse.json(
      {
        error: "No exam track selected",
        code: "NO_PRIMARY_TRACK",
        hint: "Complete onboarding to select your exam track.",
        ...noTrackDebug,
      },
      { status: 400 }
    );
  }

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

  let debug: Record<string, unknown> | undefined;
  let sessionUserId: string | null = null;
  if (DEV_LOG) {
    try {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      sessionUserId = user?.id ?? null;
    } catch {
      sessionUserId = null;
    }
  }
  if (DEV_LOG) {
    let totalLearnerVisibleForResolvedTrack: number | null = null;
    let totalLearnerVisibleAllTracks: number | null = null;
    let serviceRoleConfigured = false;
    try {
      const { createServiceClient } = await import("@/lib/supabase/service");
      const { isSupabaseServiceRoleConfigured } = await import("@/lib/supabase/env");
      serviceRoleConfigured = isSupabaseServiceRoleConfigured();
      if (serviceRoleConfigured) {
        const svc = createServiceClient();
        const [resolvedTrackCount, allTracksCount] = await Promise.all([
          svc
            .from("questions")
            .select("id", { count: "exact", head: true })
            .eq(QUESTIONS_TRACK_COLUMN, trackId)
            .in("status", [...LEARNER_VISIBLE_STATUSES]),
          svc
            .from("questions")
            .select("id", { count: "exact", head: true })
            .in("status", [...LEARNER_VISIBLE_STATUSES]),
        ]);
        totalLearnerVisibleForResolvedTrack = resolvedTrackCount.count ?? 0;
        totalLearnerVisibleAllTracks = allTracksCount.count ?? 0;
      }
    } catch (e) {
      totalLearnerVisibleForResolvedTrack = -1;
      totalLearnerVisibleAllTracks = -1;
      if (process.env.NODE_ENV === "development") {
        console.warn("[questions:browse] service-role diagnostic failed", e);
      }
    }

    const supabaseProjectUrl =
      typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string"
        ? process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")
        : undefined;

    const svcCount = totalLearnerVisibleForResolvedTrack ?? 0;
    const loaderCount = total;
    let failureMode: string;
    if (!user) {
      failureMode = "NO_SESSION";
    } else if (!trackId) {
      failureMode = "NO_PRIMARY_TRACK";
    } else if (!supabaseProjectUrl?.includes("supabase")) {
      failureMode = "WRONG_SUPABASE_PROJECT_OR_MISSING_URL";
    } else if (svcCount > 0 && loaderCount === 0) {
      failureMode = "RLS_BLOCKING";
    } else if (svcCount === 0 && loaderCount === 0) {
      failureMode = "NO_CONTENT_OR_TRACK_MISMATCH";
    } else if (svcCount > 0 && loaderCount > 0) {
      failureMode = "OK";
    } else {
      failureMode = "UNKNOWN";
    }

    debug = {
      userId: user.id,
      sessionUserId,
      sessionMatch: sessionUserId === user.id,
      userEmail: user.email ?? undefined,
      resolvedTrackId: trackId,
      resolvedTrackSlug: trackSlug ?? undefined,
      totalLearnerVisibleForResolvedTrack,
      totalLearnerVisibleAllTracks,
      learnerVisibleFromLoader: total,
      supabaseProjectUrl,
      serviceRoleConfigured,
      failureMode,
      filters: Object.fromEntries(Object.entries(filters).filter(([, v]) => v != null)),
      page,
    };

    console.info("[questions:browse]", debug);
  }

  const body: Record<string, unknown> = { questions, total, hasMore, page };
  if (debug) body.debug = debug;

  return NextResponse.json(body);
}
