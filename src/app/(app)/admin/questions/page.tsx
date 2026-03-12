import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { TrackBadge } from "@/components/admin/TrackBadge";
import { AdminTrackFilter } from "@/components/admin/AdminTrackFilter";
import { loadAdminQuestions, loadExamTracks } from "@/lib/admin/loaders";
import type { WorkflowStatus } from "@/types/admin";

type Props = { searchParams: Promise<{ trackId?: string }> };

export default async function QuestionManagerPage({ searchParams }: Props) {
  const { trackId } = await searchParams;
  const [questions, tracks] = await Promise.all([
    loadAdminQuestions(trackId || null),
    loadExamTracks(),
  ]);

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
            Question Manager
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Create and manage questions. Full workflow from draft to published. Every question must be assigned to a track.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <AdminTrackFilter tracks={tracks} selectedTrackId={trackId} />
          <Link
            href="/admin/questions/import"
            className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 shrink-0"
          >
            Bulk Import
          </Link>
          <Link
            href={trackId ? `/admin/questions/new?trackId=${trackId}` : "/admin/questions/new"}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 shrink-0"
          >
            + New Question
          </Link>
        </div>
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left p-4 text-sm font-medium text-slate-500">ID</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Stem</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Track</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">System</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Status</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {questions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No questions found. {trackId ? "Try a different track filter." : "Create your first question."}
                  </td>
                </tr>
              ) : (
                questions.map((q) => (
                  <tr
                    key={q.id}
                    className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <td className="p-4 font-mono text-sm">{String(q.id).slice(0, 8)}…</td>
                    <td className="p-4 text-slate-900 dark:text-white max-w-md truncate">
                      {q.stem}
                    </td>
                    <td className="p-4">
                      <TrackBadge slug={q.examTrackSlug} />
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-400">
                      {q.systemName ?? "—"}
                    </td>
                    <td className="p-4">
                      <StatusBadge status={q.status as WorkflowStatus} />
                    </td>
                    <td className="p-4">
                      <span className="flex items-center gap-3">
                      <Link
                        href={`/admin/questions/${q.id}`}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm"
                      >
                        Edit
                      </Link>
                      <Link
                        href={`/admin/questions/new?cloneFrom=${q.id}&trackId=${q.examTrackId}`}
                        className="text-slate-500 hover:text-slate-700 text-sm"
                        title="Clone"
                      >
                        Clone
                      </Link>
                      </span>
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
