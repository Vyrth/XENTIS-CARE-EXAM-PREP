import { getProfile } from "@/lib/auth/profile";
import { getSessionUser } from "@/lib/auth/session";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ActionTile } from "@/components/ui/ActionTile";
import { Icons } from "@/components/ui/icons";
import { MOCK_SYSTEMS } from "@/data/mock/systems";

export default async function StudyPlanPage() {
  const user = await getSessionUser();
  const profile = user ? await getProfile(user.id) : null;

  const targetDate = profile?.target_exam_date
    ? new Date(profile.target_exam_date)
    : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  const daysLeft = Math.ceil((targetDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  const studyMinutes = profile?.study_minutes_per_day ?? 60;

  const weeklyPlan = [
    { day: "Mon", planned: 60, actual: 45, done: true },
    { day: "Tue", planned: 60, actual: 60, done: true },
    { day: "Wed", planned: 60, actual: 30, done: true },
    { day: "Thu", planned: 60, actual: 0, done: false },
    { day: "Fri", planned: 60, actual: 0, done: false },
    { day: "Sat", planned: 90, actual: 0, done: false },
    { day: "Sun", planned: 60, actual: 0, done: false },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        Study Plan
      </h1>

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
            135 / 450 min
          </p>
          <ProgressBar value={30} size="sm" className="mt-2" />
        </Card>
      </div>

      <Card>
        <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
          This Week
        </h2>
        <div className="grid grid-cols-7 gap-2">
          {weeklyPlan.map((d) => (
            <div
              key={d.day}
              className={`p-3 rounded-xl text-center ${
                d.done ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-slate-50 dark:bg-slate-800/50"
              }`}
            >
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{d.day}</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">{d.actual}</p>
              <p className="text-xs text-slate-500">/ {d.planned} min</p>
            </div>
          ))}
        </div>
      </Card>

      <div>
        <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
          By System
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MOCK_SYSTEMS.map((sys, i) => (
            <ActionTile
              key={sys.id}
              href={`/study-guides/${sys.slug}`}
              title={sys.name}
              description="Study guide · Videos · Questions"
              icon={Icons["book-open"]}
              trackColor={["lvn", "rn", "fnp", "pmhnp"][i] as "lvn" | "rn" | "fnp" | "pmhnp"}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
