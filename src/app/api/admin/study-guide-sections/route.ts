/**
 * GET /api/admin/study-guide-sections?trackId=...
 * Returns study guide sections for import (admin only).
 */

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/admin";
import { loadStudyGuideSectionsForImport } from "@/lib/admin/flashcard-studio-loaders";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userIsAdmin = await isAdmin(user.id);
  if (!userIsAdmin) {
    return NextResponse.json({ error: "Admin required" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const trackId = searchParams.get("trackId");

  const sections = await loadStudyGuideSectionsForImport(trackId);
  return NextResponse.json({ sections });
}
