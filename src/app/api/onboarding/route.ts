import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/session";
import { completeOnboarding } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";

const VALID_SLUGS = ["lvn", "rn", "fnp", "pmhnp"] as const;

async function resolveExamTrackId(value: string): Promise<string | null> {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(value)) return value;

  const slug = value.toLowerCase().trim();
  if (!VALID_SLUGS.includes(slug as (typeof VALID_SLUGS)[number])) return null;

  if (isSupabaseServiceRoleConfigured()) {
    const serviceSupabase = createServiceClient();
    const { data } = await serviceSupabase
      .from("exam_tracks")
      .select("id")
      .eq("slug", slug)
      .single();
    return data?.id ?? null;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("exam_tracks")
    .select("id")
    .eq("slug", slug)
    .single();

  return data?.id ?? null;
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[onboarding API] Unauthorized: no session");
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    exam_track_id?: string;
    target_exam_date?: string;
    study_minutes_per_day?: number;
    preferred_study_mode?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  let { exam_track_id, target_exam_date, study_minutes_per_day, preferred_study_mode } = body;

  study_minutes_per_day =
    typeof study_minutes_per_day === "number"
      ? study_minutes_per_day
      : typeof study_minutes_per_day === "string"
        ? parseInt(study_minutes_per_day, 10)
        : undefined;

  if (process.env.NODE_ENV === "development") {
    console.log("[onboarding API] request body", {
      exam_track_id,
      target_exam_date,
      study_minutes_per_day,
      preferred_study_mode,
    });
  }

  if (
    !exam_track_id ||
    !target_exam_date ||
    typeof study_minutes_per_day !== "number" ||
    Number.isNaN(study_minutes_per_day) ||
    !preferred_study_mode
  ) {
    const msg =
      "Missing required fields: exam_track_id, target_exam_date, study_minutes_per_day, preferred_study_mode";
    if (process.env.NODE_ENV === "development") {
      console.warn("[onboarding API] validation failed:", msg);
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  if (study_minutes_per_day < 15 || study_minutes_per_day > 480) {
    return NextResponse.json(
      { error: "study_minutes_per_day must be between 15 and 480" },
      { status: 400 }
    );
  }

  const resolvedTrackId = await resolveExamTrackId(exam_track_id);
  if (!resolvedTrackId) {
    return NextResponse.json(
      { error: "Invalid exam track. Please select LVN/LPN, RN, FNP, or PMHNP." },
      { status: 400 }
    );
  }

  const { error } = await completeOnboarding(user.id, {
    exam_track_id: resolvedTrackId,
    target_exam_date,
    study_minutes_per_day,
    preferred_study_mode,
  });

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[onboarding API] completeOnboarding failed:", error);
    }
    return NextResponse.json(
      { error: error.message ?? "Failed to save onboarding" },
      { status: 500 }
    );
  }

  if (process.env.NODE_ENV === "development") {
    console.log("[onboarding API] save success for user", user.id);
  }

  // Trial is now created in plan selection step (POST /api/onboarding/select-plan).
  // Paid subscriptions are created via Stripe webhook.

  revalidatePath("/dashboard");
  revalidatePath("/(app)");

  return NextResponse.json({ success: true });
}
