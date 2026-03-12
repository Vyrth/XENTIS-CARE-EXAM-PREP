/**
 * Profile API - update study preferences (track, target date, study minutes, study mode).
 * Persists to Supabase profiles table.
 */
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/session";
import { updateStudyPreferences } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";

const VALID_SLUGS = ["lvn", "rn", "fnp", "pmhnp"] as const;

async function resolveExamTrackId(value: string): Promise<string | null> {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(value)) return value;

  const slug = value.toLowerCase().trim();
  if (!VALID_SLUGS.includes(slug as (typeof VALID_SLUGS)[number])) return null;

  const supabase = isSupabaseServiceRoleConfigured()
    ? createServiceClient()
    : await createClient();
  const { data } = await supabase
    .from("exam_tracks")
    .select("id")
    .eq("slug", slug)
    .single();
  return data?.id ?? null;
}

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    exam_track_id?: string;
    target_exam_date?: string | null;
    study_minutes_per_day?: number | null;
    preferred_study_mode?: string | null;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const updates: Parameters<typeof updateStudyPreferences>[1] = {};

  if (body.exam_track_id !== undefined) {
    if (!body.exam_track_id || typeof body.exam_track_id !== "string") {
      return NextResponse.json(
        { error: "exam_track_id must be a non-empty string" },
        { status: 400 }
      );
    }
    const resolvedId = await resolveExamTrackId(body.exam_track_id);
    if (!resolvedId) {
      return NextResponse.json(
        { error: "Invalid exam track. Select LVN/LPN, RN, FNP, or PMHNP." },
        { status: 400 }
      );
    }
    updates.exam_track_id = resolvedId;
  }

  if (body.target_exam_date !== undefined) {
    updates.target_exam_date = body.target_exam_date;
  }

  if (body.study_minutes_per_day !== undefined) {
    const v = body.study_minutes_per_day;
    if (v !== null && (typeof v !== "number" || Number.isNaN(v) || v < 0 || v > 480)) {
      return NextResponse.json(
        { error: "study_minutes_per_day must be 0–480 or null" },
        { status: 400 }
      );
    }
    updates.study_minutes_per_day = v;
  }

  if (body.preferred_study_mode !== undefined) {
    const valid = ["focused", "mixed", "review"].includes(
      String(body.preferred_study_mode ?? "").toLowerCase()
    );
    if (body.preferred_study_mode && !valid) {
      return NextResponse.json(
        { error: "preferred_study_mode must be focused, mixed, or review" },
        { status: 400 }
      );
    }
    updates.preferred_study_mode = body.preferred_study_mode;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    );
  }

  const { error } = await updateStudyPreferences(user.id, updates);

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[profile API] updateStudyPreferences failed:", error);
    }
    return NextResponse.json(
      { error: error.message ?? "Failed to save" },
      { status: 500 }
    );
  }

  revalidatePath("/dashboard");
  revalidatePath("/study-plan");
  revalidatePath("/profile");
  revalidatePath("/(app)");

  return NextResponse.json({ success: true });
}
