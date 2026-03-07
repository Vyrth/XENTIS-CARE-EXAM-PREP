import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  primary_exam_track_id: string | null;
  onboarding_completed_at: string | null;
  target_exam_date: string | null;
  study_minutes_per_day: number | null;
  preferred_study_mode: string | null;
  preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

/**
 * Get the current user's profile. Returns null if not authenticated.
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !data) return null;
  return data as Profile;
}

/**
 * Sync profile from auth user metadata. Called after OAuth sign-in.
 * Updates email, full_name, avatar_url if changed.
 */
export async function syncProfileFromAuth(userId: string, metadata: {
  email?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
}): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({
      email: metadata.email ?? undefined,
      full_name: metadata.full_name ?? undefined,
      avatar_url: metadata.avatar_url ?? undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
}

/**
 * Complete onboarding: set track, target date, study minutes, study mode.
 */
export async function completeOnboarding(
  userId: string,
  data: {
    exam_track_id: string;
    target_exam_date: string;
    study_minutes_per_day: number;
    preferred_study_mode: string;
  }
): Promise<{ error: Error | null }> {
  const supabase = await createClient();

  // Upsert user_exam_tracks
  const { error: trackError } = await supabase.from("user_exam_tracks").upsert(
    {
      user_id: userId,
      exam_track_id: data.exam_track_id,
    },
    { onConflict: "user_id,exam_track_id" }
  );

  if (trackError) return { error: trackError as unknown as Error };

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      primary_exam_track_id: data.exam_track_id,
      target_exam_date: data.target_exam_date,
      study_minutes_per_day: data.study_minutes_per_day,
      preferred_study_mode: data.preferred_study_mode,
      onboarding_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  return { error: profileError as unknown as Error ?? null };
}
