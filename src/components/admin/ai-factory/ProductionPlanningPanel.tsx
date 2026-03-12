"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Icons } from "@/components/ui/icons";
import { TrackBadge } from "@/components/admin/TrackBadge";
import { buildAIFactoryUrl } from "@/lib/admin/ai-factory-gap-links";
import {
  CONTENT_TYPE_LABELS,
  CONTENT_TYPE_TO_TAB,
  type ContentTypeKey,
} from "@/lib/admin/production-targets";
import type { TrackProductionRow } from "@/lib/admin/production-planning-loaders";
import type { RoadmapCoverageGaps } from "@/lib/admin/roadmap-coverage-loaders";
import type { RNSystemCoverageRow } from "@/lib/admin/rn-system-coverage-loader";
import type { FNPSystemCoverageRow } from "@/lib/admin/fnp-system-coverage-loader";
import type { PMHNPSystemCoverageRow } from "@/lib/admin/pmhnp-system-coverage-loader";
import type { LVNSystemCoverageRow } from "@/lib/admin/lvn-system-coverage-loader";
import { FNP_MIN_TOPICS_PER_SYSTEM } from "@/lib/admin/fnp-mass-content-plan";

export interface ProductionPlanningPanelProps {
  data: TrackProductionRow[];
  coverageGaps?: RoadmapCoverageGaps[];
  rnSystemCoverage?: RNSystemCoverageRow[];
  fnpSystemCoverage?: FNPSystemCoverageRow[];
  pmhnpSystemCoverage?: PMHNPSystemCoverageRow[];
  lvnSystemCoverage?: LVNSystemCoverageRow[];
}

const TRACK_ORDER: ("lvn" | "rn" | "fnp" | "pmhnp")[] = ["lvn", "rn", "fnp", "pmhnp"];

const CONTENT_ORDER: ContentTypeKey[] = [
  "questions",
  "studyGuides",
  "flashcardDecks",
  "flashcards",
  "highYield",
];

export function ProductionPlanningPanel({ data, coverageGaps = [], rnSystemCoverage = [], fnpSystemCoverage = [], pmhnpSystemCoverage = [], lvnSystemCoverage = [] }: ProductionPlanningPanelProps) {
  const router = useRouter();
  const [expandedTrack, setExpandedTrack] = useState<string | null>(null);

  const sortedData = [...data].sort(
    (a, b) => TRACK_ORDER.indexOf(a.trackSlug) - TRACK_ORDER.indexOf(b.trackSlug)
  );

  const handleGenerateFromShortfall = (row: TrackProductionRow) => {
    const tab = CONTENT_TYPE_TO_TAB[row.furthestBehind];
    router.push(buildAIFactoryUrl({ tab, trackId: row.trackId }));
  };

  const handleLaunchBatch = (trackId: string, systemId?: string, topicId?: string) => {
    router.push(
      `/admin/ai-factory?tab=batch&trackId=${trackId}${systemId ? `&systemId=${systemId}` : ""}${topicId ? `&topicId=${topicId}` : ""}`
    );
  };

  const getGapsForTrack = (trackId: string) =>
    coverageGaps.find((g) => g.trackId === trackId);

  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <span className="text-indigo-500">{Icons["trending-up"]}</span>
          Mass Content Production Roadmap
        </h3>
        <button
          type="button"
          onClick={() => router.refresh()}
          className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          title="Refresh counts"
        >
          Refresh
        </button>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
        Target counts by track. Live database counts. Launch batch jobs from coverage gaps.
      </p>

      {sortedData.length === 0 ? (
        <p className="text-sm text-slate-500 py-4">No tracks found. Seed exam_tracks.</p>
      ) : (
        <div className="space-y-6">
          {sortedData.map((row) => {
            const gaps = getGapsForTrack(row.trackId);
            const isExpanded = expandedTrack === row.trackId;

            return (
              <div
                key={row.trackId}
                className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-4"
              >
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <TrackBadge slug={row.trackSlug} />
                    <span className="font-medium text-slate-900 dark:text-white">
                      {row.trackName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                      Furthest behind: {CONTENT_TYPE_LABELS[row.furthestBehind]}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleGenerateFromShortfall(row)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                    >
                      {Icons.sparkles} Generate
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLaunchBatch(row.trackId)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-slate-600 text-white hover:bg-slate-700 transition-colors"
                    >
                      Launch Batch
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  {CONTENT_ORDER.map((key) => {
                    const current = row.current[key];
                    const target = row.target[key];
                    const pct = row.progressPct[key];
                    const isBehind = pct < 100;
                    const tab = CONTENT_TYPE_TO_TAB[key];
                    return (
                      <div key={key} className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                            {CONTENT_TYPE_LABELS[key]}
                          </span>
                          <span className="text-xs tabular-nums text-slate-700 dark:text-slate-300">
                            {current.toLocaleString()} / {target.toLocaleString()}
                          </span>
                        </div>
                        <ProgressBar
                          value={pct}
                          max={100}
                          size="sm"
                          variant="track"
                          trackSlug={row.trackSlug}
                        />
                        {isBehind && (
                          <Link
                            href={buildAIFactoryUrl({ tab, trackId: row.trackId })}
                            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            Generate →
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>

                {(row.trackSlug === "rn" && rnSystemCoverage.length > 0) && (
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                    <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
                      RN Mass Content Plan — System Coverage (target 2000)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                      {rnSystemCoverage.map((sys) => (
                        <div
                          key={sys.systemId}
                          className={`flex items-center justify-between gap-2 p-2 rounded text-sm ${
                            sys.gap > 0 ? "bg-slate-50 dark:bg-slate-800/50" : ""
                          }`}
                        >
                          <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                            {sys.systemName}
                          </span>
                          <span className="text-xs tabular-nums shrink-0">
                            {sys.currentCount}/{sys.targetCount}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleLaunchBatch(row.trackId, sys.systemId)}
                            disabled={sys.gap === 0}
                            className="px-2 py-0.5 rounded text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Batch
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(row.trackSlug === "pmhnp" && pmhnpSystemCoverage.length > 0) && (
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                    <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
                      PMHNP Mass Content Plan — Category Coverage (target 1000)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                      {pmhnpSystemCoverage.map((sys) => (
                        <div
                          key={sys.systemId}
                          className={`flex items-center justify-between gap-2 p-2 rounded text-sm ${
                            sys.gap > 0 ? "bg-slate-50 dark:bg-slate-800/50" : ""
                          }`}
                        >
                          <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                            {sys.systemName}
                          </span>
                          <span className="text-xs tabular-nums shrink-0">
                            {sys.currentCount}/{sys.targetCount}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleLaunchBatch(row.trackId, sys.systemId)}
                            disabled={sys.gap === 0}
                            className="px-2 py-0.5 rounded text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Batch
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(row.trackSlug === "lvn" && lvnSystemCoverage.length > 0) && (
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                    <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
                      LVN Mass Content Plan — Category Coverage (target 800)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                      {lvnSystemCoverage.map((sys) => (
                        <div
                          key={sys.systemId}
                          className={`flex items-center justify-between gap-2 p-2 rounded text-sm ${
                            sys.gap > 0 ? "bg-slate-50 dark:bg-slate-800/50" : ""
                          }`}
                        >
                          <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                            {sys.systemName}
                          </span>
                          <span className="text-xs tabular-nums shrink-0">
                            {sys.currentCount}/{sys.targetCount}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleLaunchBatch(row.trackId, sys.systemId)}
                            disabled={sys.gap === 0}
                            className="px-2 py-0.5 rounded text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Batch
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(row.trackSlug === "fnp" && fnpSystemCoverage.length > 0) && (
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                    <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
                      FNP Mass Content Plan — System Coverage (target 1500)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                      {fnpSystemCoverage.map((sys) => (
                        <div
                          key={sys.systemId}
                          className={`flex items-center justify-between gap-2 p-2 rounded text-sm ${
                            sys.gap > 0 ? "bg-slate-50 dark:bg-slate-800/50" : ""
                          } ${sys.topicCount < FNP_MIN_TOPICS_PER_SYSTEM ? "border border-amber-300 dark:border-amber-600" : ""}`}
                        >
                          <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                            {sys.systemName}
                            {sys.topicCount < FNP_MIN_TOPICS_PER_SYSTEM && (
                              <span className="ml-1 text-amber-600 dark:text-amber-400 text-xs" title="Add topics for diversity">
                                ({sys.topicCount}T)
                              </span>
                            )}
                          </span>
                          <span className="text-xs tabular-nums shrink-0">
                            {sys.currentCount}/{sys.targetCount}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleLaunchBatch(row.trackId, sys.systemId)}
                            disabled={sys.gap === 0}
                            className="px-2 py-0.5 rounded text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Batch
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {gaps && (gaps.lowestSystems.length > 0 || gaps.lowestTopics.length > 0) && (
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedTrack(isExpanded ? null : row.trackId)
                      }
                      className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                    >
                      {isExpanded ? Icons.chevronDown : Icons.chevronRight}
                      Lowest coverage systems & topics
                    </button>

                    {isExpanded && (
                      <div className="mt-4 space-y-4">
                        {gaps.lowestSystems.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                              Systems
                            </h4>
                            <div className="space-y-2">
                              {gaps.lowestSystems.map((sys) => (
                                <CoverageGapRow
                                  key={sys.systemId}
                                  type="system"
                                  name={sys.systemName}
                                  counts={{
                                    questions: sys.questionCount,
                                    guides: sys.guideCount,
                                    decks: sys.deckCount,
                                    flashcards: sys.flashcardCount,
                                    highYield: sys.highYieldCount,
                                  }}
                                  coverageScore={sys.coverageScore}
                                  onGenerate={(tab) =>
                                    router.push(
                                      buildAIFactoryUrl({
                                        tab,
                                        trackId: row.trackId,
                                        systemId: sys.systemId,
                                      })
                                    )
                                  }
                                  onLaunchBatch={() =>
                                    handleLaunchBatch(row.trackId, sys.systemId)
                                  }
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {gaps.lowestTopics.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                              Topics
                            </h4>
                            <div className="space-y-2">
                              {gaps.lowestTopics.map((t) => (
                                <CoverageGapRow
                                  key={t.topicId}
                                  type="topic"
                                  name={`${t.topicName} (${t.systemName})`}
                                  counts={{
                                    questions: t.questionCount,
                                    guides: t.guideCount,
                                    decks: t.deckCount,
                                    flashcards: t.flashcardCount,
                                    highYield: t.highYieldCount,
                                  }}
                                  coverageScore={t.coverageScore}
                                  onGenerate={(tab) =>
                                    router.push(
                                      buildAIFactoryUrl({
                                        tab,
                                        trackId: row.trackId,
                                        systemId: t.systemId,
                                        topicId: t.topicId,
                                      })
                                    )
                                  }
                                  onLaunchBatch={() =>
                                    handleLaunchBatch(
                                      row.trackId,
                                      t.systemId,
                                      t.topicId
                                    )
                                  }
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function CoverageGapRow({
  type,
  name,
  counts,
  coverageScore,
  onGenerate,
  onLaunchBatch,
}: {
  type: "system" | "topic";
  name: string;
  counts: {
    questions: number;
    guides: number;
    decks: number;
    flashcards: number;
    highYield: number;
  };
  coverageScore: number;
  onGenerate: (tab: "questions" | "study-guides" | "flashcards" | "high-yield") => void;
  onLaunchBatch: () => void;
}) {
  const isLow = coverageScore < 30;

  return (
    <div
      className={`flex items-center justify-between gap-4 p-3 rounded-lg text-sm ${
        isLow ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800" : "bg-slate-50 dark:bg-slate-800/50"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="font-medium text-slate-900 dark:text-white truncate">
          {name}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Q: {counts.questions} · G: {counts.guides} · D: {counts.decks} · F: {counts.flashcards} · HY: {counts.highYield}
          {isLow && (
            <span className="ml-2 text-amber-600 dark:text-amber-400 font-medium">
              · Low coverage
            </span>
          )}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onLaunchBatch}
          className="px-2 py-1 rounded text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700"
        >
          Batch
        </button>
        <div className="flex gap-0.5">
          {(["questions", "study-guides", "flashcards", "high-yield"] as const).map(
            (tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => onGenerate(tab)}
                className="px-2 py-1 rounded text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600"
              >
                {tab === "questions" ? "Q" : tab === "study-guides" ? "G" : tab === "flashcards" ? "F" : "HY"}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
