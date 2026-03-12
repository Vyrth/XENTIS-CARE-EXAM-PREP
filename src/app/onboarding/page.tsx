import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { getProfile } from "@/lib/auth/profile";
import { getSubscription, isSubscriptionValid } from "@/lib/billing/subscription";
import { OnboardingFlow } from "./OnboardingFlow";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const params = await searchParams;
  const checkoutSuccess = params.checkout === "success";
  const user = await getSessionUser();
  const profile = user ? await getProfile(user.id) : null;
  const subscription = user ? await getSubscription(user.id) : null;
  const hasSubscription = isSubscriptionValid(subscription);

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
      <OnboardingFlow
        hasSubscription={hasSubscription}
        checkoutSuccess={checkoutSuccess}
        tracks={tracks ?? []}
        loadError={error?.message ?? null}
        initialTrackId={profile?.primary_exam_track_id ?? null}
        initialTargetDate={profile?.target_exam_date ?? null}
        initialStudyMinutes={profile?.study_minutes_per_day ?? null}
        initialStudyMode={profile?.preferred_study_mode ?? null}
      />
    </div>
  );
}
