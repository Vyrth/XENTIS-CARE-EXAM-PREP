import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { TrackBadge } from "@/components/admin/TrackBadge";
import { AdminTrackFilter } from "@/components/admin/AdminTrackFilter";
import { ContentStatusTransitionForm } from "@/components/admin/ContentStatusTransitionForm";
import { loadAdminPublishQueue, loadExamTracks } from "@/lib/admin/loaders";
import { getSessionUser } from "@/lib/auth/session";
import type { WorkflowStatus } from "@/types/admin";

const EDIT_LINKS: Record<string, string> = {
  question: "/admin/questions",
  study_guide: "/admin/study-guides",
  video: "/admin/videos",
  flashcard_deck: "/admin/flashcards",
  high_yield_content: "/admin/high-yield",
};

type Props = { searchParams: Promise<{ trackId?: string }> };

export default async function PublishQueuePage({ searchParams }: Props) {
  const { trackId } = await searchParams;
  const user = await getSessionUser();
  const [items, tracks] = await Promise.all([
    loadAdminPublishQueue(trackId || null),
    loadExamTracks(),
  ]);

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
            Publish Queue
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Approved items ready to publish. Publish is gated: all required review stages (Editor, SME, Legal, QA) must be completed before publishing.
          </p>
        </div>
        <AdminTrackFilter tracks={tracks} selectedTrackId={trackId} />
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left p-4 text-sm font-medium text-slate-500">Type</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Title</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Track</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Status</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No approved items in queue. {trackId ? "Try a different track filter." : ""}
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const baseHref = EDIT_LINKS[item.type] ?? "/admin";
                  const editHref = `${baseHref}/${item.id}`;
                  return (
                    <tr key={`${item.type}-${item.id}`} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-4 text-slate-600 dark:text-slate-400 capitalize">{item.type.replace("_", " ")}</td>
                      <td className="p-4 font-medium text-slate-900 dark:text-white">{item.title}</td>
                      <td className="p-4">
                        <TrackBadge slug={item.examTrackSlug} />
                      </td>
                      <td className="p-4">
                        <StatusBadge status={item.status as WorkflowStatus} />
                      </td>
                      <td className="p-4">
                        <Link href={editHref} className="text-indigo-600 hover:underline text-sm mr-4">View</Link>
                        <ContentStatusTransitionForm
                          entityType={item.type}
                          entityId={item.id}
                          currentStatus={item.status as WorkflowStatus}
                          userId={user?.id ?? null}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
