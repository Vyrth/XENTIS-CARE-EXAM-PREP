import Link from "next/link";
import { loadExamTracks } from "@/lib/admin/loaders";
import { loadAllSystemsForAdmin } from "@/lib/admin/study-guide-studio-loaders";
import { loadAllTopicsForAdmin } from "@/lib/admin/question-studio-loaders";
import { loadBatchPlansWithProgress, type BatchPlanWithProgress } from "@/lib/admin/batch-planner-loaders";
import { AdminTrackFilter } from "@/components/admin/AdminTrackFilter";
import { BatchPlanCard } from "@/components/admin/BatchPlanCard";
import { CreateBatchPlanForm } from "@/components/admin/CreateBatchPlanForm";
import { BatchPlannerFilters } from "@/components/admin/BatchPlannerFilters";

export default async function BatchPlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ trackId?: string; status?: string }>;
}) {
  const params = await searchParams;
  const trackId = params.trackId ?? null;
  const status = params.status ?? null;

  const [tracks, systems, topics, plans] = await Promise.all([
    loadExamTracks(),
    loadAllSystemsForAdmin(),
    loadAllTopicsForAdmin(),
    loadBatchPlansWithProgress({
      trackId: trackId ?? undefined,
      status: status as "planned" | "in_progress" | "under_review" | "completed" | undefined,
    }),
  ]);

  const topicOptions = topics.map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    domainId: t.domainId,
    systemIds: t.systemIds,
  }));

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
            Batch Planner
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Plan and track content production by track, system, and topic. Set targets and monitor progress.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <BatchPlannerFilters
            tracks={tracks}
            selectedTrackId={trackId}
            selectedStatus={status}
          />
        </div>
      </div>

      <CreateBatchPlanForm
        tracks={tracks}
        systems={systems}
        topics={topicOptions}
      />

      <div>
        <h2 className="font-medium text-slate-900 dark:text-white mb-4">
          Batch plans ({plans.length})
        </h2>
        {plans.length === 0 ? (
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-12 text-center">
            <p className="text-slate-500 mb-2">No batch plans yet.</p>
            <p className="text-sm text-slate-400">
              Create a batch plan above to set targets for questions, guides, decks, videos, and high-yield content.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan: BatchPlanWithProgress) => (
              <BatchPlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-4">
        <Link
          href="/admin/content-inventory"
          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          Content inventory →
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
