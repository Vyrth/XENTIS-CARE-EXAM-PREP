import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { TrackBadge } from "@/components/admin/TrackBadge";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { AdminTrackFilter } from "@/components/admin/AdminTrackFilter";
import { HighYieldTypeFilter } from "@/components/admin/HighYieldTypeFilter";
import { loadExamTracks } from "@/lib/admin/loaders";
import { loadAdminHighYieldContent } from "@/lib/admin/high-yield-studio-loaders";
import type { WorkflowStatus } from "@/types/admin";
import type { HighYieldContentType } from "@/lib/admin/high-yield-studio-loaders";

const TYPE_LABELS: Record<HighYieldContentType, string> = {
  high_yield_summary: "High-Yield Summary",
  common_confusion: "Common Confusion",
  board_trap: "Board Trap",
  compare_contrast_summary: "Compare/Contrast",
};

type Props = { searchParams: Promise<{ trackId?: string; type?: string }> };

export default async function AdminHighYieldPage({ searchParams }: Props) {
  const { trackId, type } = await searchParams;
  const [tracks, items] = await Promise.all([
    loadExamTracks(),
    loadAdminHighYieldContent(
      trackId || null,
      type as HighYieldContentType | undefined
    ),
  ]);

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
            High-Yield Content
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Curate high-yield summaries, common confusions, board traps, and compare/contrast content for the dashboard and Jade Tutor.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <AdminTrackFilter tracks={tracks} selectedTrackId={trackId} />
          <HighYieldTypeFilter selectedType={type} />
          <Link
            href={trackId ? `/admin/high-yield/new?trackId=${trackId}` : "/admin/high-yield/new"}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 shrink-0"
          >
            + New Item
          </Link>
        </div>
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left p-4 text-sm font-medium text-slate-500">
                  Title
                </th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">
                  Type
                </th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">
                  Track
                </th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">
                  Status
                </th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-8 text-center text-slate-500"
                  >
                    No high-yield content found.{" "}
                    {trackId || type
                      ? "Try different filters."
                      : "Create your first item."}
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <td className="p-4 font-medium text-slate-900 dark:text-white">
                      {item.title}
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-400">
                      {TYPE_LABELS[item.contentType]}
                    </td>
                    <td className="p-4">
                      <TrackBadge
                        slug={
                          tracks.find((t) => t.id === item.examTrackId)
                            ?.slug ?? null
                        }
                      />
                    </td>
                    <td className="p-4">
                      <StatusBadge
                        status={item.status as WorkflowStatus}
                      />
                    </td>
                    <td className="p-4">
                      <Link
                        href={`/admin/high-yield/${item.id}`}
                        className="text-indigo-600 hover:underline text-sm"
                      >
                        Edit
                      </Link>
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
