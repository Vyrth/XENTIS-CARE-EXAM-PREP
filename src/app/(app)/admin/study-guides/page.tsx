import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { TrackBadge } from "@/components/admin/TrackBadge";
import { AdminTrackFilter } from "@/components/admin/AdminTrackFilter";
import { loadAdminStudyGuides, loadExamTracks } from "@/lib/admin/loaders";
import type { WorkflowStatus } from "@/types/admin";

type Props = { searchParams: Promise<{ trackId?: string }> };

export default async function StudyGuideManagerPage({ searchParams }: Props) {
  const { trackId } = await searchParams;
  const [guides, tracks] = await Promise.all([
    loadAdminStudyGuides(trackId || null),
    loadExamTracks(),
  ]);

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
            Study Guide Editor
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Create and edit study guides. Sections support markdown. Every guide must be assigned to a track.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <AdminTrackFilter tracks={tracks} selectedTrackId={trackId} />
          <Link
            href="/admin/study-guides/new"
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 shrink-0"
          >
            + New Guide
          </Link>
        </div>
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left p-4 text-sm font-medium text-slate-500">Title</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Track</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">System</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Sections</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Status</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {guides.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No study guides found. {trackId ? "Try a different track filter." : "Create your first guide."}
                  </td>
                </tr>
              ) : (
                guides.map((sg) => (
                  <tr key={sg.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-4 font-medium text-slate-900 dark:text-white">{sg.title}</td>
                    <td className="p-4">
                      <TrackBadge slug={sg.examTrackSlug} />
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-400">{sg.systemName ?? "—"}</td>
                    <td className="p-4 text-slate-600 dark:text-slate-400">{sg.sectionCount}</td>
                    <td className="p-4">
                      <StatusBadge status={sg.status as WorkflowStatus} />
                    </td>
                    <td className="p-4">
                      <Link href={`/admin/study-guides/${sg.id}`} className="text-indigo-600 hover:underline text-sm">Edit</Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
