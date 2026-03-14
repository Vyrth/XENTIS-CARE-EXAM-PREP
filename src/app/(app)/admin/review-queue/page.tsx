import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { AdminTrackFilter } from "@/components/admin/AdminTrackFilter";
import { AIGeneratedBadge } from "@/components/admin/AIGeneratedBadge";
import { ReviewQueueRowActions } from "@/components/admin/ReviewQueueRowActions";
import { RoutingReasonBadges } from "@/components/admin/RoutingReasonBadges";
import { loadExamTracks } from "@/lib/admin/loaders";
import {
  loadReviewBacklog,
  LANE_LABELS,
  type ReviewLane,
} from "@/lib/admin/review-workflow";
import { TrackBadge } from "@/components/admin/TrackBadge";
import type { WorkflowStatus } from "@/types/admin";

const EDIT_LINKS: Record<string, string> = {
  question: "/admin/questions",
  study_guide: "/admin/study-guides",
  video: "/admin/videos",
  flashcard_deck: "/admin/flashcards",
  high_yield_content: "/admin/high-yield",
};

const LANES: (ReviewLane | "needs_revision")[] = ["editor", "sme", "legal", "qa", "needs_revision"];

type Props = { searchParams: Promise<{ trackId?: string; lane?: string }> };

export default async function ReviewQueuePage({ searchParams }: Props) {
  const { trackId, lane } = await searchParams;
  const activeLane = (lane as ReviewLane | "needs_revision") || "editor";
  const isValidLane = LANES.includes(activeLane);

  const [tracks, backlog] = await Promise.all([
    loadExamTracks(),
    isValidLane ? loadReviewBacklog(activeLane, trackId ?? null) : [],
  ]);

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
            Review Queue
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Triage exceptions and decide. No need to hand-enter source/legal for routine AI content.
          </p>
        </div>
        <AdminTrackFilter tracks={tracks} selectedTrackId={trackId} label="Filter by track" />
      </div>

      <div className="flex flex-wrap gap-2">
        {LANES.map((l) => (
          <Link
            key={l}
            href={`/admin/review-queue?lane=${l}${trackId ? `&trackId=${trackId}` : ""}`}
            className={`px-4 py-2 rounded-lg font-medium text-sm ${
              activeLane === l
                ? l === "needs_revision"
                  ? "bg-rose-600 text-white"
                  : "bg-indigo-600 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            {l === "needs_revision" ? "Needs Revision" : LANE_LABELS[l]}
          </Link>
        ))}
      </div>

      <Card padding="none">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-white">
            {activeLane === "needs_revision"
              ? "Needs Revision"
              : isValidLane
                ? LANE_LABELS[activeLane]
                : "Editorial"}{" "}
            — review exception and decide
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {backlog.length} item{backlog.length !== 1 ? "s" : ""} in this lane
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left p-4 text-sm font-medium text-slate-500">Type</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Title</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Track</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Source</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Exception</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Status</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {backlog.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No items in this lane.
                    {trackId ? " Try a different track filter." : ""}
                  </td>
                </tr>
              ) : (
                backlog.map((item) => {
                  const baseHref = EDIT_LINKS[item.type] ?? "/admin";
                  const editHref = `${baseHref}/${item.id}`;
                  return (
                    <tr
                      key={`${item.type}-${item.id}`}
                      className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <td className="p-4 text-slate-600 dark:text-slate-400 capitalize">
                        {item.type.replace("_", " ")}
                      </td>
                      <td className="p-4 font-medium text-slate-900 dark:text-white">
                        {item.title}
                      </td>
                      <td className="p-4">
                        <TrackBadge
                          slug={item.examTrackSlug as "lvn" | "rn" | "fnp" | "pmhnp"}
                        />
                      </td>
                      <td className="p-4">
                        {item.aiGenerated ? (
                          <AIGeneratedBadge sourceSummary={item.aiSourceSummary} />
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="p-4">
                        <RoutingReasonBadges
                          routingReason={item.routingReason}
                          reviewFlags={item.reviewFlags}
                        />
                      </td>
                      <td className="p-4">
                        <StatusBadge status={item.status as WorkflowStatus} />
                      </td>
                      <td className="p-4">
                        <ReviewQueueRowActions
                          entityType={item.type}
                          entityId={item.id}
                          currentStatus={item.status as WorkflowStatus}
                          editHref={editHref}
                          routingReason={item.routingReason}
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
