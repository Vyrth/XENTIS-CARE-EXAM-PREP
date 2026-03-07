import { getSessionUser } from "@/lib/auth/session";
import { getProfile } from "@/lib/auth/profile";
import { Card } from "@/components/ui/Card";
import { ProfilePreferences } from "@/components/profile/ProfilePreferences";

export default async function ProfilePage() {
  const user = await getSessionUser();
  const profile = user ? await getProfile(user.id) : null;

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        Profile & Preferences
      </h1>

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
          <div>
            <label className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Target Exam Date
            </label>
            <p className="text-slate-900 dark:text-white">
              {profile?.target_exam_date
                ? new Date(profile.target_exam_date).toLocaleDateString()
                : "—"}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Study Goal
            </label>
            <p className="text-slate-900 dark:text-white">
              {profile?.study_minutes_per_day ?? "—"} min/day
            </p>
          </div>
        </div>
      </Card>

      <ProfilePreferences />
    </div>
  );
}
