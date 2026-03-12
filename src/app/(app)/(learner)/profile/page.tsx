import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { getProfile } from "@/lib/auth/profile";
import { getSubscription } from "@/lib/billing/subscription";
import { Card } from "@/components/ui/Card";
import { ProfilePreferences } from "@/components/profile/ProfilePreferences";
import { StudyPreferencesForm } from "@/components/profile/StudyPreferencesForm";
import { TrialStatusIndicator } from "@/components/billing/TrialStatusIndicator";

export default async function ProfilePage() {
  const user = await getSessionUser();
  const profile = user ? await getProfile(user.id) : null;
  const subscription = user ? await getSubscription(user.id) : null;

  const periodEnd =
    subscription &&
    ((subscription as { current_period_end?: string })?.current_period_end ??
      (subscription as { currentPeriodEnd?: string })?.currentPeriodEnd);
  const isTrialing =
    subscription?.status === "trialing" &&
    periodEnd &&
    new Date(periodEnd) > new Date();

  const supabase = await createClient();
  const { data: tracks } = await supabase
    .from("exam_tracks")
    .select("id, slug, name")
    .order("display_order", { ascending: true });

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        Profile & Preferences
      </h1>

      {isTrialing && periodEnd && (
        <TrialStatusIndicator
          trialEndDate={periodEnd}
          showUpgradeCta={true}
          variant="compact"
        />
      )}

      <Card>
        <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
          Account
        </h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Name
            </label>
            <p className="text-slate-900 dark:text-white">
              {profile?.full_name ?? "—"}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Email
            </label>
            <p className="text-slate-900 dark:text-white">
              {profile?.email ?? user?.email ?? "—"}
            </p>
          </div>
        </div>
      </Card>

      <StudyPreferencesForm
        currentTrackId={profile?.primary_exam_track_id ?? null}
        targetExamDate={profile?.target_exam_date ?? null}
        studyMinutesPerDay={profile?.study_minutes_per_day ?? null}
        preferredStudyMode={profile?.preferred_study_mode ?? null}
        tracks={tracks ?? []}
      />

      <ProfilePreferences />
    </div>
  );
}
