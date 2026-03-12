/**
 * GET /api/exam/session?examId=xxx - Load exam session from DB (for rationale/review when localStorage empty)
 * Returns questionIds, responses, flags for the given client exam ID.
 */

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { loadExamSession } from "@/app/(app)/actions/exam";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const examId = searchParams.get("examId");
  if (!examId) return NextResponse.json({ error: "Missing examId" }, { status: 400 });

  const { session, error } = await loadExamSession(examId, user.id);
  if (error || !session) {
    return NextResponse.json({ error: error ?? "Session not found" }, { status: 404 });
  }

  return NextResponse.json({
    questionIds: session.questionIds,
    responses: session.responses,
    flags: Array.from(session.flags),
    completedAt: session.completedAt,
  });
}
