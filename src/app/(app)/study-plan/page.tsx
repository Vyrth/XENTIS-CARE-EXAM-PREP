import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/profile";
import { getSessionUser } from "@/lib/auth/session";
import { getPrimaryTrack } from "@/lib/auth/track";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ActionTile } from "@/components/ui/ActionTile";
import { Icons } from "@/components/ui/icons";
import { loadSystemsForTrack } from "@/lib/questions";
import { loadDashboardStats } from "@/lib/dashboard/loaders";
import { StudyPlanForm } from "@/components/study/StudyPlanForm";

export default async function StudyPlanPage() {
  const user = await getSessionUser();
  const profile = user ? await getProfile(user.id) : null;
  const primary = await getPrimaryTrack(user?.id ?? null);
  const trackId = primary?.trackId ?? null;
  const track = primary?.trackSlug ?? "rn";
  const systemsForTrack = await loadSystemsForTrack(trackId);

  const supabase = await createClient();
  const { data: tracks } = await supabase
    .from("exam_tracks")
    .select("id, slug, name")
    .order("display_order", { ascending: true });

  const targetDate = profile?.target_exam_date
    ? new Date(profile.target_exam_date)
    : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  const daysLeft = Math.ceil((targetDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  const studyMinutes = profile?.study_minutes_per_day ?? 0;

  const stats = await loadDashboardStats(user?.id ?? null, trackId, studyMinutes);
  const weeklyTotal = studyMinutes * 7;
  const weeklyActual = stats.studyMinutesToday; // Simplified: only today; full week would need user_streaks by day
  const weeklyPct = weeklyTotal > 0 ? Math.floor((weeklyActual / weeklyTotal) * 100) : 0;

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        Study Plan
      </h1>

      <StudyPlanForm
        currentTrackId={profile?.primary_exam_track_id ?? null}
        targetExamDate={profile?.target_exam_date ?? null}
        studyMinutesPerDay={profile?.study_minutes_per_day ?? null}
        preferredStudyMode={profile?.preferred_study_mode ?? null}
        tracks={tracks ?? []}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <p className="text-sm text-slate-500 dark:text-slate-400">Days to exam</p>
          <p className="text-3xl font-heading font-bold text-slate-900 dark:text-white">
            {daysLeft}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Target: {targetDate.toLocaleDateString()}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500 dark:text-slate-400">Daily goal</p>
          <p className="text-3xl font-heading font-bold text-slate-900 dark:text-white">
            {studyMinutes} min
          </p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500 dark:text-slate-400">This week</p>
          <p className="text-3xl font-heading font-bold text-slate-900 dark:text-white">
            {weeklyActual} / {weeklyTotal} min
          </p>
          <ProgressBar value={Math.min(100, weeklyPct)} size="sm" className="mt-2" />
        </Card>
      </div>

      <Card>
        <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
          This Week
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Weekly activity tracking coming soon. Today: {stats.studyMinutesToday} min studied.
        </p>
      </Card>

      <div>
        <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
          By System
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {systemsForTrack.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 col-span-full">
              No content available yet for your track.
            </p>
          ) : (
            systemsForTrack.map((sys) => (
              <ActionTile
                key={sys.id}
                href={`/study-guides/${sys.slug}`}
                title={sys.name}
                description="Study guide · Videos · Questions"
                icon={Icons["book-open"]}
                trackColor={track}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
