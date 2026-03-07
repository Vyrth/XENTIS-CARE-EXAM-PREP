/**
 * Current user profile - returns track slug for client components
 */
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ track: "rn" }, { status: 200 });
  }
  const profile = await getProfile(user.id);
  const trackId = profile?.primary_exam_track_id;
  if (!trackId) return NextResponse.json({ track: "rn" }, { status: 200 });
  const supabase = await createClient();
  const { data } = await supabase
    .from("exam_tracks")
    .select("slug")
    .eq("id", trackId)
    .single();
  const track = data?.slug ?? "rn";
  return NextResponse.json({ track });
}
