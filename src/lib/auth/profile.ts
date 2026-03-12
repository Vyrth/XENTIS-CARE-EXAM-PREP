import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";

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
 * Uses service role when available to ensure write succeeds (bypasses RLS/session quirks).
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
  const supabase = isSupabaseServiceRoleConfigured()
    ? createServiceClient()
    : await createClient();

  const { error: trackError } = await supabase.from("user_exam_tracks").upsert(
    {
      user_id: userId,
      exam_track_id: data.exam_track_id,
    },
    { onConflict: "user_id,exam_track_id" }
  );

  if (trackError) {
    if (process.env.NODE_ENV === "development") {
      console.error("[profile] user_exam_tracks upsert failed:", trackError);
    }
    return { error: trackError as unknown as Error };
  }

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

  if (profileError) {
    if (process.env.NODE_ENV === "development") {
      console.error("[profile] profiles update failed:", profileError);
    }
    return { error: profileError as unknown as Error };
  }

  return { error: null };
}

/**
 * Update study preferences (track, target date, study minutes, study mode).
 * Used by study plan form and profile preferences.
 * Persists to profiles table; optionally syncs user_exam_tracks.
 */
export async function updateStudyPreferences(
  userId: string,
  data: {
    exam_track_id?: string;
    target_exam_date?: string | null;
    study_minutes_per_day?: number | null;
    preferred_study_mode?: string | null;
  }
): Promise<{ error: Error | null }> {
  const supabase = isSupabaseServiceRoleConfigured()
    ? createServiceClient()
    : await createClient();

  if (data.exam_track_id) {
    const { error: trackError } = await supabase.from("user_exam_tracks").upsert(
      {
        user_id: userId,
        exam_track_id: data.exam_track_id,
      },
      { onConflict: "user_id,exam_track_id" }
    );
    if (trackError) {
      if (process.env.NODE_ENV === "development") {
        console.error("[profile] user_exam_tracks upsert failed:", trackError);
      }
      return { error: trackError as unknown as Error };
    }
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (data.exam_track_id !== undefined) updates.primary_exam_track_id = data.exam_track_id;
  if (data.target_exam_date !== undefined) updates.target_exam_date = data.target_exam_date;
  if (data.study_minutes_per_day !== undefined) updates.study_minutes_per_day = data.study_minutes_per_day;
  if (data.preferred_study_mode !== undefined) updates.preferred_study_mode = data.preferred_study_mode;

  const { error } = await supabase.from("profiles").update(updates).eq("id", userId);

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[profile] updateStudyPreferences failed:", error);
    }
    return { error: error as unknown as Error };
  }
  return { error: null };
}
