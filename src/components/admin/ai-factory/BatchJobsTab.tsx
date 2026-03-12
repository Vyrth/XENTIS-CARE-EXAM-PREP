"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { RN_BOARD_FOCUS } from "@/lib/admin/rn-mass-content-plan";
import { FNP_BOARD_FOCUS } from "@/lib/admin/fnp-mass-content-plan";
import { PMHNP_BOARD_FOCUS } from "@/lib/admin/pmhnp-mass-content-plan";
import { LVN_BOARD_FOCUS } from "@/lib/admin/lvn-mass-content-plan";
import { Card } from "@/components/ui/Card";
import { Icons } from "@/components/ui/icons";
import {
  launchAIFactoryBatchAction,
  runAIBatchJobAction,
  processBatchQueueAction,
  getAIBatchJobProgressAction,
  loadAIBatchJobs,
  requeueBatchJobAction,
  cancelBatchJobAction,
  type BatchJobProgress,
  type AIBatchJobSummary,
} from "@/app/(app)/actions/ai-batch";
import { FLASHCARD_STYLES } from "@/lib/admin/flashcard-mass-production-plan";
import { resolveConfigTrack } from "@/lib/ai/factory/resolve-track";
import type { GenerationConfig } from "@/lib/ai/factory/types";
import type { AIFactoryPageData } from "@/lib/admin/ai-factory-loaders";

type BatchPreset =
  | "50_questions"
  | "100_questions"
  | "250_questions"
  | "rn_wave_1"
  | "rn_wave_2"
  | "rn_wave_3"
  | "rn_wave_4"
  | "fnp_wave_1"
  | "fnp_wave_2"
  | "fnp_wave_3"
  | "fnp_wave_4"
  | "pmhnp_wave_1"
  | "pmhnp_wave_2"
  | "pmhnp_wave_3"
  | "pmhnp_wave_4"
  | "lvn_wave_1"
  | "lvn_wave_2"
  | "lvn_wave_3"
  | "lvn_wave_4"
  | "guide_pack"
  | "guide_batch_rn"
  | "guide_batch_fnp"
  | "guide_batch_pmhnp"
  | "guide_batch_lvn"
  | "flashcard_batch"
  | "high_yield_batch"
  | "hy_batch_rn"
  | "hy_batch_fnp"
  | "hy_batch_pmhnp"
  | "hy_batch_lvn";

const BASE_PRESETS: { value: BatchPreset; label: string; contentType: string; targetCount: number; rnOnly?: boolean; fnpOnly?: boolean; pmhnpOnly?: boolean; lvnOnly?: boolean }[] = [
  { value: "50_questions", label: "50 questions", contentType: "question", targetCount: 50 },
  { value: "100_questions", label: "100 questions", contentType: "question", targetCount: 100 },
  { value: "250_questions", label: "250 questions", contentType: "question", targetCount: 250 },
  { value: "rn_wave_1", label: "RN Wave 1 (200 questions)", contentType: "question", targetCount: 200, rnOnly: true },
  { value: "rn_wave_2", label: "RN Wave 2 (400 questions)", contentType: "question", targetCount: 400, rnOnly: true },
  { value: "rn_wave_3", label: "RN Wave 3 (600 questions)", contentType: "question", targetCount: 600, rnOnly: true },
  { value: "rn_wave_4", label: "RN Wave 4 (800 questions)", contentType: "question", targetCount: 800, rnOnly: true },
  { value: "fnp_wave_1", label: "FNP Wave 1 (150 questions)", contentType: "question", targetCount: 150, fnpOnly: true },
  { value: "fnp_wave_2", label: "FNP Wave 2 (300 questions)", contentType: "question", targetCount: 300, fnpOnly: true },
  { value: "fnp_wave_3", label: "FNP Wave 3 (450 questions)", contentType: "question", targetCount: 450, fnpOnly: true },
  { value: "fnp_wave_4", label: "FNP Wave 4 (600 questions)", contentType: "question", targetCount: 600, fnpOnly: true },
  { value: "pmhnp_wave_1", label: "PMHNP Wave 1 (100 questions)", contentType: "question", targetCount: 100, pmhnpOnly: true },
  { value: "pmhnp_wave_2", label: "PMHNP Wave 2 (200 questions)", contentType: "question", targetCount: 200, pmhnpOnly: true },
  { value: "pmhnp_wave_3", label: "PMHNP Wave 3 (300 questions)", contentType: "question", targetCount: 300, pmhnpOnly: true },
  { value: "pmhnp_wave_4", label: "PMHNP Wave 4 (400 questions)", contentType: "question", targetCount: 400, pmhnpOnly: true },
  { value: "lvn_wave_1", label: "LVN Wave 1 (100 questions)", contentType: "question", targetCount: 100, lvnOnly: true },
  { value: "lvn_wave_2", label: "LVN Wave 2 (200 questions)", contentType: "question", targetCount: 200, lvnOnly: true },
  { value: "lvn_wave_3", label: "LVN Wave 3 (250 questions)", contentType: "question", targetCount: 250, lvnOnly: true },
  { value: "lvn_wave_4", label: "LVN Wave 4 (250 questions)", contentType: "question", targetCount: 250, lvnOnly: true },
  { value: "guide_pack", label: "Guide pack (10)", contentType: "study_guide", targetCount: 10 },
  { value: "guide_batch_rn", label: "RN guides (150)", contentType: "study_guide", targetCount: 150, rnOnly: true },
  { value: "guide_batch_fnp", label: "FNP guides (120)", contentType: "study_guide", targetCount: 120, fnpOnly: true },
  { value: "guide_batch_pmhnp", label: "PMHNP guides (80)", contentType: "study_guide", targetCount: 80, pmhnpOnly: true },
  { value: "guide_batch_lvn", label: "LVN guides (60)", contentType: "study_guide", targetCount: 60, lvnOnly: true },
  { value: "flashcard_batch", label: "500 flashcards", contentType: "flashcard_batch", targetCount: 500 },
  { value: "high_yield_batch", label: "High-yield batch (10)", contentType: "high_yield_summary", targetCount: 10 },
  { value: "hy_batch_rn", label: "RN high-yield (500)", contentType: "high_yield_batch", targetCount: 500, rnOnly: true },
  { value: "hy_batch_fnp", label: "FNP high-yield (400)", contentType: "high_yield_batch", targetCount: 400, fnpOnly: true },
  { value: "hy_batch_pmhnp", label: "PMHNP high-yield (300)", contentType: "high_yield_batch", targetCount: 300, pmhnpOnly: true },
  { value: "hy_batch_lvn", label: "LVN high-yield (200)", contentType: "high_yield_batch", targetCount: 200, lvnOnly: true },
];

/** Difficulty calibration: Easy 30%, Moderate 50%, Hard 20% (tiers 1, 3, 5) */
const DEFAULT_DIFFICULTY: Record<number, number> = {
  1: 0.3, // Easy
  3: 0.5, // Moderate
  5: 0.2, // Hard
};

export interface BatchJobsTabProps {
  config: GenerationConfig;
  data: AIFactoryPageData;
  onConfigChange: (config: GenerationConfig) => void;
}

export function BatchJobsTab({ config, data, onConfigChange }: BatchJobsTabProps) {
  const [preset, setPreset] = useState<BatchPreset>("50_questions");
  const [flashcardStyle, setFlashcardStyle] = useState<string>("rapid_recall");
  const [topicIds, setTopicIds] = useState<string[]>([]);
  const [systemIds, setSystemIds] = useState<string[]>([]);
  const [boardFocus, setBoardFocus] = useState("");
  const [runMode, setRunMode] = useState<"queue" | "now">("queue");
  const [generating, setGenerating] = useState(false);
  const [processingQueue, setProcessingQueue] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<BatchJobProgress | null>(null);
  const [recentJobs, setRecentJobs] = useState<AIBatchJobSummary[]>([]);

  const resolvedTrack = resolveConfigTrack(config, data.tracks);
  const trackSlug = resolvedTrack?.trackSlug ?? "rn";
  const PRESETS =
    trackSlug === "rn"
      ? BASE_PRESETS.filter((x) => !x.fnpOnly && !x.pmhnpOnly && !x.lvnOnly)
      : trackSlug === "fnp"
        ? BASE_PRESETS.filter((x) => !x.rnOnly && !x.pmhnpOnly && !x.lvnOnly)
        : trackSlug === "pmhnp"
          ? BASE_PRESETS.filter((x) => !x.rnOnly && !x.fnpOnly && !x.lvnOnly)
          : trackSlug === "lvn"
            ? BASE_PRESETS.filter((x) => !x.rnOnly && !x.fnpOnly && !x.pmhnpOnly)
            : BASE_PRESETS.filter((x) => !x.rnOnly && !x.fnpOnly && !x.pmhnpOnly && !x.lvnOnly);
  const p = PRESETS.find((x) => x.value === preset) ?? PRESETS[0];
  const filteredSystems = config.trackId ? data.systems.filter((s) => s.examTrackId === config.trackId) : [];
  const trackSystemIds = new Set(filteredSystems.map((s) => s.id));
  const filteredTopics = config.trackId
    ? data.topics.filter((t) => !t.systemIds?.length || t.systemIds.some((sid) => trackSystemIds.has(sid)))
    : [];
  const questionTypeId =
    data.questionTypes.find((qt) => qt.slug === (config.itemTypeSlug ?? "single_best_answer"))?.id ??
    data.questionTypes[0]?.id;

  const loadRecent = useCallback(() => {
    loadAIBatchJobs(10).then(setRecentJobs);
  }, []);

  useEffect(() => {
    loadRecent();
  }, [loadRecent]);

  const prefillAppliedRef = useRef(false);
  useEffect(() => {
    if (prefillAppliedRef.current) return;
    if (config.systemId || config.topicId) {
      if (config.systemId) setSystemIds((prev) => (prev.length ? prev : [config.systemId!]));
      if (config.topicId) setTopicIds((prev) => (prev.length ? prev : [config.topicId!]));
      prefillAppliedRef.current = true;
    }
  }, [config.systemId, config.topicId]);

  useEffect(() => {
    const pDef = BASE_PRESETS.find((x) => x.value === preset);
    if (trackSlug !== "rn" && pDef?.rnOnly) setPreset("50_questions");
    else if (trackSlug !== "fnp" && pDef?.fnpOnly) setPreset("50_questions");
    else if (trackSlug !== "pmhnp" && pDef?.pmhnpOnly) setPreset("50_questions");
    else if (trackSlug !== "lvn" && pDef?.lvnOnly) setPreset("50_questions");
  }, [trackSlug, preset]);

  const handleStartBatch = async () => {
    const resolved = resolveConfigTrack(config, data.tracks);
    if (!resolved) {
      setError("Select a track");
      return;
    }
    if (p.contentType === "question" && !questionTypeId) {
      setError("No question type available");
      return;
    }
    if (p.contentType === "flashcard_batch" && !resolved) {
      setError("Select a track");
      return;
    }
    setError(null);
    setGenerating(true);
    setProgress(null);

    try {
      const createResult = await launchAIFactoryBatchAction({
        trackId: resolved.trackId,
        trackSlug: resolved.trackSlug,
        contentType: p.contentType as "question" | "study_guide" | "flashcard_deck" | "flashcard_batch" | "high_yield_summary" | "high_yield_batch",
        topicIds: topicIds.length ? topicIds : undefined,
        systemIds: systemIds.length ? systemIds : undefined,
        targetCount: p.targetCount,
        quantityPerTopic: p.contentType === "question" ? undefined : 1,
        difficultyDistribution: p.contentType === "question" ? DEFAULT_DIFFICULTY : undefined,
        boardFocus:
          boardFocus.trim() ||
          (resolved.trackSlug === "rn" && p.rnOnly ? RN_BOARD_FOCUS : undefined) ||
          (resolved.trackSlug === "fnp" && p.fnpOnly ? FNP_BOARD_FOCUS : undefined) ||
          (resolved.trackSlug === "pmhnp" && p.pmhnpOnly ? PMHNP_BOARD_FOCUS : undefined) ||
          (resolved.trackSlug === "lvn" && p.lvnOnly ? LVN_BOARD_FOCUS : undefined) ||
          undefined,
        itemTypeSlug: config.itemTypeSlug ?? "single_best_answer",
        studyGuideMode:
          p.value.startsWith("guide_batch_") ? "full" : "section_pack",
        sectionCount: p.value.startsWith("guide_batch_") ? 5 : 4,
        flashcardDeckMode: "rapid_recall",
        flashcardStyle: p.contentType === "flashcard_batch" ? flashcardStyle : undefined,
        cardCount: p.contentType === "flashcard_batch" ? 20 : 8,
        highYieldType: "high_yield_summary",
      });

      if (!createResult.success || !createResult.jobId) {
        setError(createResult.error ?? "Failed to create batch job");
        setGenerating(false);
        return;
      }

      if (runMode === "now") {
        const runResult = await runAIBatchJobAction(
          createResult.jobId,
          p.contentType === "question" ? questionTypeId! : null
        );
        setProgress(runResult.progress ?? null);
        if (runResult.success && runResult.progress) {
          setProgress(runResult.progress);
        }
        if (!runResult.success && runResult.error) {
          setError(runResult.error);
        }
      } else {
        setProgress({ jobId: createResult.jobId, status: "pending", completedCount: 0, failedCount: 0, skippedDuplicateCount: 0, generatedCount: 0, targetCount: p.targetCount });
        setError(null);
      }
      loadRecent();
    } catch (e) {
      setError(String(e));
    } finally {
      setGenerating(false);
    }
  };

  const contentLabel = (ct: string) => {
    const m: Record<string, string> = {
      question: "Questions",
      study_guide: "Study guides",
      flashcard_deck: "Flashcard decks",
      flashcard_batch: "Flashcards (500)",
      high_yield_summary: "High-yield",
      high_yield_batch: "High-yield (batch)",
    };
    return m[ct] ?? ct;
  };

  const statusLabel = (s: string) => {
    const m: Record<string, string> = {
      pending: "Pending",
      running: "Running",
      completed: "Completed",
      failed: "Failed",
      cancelled: "Cancelled",
    };
    return m[s] ?? s;
  };

  const statusBadgeClass = (s: string) => {
    switch (s) {
      case "pending":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
      case "running":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "completed":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "cancelled":
        return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
      default:
        return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
    }
  };

  const handleRequeue = async (jobId: string) => {
    setError(null);
    const r = await requeueBatchJobAction(jobId);
    if (r.success) loadRecent();
    else setError(r.error ?? "Requeue failed");
  };

  const handleCancel = async (jobId: string) => {
    setError(null);
    const r = await cancelBatchJobAction(jobId);
    if (r.success) loadRecent();
    else setError(r.error ?? "Cancel failed");
  };

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Batch Generation</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Generate content at scale for a track. Single track per job (no mixed-track). All output saved as draft.
          Duplicate question stems are skipped automatically.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Preset
            </label>
            <select
              value={preset}
              onChange={(e) => {
                const v = e.target.value as BatchPreset;
                setPreset(v);
                // Auto-set track when selecting track-specific preset (preset implies track)
                const pDef = BASE_PRESETS.find((x) => x.value === v);
                let nextConfig = config;
                if (pDef?.rnOnly) {
                  const rn = data.tracks.find((t) => t.slug?.toLowerCase() === "rn");
                  if (rn) nextConfig = { ...config, trackId: rn.id, trackSlug: "rn" };
                } else if (pDef?.fnpOnly) {
                  const fnp = data.tracks.find((t) => t.slug?.toLowerCase() === "fnp");
                  if (fnp) nextConfig = { ...config, trackId: fnp.id, trackSlug: "fnp" };
                } else if (pDef?.pmhnpOnly) {
                  const pmhnp = data.tracks.find((t) => t.slug?.toLowerCase() === "pmhnp");
                  if (pmhnp) nextConfig = { ...config, trackId: pmhnp.id, trackSlug: "pmhnp" };
                } else if (pDef?.lvnOnly) {
                  const lvn = data.tracks.find((t) => t.slug?.toLowerCase() === "lvn");
                  if (lvn) nextConfig = { ...config, trackId: lvn.id, trackSlug: "lvn" };
                }
                if (nextConfig !== config) onConfigChange(nextConfig);
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
            >
              {PRESETS.map((x) => (
                <option key={x.value} value={x.value}>
                  {x.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Track *
            </label>
            <select
              value={config.trackId}
              onChange={(e) => {
                const id = e.target.value;
                const t = data.tracks.find((x) => x.id === id);
                const slug = (t?.slug ?? "rn").toLowerCase() as "lvn" | "rn" | "fnp" | "pmhnp";
                onConfigChange({
                  ...config,
                  trackId: id,
                  trackSlug: slug,
                });
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
            >
              <option value="">Select track</option>
              {data.tracks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {p.contentType === "flashcard_batch" && (
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Flashcard style
              </label>
              <select
                value={flashcardStyle}
                onChange={(e) => setFlashcardStyle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
              >
                {(Object.keys(FLASHCARD_STYLES) as (keyof typeof FLASHCARD_STYLES)[]).map((k) => (
                  <option key={k} value={k}>
                    {FLASHCARD_STYLES[k]}
                  </option>
                ))}
              </select>
            </div>
          )}

          {p.contentType === "question" && (
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Question type
              </label>
              <select
                value={config.itemTypeSlug ?? "single_best_answer"}
                onChange={(e) => onConfigChange({ ...config, itemTypeSlug: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
              >
                {data.questionTypes.map((qt) => (
                  <option key={qt.id} value={qt.slug}>
                    {qt.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Board focus (optional)
            </label>
            <input
              type="text"
              value={boardFocus}
              onChange={(e) => setBoardFocus(e.target.value)}
              placeholder="e.g., NCLEX prioritization"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            Systems (optional – leave empty for all)
          </label>
          <div className="flex flex-wrap gap-2">
            {filteredSystems.map((s) => (
              <label key={s.id} className="inline-flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={systemIds.includes(s.id)}
                  onChange={(e) =>
                    setSystemIds((prev) =>
                      e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id)
                    )
                  }
                  className="rounded border-slate-300"
                />
                {s.name}
              </label>
            ))}
            {filteredSystems.length === 0 && (
              <span className="text-slate-500 text-sm">Select a track first</span>
            )}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            Topics (optional – leave empty for all)
          </label>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {filteredTopics.map((t) => (
              <label key={t.id} className="inline-flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={topicIds.includes(t.id)}
                  onChange={(e) =>
                    setTopicIds((prev) =>
                      e.target.checked ? [...prev, t.id] : prev.filter((id) => id !== t.id)
                    )
                  }
                  className="rounded border-slate-300"
                />
                {t.name}
              </label>
            ))}
            {filteredTopics.length === 0 && config.trackId && (
              <span className="text-slate-500 text-sm">No topics for this track</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="runMode"
              checked={runMode === "queue"}
              onChange={() => setRunMode("queue")}
              className="rounded border-slate-300"
            />
            Queue job
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="runMode"
              checked={runMode === "now"}
              onChange={() => setRunMode("now")}
              className="rounded border-slate-300"
            />
            Run now
          </label>
          <button
            type="button"
            onClick={handleStartBatch}
            disabled={generating || !resolveConfigTrack(config, data.tracks)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            aria-busy={generating}
          >
            {generating && <span className="animate-spin">{Icons.loader}</span>}
            {generating
              ? `Generating ${progress?.completedCount ?? 0}/${progress?.targetCount ?? p.targetCount}…`
              : runMode === "queue"
                ? `Queue: ${p.label}`
                : `Start: ${p.label}`}
          </button>
          <button
            type="button"
            onClick={async () => {
              setProcessingQueue(true);
              setError(null);
              try {
                const r = await processBatchQueueAction(p.contentType === "question" ? questionTypeId : null);
                if (r.processed && r.jobId) {
                  const p2 = await getAIBatchJobProgressAction(r.jobId);
                  setProgress(p2 ?? null);
                }
                if (r.error) setError(r.error);
                loadRecent();
              } catch (e) {
                setError(String(e));
              } finally {
                setProcessingQueue(false);
              }
            }}
            disabled={processingQueue}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-600 text-white text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
          >
            {processingQueue && <span className="animate-spin">{Icons.loader}</span>}
            {processingQueue ? "Processing…" : "Process queue"}
          </button>
        </div>

        {progress && (
          <div className="mt-4 p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Batch status</p>
            <div className="flex flex-wrap gap-4 text-sm items-center">
              <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${statusBadgeClass(progress.status)}`}>
                {statusLabel(progress.status)}
              </span>
              <span>Generated: {progress.generatedCount ?? 0}</span>
              <span className="text-emerald-600">Saved: {progress.completedCount}</span>
              <span className="text-red-600">Failed: {progress.failedCount}</span>
              {progress.skippedDuplicateCount > 0 && (
                <span className="text-amber-600">Skipped: {progress.skippedDuplicateCount}</span>
              )}
            </div>
            <div className="mt-2 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 transition-all"
                style={{
                  width: `${progress.targetCount ? (progress.completedCount / progress.targetCount) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}
      </Card>

      <Card>
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Recent Batch Jobs</h3>
        {recentJobs.length === 0 ? (
          <p className="text-slate-500 text-sm">No batch jobs yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-2 px-3">Track</th>
                  <th className="text-left py-2 px-3">Type</th>
                  <th className="text-left py-2 px-3">Target</th>
                  <th className="text-left py-2 px-3">Generated</th>
                  <th className="text-left py-2 px-3">Saved</th>
                  <th className="text-left py-2 px-3">Failed</th>
                  <th className="text-left py-2 px-3">Skipped</th>
                  <th className="text-left py-2 px-3">Retry</th>
                  <th className="text-left py-2 px-3">Status</th>
                  <th className="text-left py-2 px-3">Started</th>
                  <th className="text-left py-2 px-3">Completed</th>
                  <th className="text-left py-2 px-3">Latest log</th>
                  <th className="text-left py-2 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentJobs.map((j) => (
                  <tr key={j.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-2 px-3">{j.trackName ?? j.trackSlug ?? "—"}</td>
                    <td className="py-2 px-3">{contentLabel(j.contentType)}</td>
                    <td className="py-2 px-3">{j.targetCount}</td>
                    <td className="py-2 px-3">{j.generatedCount ?? 0}</td>
                    <td className="py-2 px-3 text-emerald-600">{j.completedCount}</td>
                    <td className="py-2 px-3 text-red-600">{j.failedCount}</td>
                    <td className="py-2 px-3 text-amber-600">{j.skippedDuplicateCount}</td>
                    <td className="py-2 px-3">{j.retryCount ?? 0}</td>
                    <td className="py-2 px-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${statusBadgeClass(j.status)}`}>
                        {statusLabel(j.status)}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-500 text-xs">
                      {j.startedAt ? new Date(j.startedAt).toLocaleString() : "—"}
                    </td>
                    <td className="py-2 px-3 text-slate-500 text-xs">
                      {j.completedAt ? new Date(j.completedAt).toLocaleString() : "—"}
                    </td>
                    <td className="py-2 px-3 max-w-[180px] truncate text-slate-500" title={j.latestLogMessage ?? undefined}>
                      {j.latestLogMessage ?? "—"}
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex gap-1">
                        {j.status === "failed" && (
                          <button
                            type="button"
                            onClick={() => handleRequeue(j.id)}
                            className="text-xs text-indigo-600 hover:underline"
                          >
                            Requeue
                          </button>
                        )}
                        {j.status === "pending" && (
                          <button
                            type="button"
                            onClick={() => handleCancel(j.id)}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
