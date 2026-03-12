import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { TrackBadge } from "@/components/admin/TrackBadge";
import { AdminTrackFilter } from "@/components/admin/AdminTrackFilter";
import { loadAdminBundles, loadExamTracks } from "@/lib/admin/loaders";

type Props = { searchParams: Promise<{ trackId?: string }> };

export default async function SystemBundleManagerPage({ searchParams }: Props) {
  const { trackId } = await searchParams;
  const [bundles, tracks] = await Promise.all([
    loadAdminBundles(trackId || null),
    loadExamTracks(),
  ]);

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
            System Bundle Manager
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manage system bundles: study guides, videos, questions, and flashcards grouped by system. Each bundle is track-specific.
          </p>
        </div>
        <AdminTrackFilter tracks={tracks} selectedTrackId={trackId} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {bundles.length === 0 ? (
          <div className="col-span-2 p-8 text-center text-slate-500 rounded-xl border border-dashed border-slate-300 dark:border-slate-600">
            No bundles found. {trackId ? "Try a different track filter." : "Create bundles in the curriculum."}
          </div>
        ) : (
          bundles.map((bundle) => (
            <Card key={bundle.id}>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-heading font-semibold text-slate-900 dark:text-white">
                    {bundle.name}
                  </h2>
                  <TrackBadge slug={bundle.examTrackSlug} className="mt-2" />
                  <p className="text-sm text-slate-500 mt-2">
                    {bundle.systemName ?? "General"}
                  </p>
                </div>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Edit
                </button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
