import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { TrackBadge } from "@/components/admin/TrackBadge";
import { AdminTrackFilter } from "@/components/admin/AdminTrackFilter";
import { BlueprintSystemRow } from "@/components/admin/BlueprintSystemRow";
import { Icons } from "@/components/ui/icons";
import {
  loadBlueprintCoverage,
  type CoverageLevel,
  type TrackBlueprintCoverage,
  type SystemCoverage,
} from "@/lib/admin/blueprint-coverage";
import { loadExamTracks } from "@/lib/admin/loaders";

const COVERAGE_COLORS: Record<CoverageLevel, string> = {
  none: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  low: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  adequate: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  strong: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
};

const COVERAGE_LABELS: Record<CoverageLevel, string> = {
  none: "No coverage",
  low: "Low",
  adequate: "Adequate",
  strong: "Strong",
};

function CoverageBadge({ level }: { level: CoverageLevel }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${COVERAGE_COLORS[level]}`}
    >
      {COVERAGE_LABELS[level]}
    </span>
  );
}

function TrackSection({
  track,
}: {
  track: TrackBlueprintCoverage;
}) {
  const lowCount =
    track.domains.reduce(
      (s, d) =>
        s +
        d.systems.filter((sys) => sys.coverageLevel === "none" || sys.coverageLevel === "low").length,
      0
    ) + track.unassignedSystems.filter((s) => s.coverageLevel === "none" || s.coverageLevel === "low").length;

  return (
    <Card key={track.trackId} className="overflow-hidden">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <h2 className="font-heading text-lg font-semibold text-slate-900 dark:text-white">
            {track.trackName}
          </h2>
          <TrackBadge slug={track.trackSlug as "lvn" | "rn" | "fnp" | "pmhnp"} />
          {lowCount > 0 && (
            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 text-sm font-medium">
              {Icons.alertTriangle} {lowCount} low-coverage area{lowCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {track.domains.map((domain) => (
          <div key={domain.domainId}>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-medium text-slate-800 dark:text-slate-200">
                {domain.domainName}
              </h3>
              {domain.weightPct > 0 && (
                <span className="text-xs text-slate-500">{domain.weightPct}% blueprint</span>
              )}
              <CoverageBadge level={domain.coverageLevel} />
              <span className="text-sm text-slate-500">
                {domain.questionCount} questions
              </span>
            </div>
            <div className="space-y-2">
              {domain.systems.map((sys) => (
                <BlueprintSystemRow key={sys.systemId} sys={sys} trackId={track.trackId} />
              ))}
            </div>
          </div>
        ))}

        {track.unassignedSystems.length > 0 && (
          <div>
            <h3 className="font-medium text-slate-600 dark:text-slate-400 mb-2">
              Systems without topic links
            </h3>
            <div className="space-y-2">
              {track.unassignedSystems.map((sys) => (
                <BlueprintSystemRow key={sys.systemId} sys={sys} trackId={track.trackId} />
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

export default async function BlueprintCoveragePage({
  searchParams,
}: {
  searchParams: Promise<{ trackId?: string }>;
}) {
  const params = await searchParams;
  const trackId = params.trackId ?? null;

  const [coverage, tracks] = await Promise.all([
    loadBlueprintCoverage(trackId),
    loadExamTracks(),
  ]);

  const filteredCoverage = trackId ? coverage.filter((c) => c.trackId === trackId) : coverage;

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
            Blueprint Coverage Map
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Domain, system, and topic coverage by track. Ensure each board area is systematically covered.
          </p>
        </div>
        <AdminTrackFilter
          tracks={tracks}
          selectedTrackId={trackId}
          label="Filter by track"
        />
      </div>

      <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-slate-100 dark:bg-slate-800/50 text-sm">
        <span className="font-medium text-slate-600 dark:text-slate-400">Legend:</span>
        <span className="text-slate-500">Q = questions</span>
        <span className="text-slate-500">G = guide</span>
        <span className="text-slate-500">V = video</span>
        <span className="text-slate-500">F = flashcard deck</span>
        <span className="text-slate-500">E = exam</span>
      </div>

      {coverage.length === 0 ? (
        <Card>
          <p className="text-slate-500 text-center py-8">
            No tracks or taxonomy found. Seed exam_tracks, domains, systems, and topic_system_links.
          </p>
        </Card>
      ) : (
        <div className="space-y-8">
          {filteredCoverage.map((track) => (
            <TrackSection key={track.trackId} track={track} />
          ))}
        </div>
      )}

      <div className="flex items-center gap-4">
        <Link
          href="/admin/ai-factory"
          className="inline-flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          AI Content Factory →
        </Link>
        <Link
          href="/admin/content-inventory"
          className="inline-flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          Content Inventory →
        </Link>
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:underline"
        >
          ← Back to Admin
        </Link>
      </div>
    </div>
  );
}
