import { Card } from "@/components/ui/Card";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";

async function loadMasteryTargets() {
  if (!isSupabaseServiceRoleConfigured()) return [];
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("system_mastery_targets")
    .select("id, exam_track_id, system_id, target_pct, exam_tracks(slug, name), systems(name)")
    .order("exam_track_id");
  return data ?? [];
}

export default async function MasteryRuleManagerPage() {
  const targets = await loadMasteryTargets();

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        Mastery Rule Manager
      </h1>
      <p className="text-slate-600 dark:text-slate-400">
        Define mastery thresholds by system or domain. Used for adaptive recommendations and progress tracking.
      </p>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left p-4 text-sm font-medium text-slate-500">Track</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">System</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Target %</th>
              </tr>
            </thead>
            <tbody>
              {targets.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-slate-500 dark:text-slate-400">
                    No mastery targets configured. Add rules via system_mastery_targets or seed.
                  </td>
                </tr>
              ) : (
                targets.map((t: Record<string, unknown>) => {
                  const track = Array.isArray(t.exam_tracks) ? t.exam_tracks[0] : t.exam_tracks;
                  const sys = Array.isArray(t.systems) ? t.systems[0] : t.systems;
                  return (
                    <tr key={String(t.id)} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-4 font-medium text-slate-900 dark:text-white">
                        {(track as { slug?: string })?.slug ?? "—"}
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-400">
                        {(sys as { name?: string })?.name ?? "—"}
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-400">
                        {typeof t.target_pct === "number" ? `${t.target_pct}%` : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-sm text-slate-500 dark:text-slate-400">
        Mastery targets are stored in system_mastery_targets. Add via SQL or a future admin form.
      </p>
    </div>
  );
}
