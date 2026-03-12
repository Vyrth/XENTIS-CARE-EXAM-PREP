/**
 * GET /api/adaptive/config?examTrackId=xxx - Load adaptive config for track
 */

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/service";
import { userHasTrackAccess } from "@/lib/adaptive/api-helpers";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const examTrackId = searchParams.get("examTrackId");
  if (!examTrackId) return NextResponse.json({ error: "examTrackId required" }, { status: 400 });

  const hasAccess = await userHasTrackAccess(user.id, examTrackId);
  if (!hasAccess) return NextResponse.json({ error: "Track not available" }, { status: 403 });

  const supabase = createServiceClient();
  const { data: configs, error } = await supabase
    .from("adaptive_exam_configs")
    .select("id, slug, name, description, min_questions, max_questions, target_standard_error, passing_theta")
    .eq("exam_track_id", examTrackId)
    .order("slug", { ascending: true });

  if (error) return NextResponse.json({ error: "Failed to load config" }, { status: 500 });

  return NextResponse.json({
    configs: (configs ?? []).map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description,
      minQuestions: c.min_questions ?? 75,
      maxQuestions: c.max_questions ?? 150,
      targetStandardError: c.target_standard_error ?? 0.3,
      passingTheta: c.passing_theta ?? 0,
    })),
  });
}
