import Link from "next/link";
import { loadLaunchReadinessByTrack } from "@/lib/admin/launch-readiness";
import { LaunchReadinessCard } from "@/components/admin/LaunchReadinessCard";

export default async function LaunchReadinessPage() {
  const readiness = await loadLaunchReadinessByTrack();

  const blockedTracks = readiness.filter((r) => r.overallStatus === "blocked");
  const partialTracks = readiness.filter((r) => r.overallStatus === "partial");
  const readyTracks = readiness.filter((r) => r.overallStatus === "ready");

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
          Launch Readiness Checklist
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Per-track readiness for beta or launch. Expand each track to see details and blocked-item drill-down.
        </p>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="px-4 py-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200">
          <span className="font-bold">{readyTracks.length}</span> ready
        </div>
        <div className="px-4 py-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200">
          <span className="font-bold">{partialTracks.length}</span> partial
        </div>
        <div className="px-4 py-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200">
          <span className="font-bold">{blockedTracks.length}</span> blocked
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="font-medium text-slate-900 dark:text-white">Tracks</h2>
        {readiness.length === 0 ? (
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-12 text-center">
            <p className="text-slate-500">No exam tracks found. Seed exam_tracks to see readiness.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {readiness.map((r) => (
              <LaunchReadinessCard
                key={r.trackId}
                readiness={r}
                defaultExpanded={r.overallStatus === "blocked"}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-4">
        <Link
          href="/admin/ai-factory"
          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          AI Content Factory →
        </Link>
        <Link
          href="/admin/content-inventory"
          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          Content inventory →
        </Link>
        <Link
          href="/admin/batch-planner"
          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          Batch planner →
        </Link>
        <Link
          href="/admin"
          className="text-sm text-slate-600 dark:text-slate-400 hover:underline"
        >
          ← Back to Admin
        </Link>
      </div>
    </div>
  );
}
