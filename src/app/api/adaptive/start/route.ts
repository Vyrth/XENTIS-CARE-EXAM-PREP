/**
 * POST /api/adaptive/start - Start a new adaptive exam session
 * Body: { examTrackId: string, configSlug?: string }
 * Returns: { sessionId: string }
 */

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { createAdaptiveExamSession } from "@/lib/adaptive/adaptive-session";
import { userHasTrackAccess, logAdaptiveEvent } from "@/lib/adaptive/api-helpers";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { examTrackId?: string; configSlug?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const examTrackId = typeof body.examTrackId === "string" ? body.examTrackId.trim() : "";
    if (!examTrackId || !UUID_REGEX.test(examTrackId)) {
      return NextResponse.json({ error: "examTrackId is required and must be a valid UUID" }, { status: 400 });
    }

    const hasAccess = await userHasTrackAccess(user.id, examTrackId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Track not available for this user" }, { status: 403 });
    }

    const result = await createAdaptiveExamSession({
      userId: user.id,
      examTrackId,
      configSlug: body.configSlug ?? null,
    });

    if (!result.success) {
      logAdaptiveEvent("start_failed", "", user.id, { error: result.error });
      const status = result.error?.includes("No adaptive config") ? 404 : 500;
      return NextResponse.json({ error: result.error ?? "Failed to create session" }, { status });
    }

    logAdaptiveEvent("session_started", result.sessionId!, user.id, { examTrackId });

    return NextResponse.json({ sessionId: result.sessionId });
  } catch (e) {
    console.error("[adaptive/start]", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
