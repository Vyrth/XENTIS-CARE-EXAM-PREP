import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { getProfile } from "@/lib/auth/profile";
import { OnboardingForm } from "./OnboardingForm";
import { TrialMessaging } from "@/components/billing/TrialMessaging";

export default async function OnboardingPage() {
  const user = await getSessionUser();
  const profile = user ? await getProfile(user.id) : null;

  const supabase = await createClient();
  const { data: tracks, error } = await supabase
    .from("exam_tracks")
    .select("id, slug, name")
    .order("display_order", { ascending: true });

  if (process.env.NODE_ENV === "development" && error) {
    console.warn(
      "[onboarding] exam_tracks load failed:",
      error.message,
      "| code:",
      error.code,
      "| details:",
      JSON.stringify(error.details)
    );
  }
  if (process.env.NODE_ENV === "development" && (!tracks || tracks.length === 0) && !error) {
    console.warn(
      "[onboarding] exam_tracks returned empty (RLS or empty table). Client will retry via /api/exam-tracks."
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Set up your study plan
          </h1>
          <p className="mt-2 text-sm text-slate-800 dark:text-slate-200">
            We&apos;ll personalize your experience
          </p>
          <TrialMessaging className="mt-4 text-left" />
        </div>

        <OnboardingForm
          tracks={tracks ?? []}
          loadError={error?.message ?? null}
          initialTrackId={profile?.primary_exam_track_id ?? null}
          initialTargetDate={profile?.target_exam_date ?? null}
          initialStudyMinutes={profile?.study_minutes_per_day ?? null}
          initialStudyMode={profile?.preferred_study_mode ?? null}
        />
      </div>
    </div>
  );
}
