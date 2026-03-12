import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";

/**
 * GET /api/exam-tracks
 * Returns exam tracks for onboarding dropdown.
 * Tries user-scoped client first; falls back to service role if empty (bypasses RLS).
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: tracks, error } = await supabase
      .from("exam_tracks")
      .select("id, slug, name")
      .order("display_order", { ascending: true });

    if (error) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[api/exam-tracks] user-scoped fetch failed:",
          error.message,
          "| code:",
          error.code,
          "| details:",
          JSON.stringify(error.details)
        );
      }
    }

    if (tracks && tracks.length > 0) {
      return NextResponse.json(tracks);
    }

    if (isSupabaseServiceRoleConfigured()) {
      const serviceSupabase = createServiceClient();
      const { data: serviceTracks, error: serviceError } = await serviceSupabase
        .from("exam_tracks")
        .select("id, slug, name")
        .order("display_order", { ascending: true });

      if (serviceError) {
        if (process.env.NODE_ENV === "development") {
          console.error(
            "[api/exam-tracks] service-role fetch failed:",
            serviceError.message,
            "| code:",
            serviceError.code,
            "| details:",
            JSON.stringify(serviceError.details)
          );
        }
        return NextResponse.json(
          { error: serviceError.message },
          { status: 500 }
        );
      }

      return NextResponse.json(serviceTracks ?? []);
    }

    return NextResponse.json([]);
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[api/exam-tracks] unexpected error:", err);
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load exam tracks" },
      { status: 500 }
    );
  }
}
