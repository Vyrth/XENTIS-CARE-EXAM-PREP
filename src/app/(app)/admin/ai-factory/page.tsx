import Link from "next/link";
import { loadAIFactoryPageData } from "@/lib/admin/ai-factory-loaders";
import { loadProductionPlanningData } from "@/lib/admin/production-planning-loaders";
import { loadRoadmapCoverageGaps } from "@/lib/admin/roadmap-coverage-loaders";
import { loadRNSystemCoverage } from "@/lib/admin/rn-system-coverage-loader";
import { loadFNPSystemCoverage } from "@/lib/admin/fnp-system-coverage-loader";
import { loadPMHNPSystemCoverage } from "@/lib/admin/pmhnp-system-coverage-loader";
import { loadLVNSystemCoverage } from "@/lib/admin/lvn-system-coverage-loader";
import { loadPilotTopicOptions } from "@/lib/admin/pilot-loaders";
import { AIFactoryLayout } from "@/components/admin/ai-factory/AIFactoryLayout";
import { Icons } from "@/components/ui/icons";
import type { AIFactoryPrefillParams } from "@/lib/admin/ai-factory-gap-links";

export default async function AIFactoryPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; trackId?: string; systemId?: string; topicId?: string; domainId?: string }>;
}) {
  const [data, productionData, coverageGaps, pilotOptions, rnSystemCoverage, fnpSystemCoverage, pmhnpSystemCoverage, lvnSystemCoverage] = await Promise.all([
    loadAIFactoryPageData(),
    loadProductionPlanningData(),
    loadRoadmapCoverageGaps(5, 8),
    loadPilotTopicOptions(),
    loadRNSystemCoverage(),
    loadFNPSystemCoverage(),
    loadPMHNPSystemCoverage(),
    loadLVNSystemCoverage(),
  ]);
  const params = await searchParams;

  // Apply trackId from URL even when tab is missing (fixes refresh with ?trackId=xxx)
  const initialPrefill: AIFactoryPrefillParams | null =
    params.trackId
      ? {
          tab: (params.tab as AIFactoryPrefillParams["tab"]) ?? "questions",
          trackId: params.trackId,
          systemId: params.systemId ?? undefined,
          topicId: params.topicId ?? undefined,
          domainId: params.domainId ?? undefined,
        }
      : null;

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="text-indigo-500">{Icons.sparkles}</span>
            AI Content Factory
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Generate track-specific educational content with Jade Tutor. All output is draft or editor_review only.
          </p>
        </div>
        <Link
          href="/admin"
          className="text-sm text-slate-600 dark:text-slate-400 hover:underline flex items-center gap-1"
        >
          ← Back to Admin
        </Link>
      </div>

      <AIFactoryLayout
        data={data}
        initialPrefill={initialPrefill}
        productionData={productionData}
        coverageGaps={coverageGaps}
        pilotOptions={pilotOptions}
        rnSystemCoverage={rnSystemCoverage}
        fnpSystemCoverage={fnpSystemCoverage}
        pmhnpSystemCoverage={pmhnpSystemCoverage}
        lvnSystemCoverage={lvnSystemCoverage}
      />
    </div>
  );
}
