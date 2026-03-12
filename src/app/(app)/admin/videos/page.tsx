import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { TrackBadge } from "@/components/admin/TrackBadge";
import { AdminTrackFilter } from "@/components/admin/AdminTrackFilter";
import { loadAdminVideos, loadExamTracks } from "@/lib/admin/loaders";
import { Icons } from "@/components/ui/icons";
import type { WorkflowStatus } from "@/types/admin";

type Props = { searchParams: Promise<{ trackId?: string }> };

export default async function VideoManagerPage({ searchParams }: Props) {
  const { trackId } = await searchParams;
  const [videos, tracks] = await Promise.all([
    loadAdminVideos(trackId || null),
    loadExamTracks(),
  ]);

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
            Video Manager
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manage video lessons. Link to Media Rights for licensing. Every video must be assigned to a track.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <AdminTrackFilter tracks={tracks} selectedTrackId={trackId} />
          <Link
            href="/admin/videos/new"
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 shrink-0"
          >
            + New Video
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {videos.length === 0 ? (
          <div className="col-span-2 p-8 text-center text-slate-500 rounded-xl border border-dashed border-slate-300 dark:border-slate-600">
            No videos found. {trackId ? "Try a different track filter." : "Create your first video."}
          </div>
        ) : (
          videos.map((v) => (
            <Card key={v.id}>
              <div className="flex gap-4">
                <div className="w-24 h-16 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                  {Icons.video}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-heading font-semibold text-slate-900 dark:text-white truncate">
                    {v.title}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                    {v.systemName ?? "—"} · <TrackBadge slug={v.examTrackSlug} />
                  </p>
                  <div className="mt-2" />
                  <StatusBadge status={v.status as WorkflowStatus} />
                </div>
                <Link
                  href={`/admin/videos/${v.id}`}
                  className="shrink-0 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 self-start"
                >
                  Edit
                </Link>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
