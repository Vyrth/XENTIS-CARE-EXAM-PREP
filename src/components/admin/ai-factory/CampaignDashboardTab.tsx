"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Icons } from "@/components/ui/icons";
import {
  loadCampaignsAction,
  loadCampaignSummaryAction,
  loadCampaignJobsAction,
  generateLaunchPlanAction,
  launchCampaignNowAction,
  launchLargeCampaignAction,
  launchSeedingCampaignAction,
  pauseCampaignAction,
  resumeCampaignAction,
  cancelCampaignAction,
  retryFailedShardsAction,
  retrySingleJobAction,
  type CampaignSummary,
  type CampaignListItem,
  type CampaignJobRow,
} from "@/app/(app)/actions/ai-campaign";
import type { AIFactoryPageData } from "@/lib/admin/ai-factory-loaders";

const CONTENT_LABELS: Record<string, string> = {
  question: "Questions",
  study_guide: "Study Guides",
  flashcard_deck: "Flashcard Decks",
  flashcard_batch: "Flashcards",
  high_yield_summary: "High-Yield",
  high_yield_batch: "High-Yield Batch",
};

const STATUS_LABELS: Record<string, string> = {
  planned: "Planned",
  running: "Running",
  paused: "Paused",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
  pending: "Pending",
  queued: "Queued",
};

function statusBadgeClass(s: string): string {
  switch (s) {
    case "planned":
    case "pending":
    case "queued":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
    case "running":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "paused":
      return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
    case "completed":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "failed":
    case "cancelled":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    default:
      return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
  }
}

export interface CampaignDashboardTabProps {
  data: AIFactoryPageData;
}

export function CampaignDashboardTab({ data }: CampaignDashboardTabProps) {
  const [campaigns, setCampaigns] = useState<CampaignListItem[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [summary, setSummary] = useState<CampaignSummary | null>(null);
  const [jobs, setJobs] = useState<CampaignJobRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoBanner, setInfoBanner] = useState<string | null>(null);
  const [launchPlanResult, setLaunchPlanResult] = useState<{ shardCount: number; targetTotal: number } | null>(null);
  const [launching, setLaunching] = useState(false);
  const [launchingLarge, setLaunchingLarge] = useState(false);
  const [launchingSeeding, setLaunchingSeeding] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);
  const [drilldownTrack, setDrilldownTrack] = useState<string | "">("");
  const [drilldownContent, setDrilldownContent] = useState<string | "">("");

  const loadCampaigns = useCallback(() => {
    loadCampaignsAction(15).then(setCampaigns);
  }, []);

  const loadSummary = useCallback(
    (id: string) => {
      setLoading(true);
      setError(null);
      loadCampaignSummaryAction(id)
        .then((s) => {
          setSummary(s);
        })
        .catch((e) => setError(String(e)))
        .finally(() => setLoading(false));
    },
    []
  );

  const loadJobs = useCallback(
    (id: string) => {
      loadCampaignJobsAction(id, {
        trackId: drilldownTrack || undefined,
        contentType: drilldownContent || undefined,
      }).then(setJobs);
    },
    [drilldownTrack, drilldownContent]
  );

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  useEffect(() => {
    if (selectedCampaignId) {
      loadSummary(selectedCampaignId);
      loadJobs(selectedCampaignId);
    } else {
      setSummary(null);
      setJobs([]);
    }
  }, [selectedCampaignId, loadSummary, loadJobs]);

  const pollInterval = summary && (summary.status === "running" || summary.status === "paused") ? 5000 : 0;
  useEffect(() => {
    if (!selectedCampaignId || !pollInterval) return;
    const t = setInterval(() => {
      loadSummary(selectedCampaignId);
      loadJobs(selectedCampaignId);
    }, pollInterval);
    return () => clearInterval(t);
  }, [selectedCampaignId, pollInterval, loadSummary, loadJobs]);

  const handleGeneratePlan = async () => {
    setPlanning(true);
    setError(null);
    setLaunchPlanResult(null);
    try {
      const r = await generateLaunchPlanAction({ campaignName: "24h Launch Plan" });
      if (r.success && r.shardCount != null && r.targetTotal != null) {
        setLaunchPlanResult({ shardCount: r.shardCount, targetTotal: r.targetTotal });
        loadCampaigns();
      } else {
        setError(r.error ?? "Plan generation failed");
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setPlanning(false);
    }
  };

  const handleLaunchNow = async () => {
    setLaunching(true);
    setError(null);
    setLaunchPlanResult(null);
    try {
      const r = await launchCampaignNowAction({ campaignName: "24h Campaign" });
      if (r.success && r.campaignId) {
        setSelectedCampaignId(r.campaignId);
        loadCampaigns();
        loadSummary(r.campaignId);
        loadJobs(r.campaignId);
      } else {
        setError(r.error ?? "Launch failed");
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLaunching(false);
    }
  };

  const handleLaunchSeeding = async () => {
    setLaunchingSeeding(true);
    setError(null);
    setLaunchPlanResult(null);
    try {
      const r = await launchSeedingCampaignAction();
      if (r.success && r.campaignId) {
        setSelectedCampaignId(r.campaignId);
        loadCampaigns();
        loadSummary(r.campaignId);
        loadJobs(r.campaignId);
      } else {
        setError(r.error ?? "Launch failed");
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLaunchingSeeding(false);
    }
  };

  const handleLaunchLarge = async () => {
    setLaunchingLarge(true);
    setError(null);
    setLaunchPlanResult(null);
    try {
      const r = await launchLargeCampaignAction();
      if (r.success && r.campaignId) {
        setSelectedCampaignId(r.campaignId);
        loadCampaigns();
        loadSummary(r.campaignId);
        loadJobs(r.campaignId);
      } else {
        setError(r.error ?? "Launch failed");
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLaunchingLarge(false);
    }
  };

  const runAction = async (
    key: string,
    fn: () => Promise<{ success: boolean; error?: string; count?: number; skippedAtCap?: number }>
  ) => {
    if (!selectedCampaignId) return;
    setActionBusy(key);
    setError(null);
    setInfoBanner(null);
    try {
      const r = await fn();
      if (r.success) {
        loadSummary(selectedCampaignId);
        loadJobs(selectedCampaignId);
        loadCampaigns();
        setError(null);
        if (r.skippedAtCap != null && r.skippedAtCap > 0) {
          setInfoBanner(`${r.count} retried. ${r.skippedAtCap} skipped (at retry cap of 5).`);
        } else {
          setInfoBanner(null);
        }
      } else {
        setError(r.error ?? "Action failed");
        setInfoBanner(null);
      }
    } catch (e) {
      setError(String(e));
      setInfoBanner(null);
    } finally {
      setActionBusy(null);
    }
  };

  const trackIdToSlug = new Map(data.tracks.map((t) => [t.id, t.slug ?? t.name]));
  const trackIdToName = new Map(data.tracks.map((t) => [t.id, t.name]));

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Campaign Controls</h2>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <button
            type="button"
            onClick={handleGeneratePlan}
            disabled={planning}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-600 text-white text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
          >
            {planning && <span className="animate-spin">{Icons.loader}</span>}
            {planning ? "Generating plan…" : "Generate 24-hour launch plan"}
          </button>
          <button
            type="button"
            onClick={handleLaunchNow}
            disabled={launching || launchingLarge || launchingSeeding}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {launching && <span className="animate-spin">{Icons.loader}</span>}
            {launching ? "Launching…" : "Launch now"}
          </button>
          <button
            type="button"
            onClick={handleLaunchSeeding}
            disabled={launching || launchingLarge || launchingSeeding}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
          >
            {launchingSeeding && <span className="animate-spin">{Icons.loader}</span>}
            {launchingSeeding ? "Launching…" : "Launch Seeding (RN 2500, FNP 1500, PMHNP 1000, LVN 800)"}
          </button>
          <button
            type="button"
            onClick={handleLaunchLarge}
            disabled={launching || launchingLarge || launchingSeeding}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            {launchingLarge && <span className="animate-spin">{Icons.loader}</span>}
            {launchingLarge ? "Launching…" : "Launch 25k+ campaign"}
          </button>
        </div>
        {launchPlanResult && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 text-sm">
            Plan ready: {launchPlanResult.shardCount} shards, {launchPlanResult.targetTotal} total target. Use &quot;Launch now&quot; to start.
          </div>
        )}
      </Card>

      <Card>
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Select Campaign</h3>
        <select
          value={selectedCampaignId ?? ""}
          onChange={(e) => setSelectedCampaignId(e.target.value || null)}
          className="w-full max-w-md px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
        >
          <option value="">— Select campaign —</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({STATUS_LABELS[c.status] ?? c.status}) — {c.savedTotal}/{c.targetTotal}
            </option>
          ))}
        </select>
      </Card>

      {selectedCampaignId && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            <MetricCard label="Generated" value={summary?.generatedTotal ?? 0} />
            <MetricCard label="Saved" value={summary?.savedTotal ?? 0} className="text-emerald-600" />
            <MetricCard label="Failed" value={summary?.failedTotal ?? 0} className="text-red-600" />
            <MetricCard label="Duplicates" value={summary?.duplicateTotal ?? 0} className="text-amber-600" />
            <MetricCard label="Retries" value={summary?.retryTotal ?? 0} />
            <MetricCard label="Jobs running" value={summary?.jobsRunning ?? 0} className="text-blue-600" />
            <MetricCard label="Queue depth" value={summary?.queueDepth ?? 0} />
            <ThroughputCard summary={summary} />
          </div>

          <Card>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Campaign Actions</h3>
            <div className="flex flex-wrap gap-2">
              {summary?.status === "running" && (
                <button
                  type="button"
                  onClick={() => runAction("pause", () => pauseCampaignAction(selectedCampaignId))}
                  disabled={!!actionBusy}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-sm hover:bg-amber-700 disabled:opacity-50"
                >
                  {actionBusy === "pause" ? "…" : "Pause"}
                </button>
              )}
              {summary?.status === "paused" && (
                <button
                  type="button"
                  onClick={() => runAction("resume", () => resumeCampaignAction(selectedCampaignId))}
                  disabled={!!actionBusy}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-50"
                >
                  {actionBusy === "resume" ? "…" : "Resume"}
                </button>
              )}
              {(summary?.status === "running" || summary?.status === "paused") && (
                <button
                  type="button"
                  onClick={() => runAction("retry", () => retryFailedShardsAction(selectedCampaignId))}
                  disabled={!!actionBusy || (summary?.failedTotal ?? 0) === 0}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                  {actionBusy === "retry" ? "…" : "Retry failed shards"}
                </button>
              )}
              {(summary?.status === "running" || summary?.status === "paused" || summary?.status === "planned") && (
                <button
                  type="button"
                  onClick={() => runAction("cancel", () => cancelCampaignAction(selectedCampaignId))}
                  disabled={!!actionBusy}
                  className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-50"
                >
                  {actionBusy === "cancel" ? "…" : "Cancel campaign"}
                </button>
              )}
            </div>
            {summary && (
              <div className="mt-3 flex items-center gap-2">
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${statusBadgeClass(summary.status)}`}>
                  {STATUS_LABELS[summary.status] ?? summary.status}
                </span>
                {summary.etaMinutes != null && summary.status === "running" && (
                  <span className="text-sm text-slate-500">ETA: ~{summary.etaMinutes} min</span>
                )}
              </div>
            )}
          </Card>

          <Card>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Per-track progress</h3>
            {loading ? (
              <p className="text-slate-500 text-sm">Loading…</p>
            ) : summary?.byTrack ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(summary.byTrack).map(([trackId, stats]) => (
                  <div
                    key={trackId}
                    className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50"
                  >
                    <p className="font-medium text-slate-900 dark:text-white mb-2">
                      {trackIdToName.get(trackId) ?? trackIdToSlug.get(trackId) ?? trackId}
                    </p>
                    <div className="text-sm space-y-1">
                      <p>Target: {stats.target}</p>
                      <p className="text-emerald-600">Saved: {stats.saved}</p>
                      <p className="text-red-600">Failed: {stats.failed}</p>
                      {stats.generated != null && <p>Generated: {stats.generated}</p>}
                    </div>
                    <div className="mt-2 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 transition-all"
                        style={{
                          width: `${stats.target ? Math.min(100, (stats.saved / stats.target) * 100) : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No track data</p>
            )}
          </Card>

          <Card>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">By content type</h3>
            {summary?.byContentType ? (
              <div className="flex flex-wrap gap-3">
                {Object.entries(summary.byContentType).map(([ct, stats]) => (
                  <div
                    key={ct}
                    className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50"
                  >
                    <span className="font-medium">{CONTENT_LABELS[ct] ?? ct}</span>
                    <span className="ml-2 text-slate-500 text-sm">
                      {stats.saved}/{stats.target}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No content type data</p>
            )}
          </Card>

          <Card>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Recent errors</h3>
            {summary?.recentErrors?.length ? (
              <div className="space-y-2">
                {summary.recentErrors.map((e, i) => (
                  <div
                    key={`${e.jobId}-${i}`}
                    className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 text-sm"
                  >
                    <p className="font-medium">
                      {CONTENT_LABELS[e.contentType] ?? e.contentType} · {e.trackSlug ?? "—"}
                    </p>
                    <p className="mt-1 text-red-600 dark:text-red-400 truncate" title={e.errorMessage}>
                      {e.errorMessage ?? "Unknown error"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No recent errors</p>
            )}
          </Card>

          <Card>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Shard / job monitor</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              <select
                value={drilldownTrack}
                onChange={(e) => setDrilldownTrack(e.target.value)}
                className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
              >
                <option value="">All tracks</option>
                {data.tracks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <select
                value={drilldownContent}
                onChange={(e) => setDrilldownContent(e.target.value)}
                className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
              >
                <option value="">All types</option>
                {Object.keys(CONTENT_LABELS).map((ct) => (
                  <option key={ct} value={ct}>
                    {CONTENT_LABELS[ct]}
                  </option>
                ))}
              </select>
            </div>
            {jobs.length === 0 ? (
              <p className="text-slate-500 text-sm">No jobs for this campaign</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-2 px-3">Track</th>
                      <th className="text-left py-2 px-3">Type</th>
                      <th className="text-left py-2 px-3">Target</th>
                      <th className="text-left py-2 px-3">Saved</th>
                      <th className="text-left py-2 px-3">Failed</th>
                      <th className="text-left py-2 px-3">Retries</th>
                      <th className="text-left py-2 px-3">Status</th>
                      <th className="text-left py-2 px-3">Error</th>
                      <th className="text-left py-2 px-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((j) => (
                      <tr key={j.id} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="py-2 px-3">{j.trackName ?? j.trackSlug ?? "—"}</td>
                        <td className="py-2 px-3">{CONTENT_LABELS[j.contentType] ?? j.contentType}</td>
                        <td className="py-2 px-3">{j.targetCount}</td>
                        <td className="py-2 px-3 text-emerald-600">{j.completedCount}</td>
                        <td className="py-2 px-3 text-red-600">{j.failedCount}</td>
                        <td className="py-2 px-3">
                          <span className={j.jobRetryAttempt >= 5 ? "text-amber-600" : ""} title="Job retry attempts">
                            {j.jobRetryAttempt}/5
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${statusBadgeClass(j.status)}`}>
                            {STATUS_LABELS[j.status] ?? j.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 max-w-[200px] truncate text-slate-500" title={j.errorMessage ?? undefined}>
                          {j.errorMessage ?? "—"}
                        </td>
                        <td className="py-2 px-3">
                          {j.status === "failed" && j.jobRetryAttempt < 5 && (
                            <button
                              type="button"
                              onClick={async () => {
                                setRetryingJobId(j.id);
                                setError(null);
                                try {
                                  const r = await retrySingleJobAction(j.id);
                                  if (r.success) {
                                    loadSummary(selectedCampaignId!);
                                    loadJobs(selectedCampaignId!);
                                  } else {
                                    setError(r.error ?? "Retry failed");
                                  }
                                } finally {
                                  setRetryingJobId(null);
                                }
                              }}
                              disabled={!!retryingJobId}
                              className="text-indigo-600 hover:text-indigo-800 text-xs font-medium disabled:opacity-50"
                            >
                              {retryingJobId === j.id ? "…" : "Retry"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {infoBanner && (
        <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-center justify-between">
          <p className="text-amber-800 dark:text-amber-300 text-sm">{infoBanner}</p>
          <button type="button" onClick={() => setInfoBanner(null)} className="text-amber-600 hover:text-amber-800 shrink-0" aria-label="Dismiss">×</button>
        </div>
      )}
      {error && (
        <CampaignErrorAlert message={error} onDismiss={() => setError(null)} />
      )}
    </div>
  );
}

function CampaignErrorAlert({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  const lower = message.toLowerCase();
  const type =
    lower.includes("track") || lower.includes("missing track")
      ? "missing_track"
      : lower.includes("no systems") || lower.includes("no system")
        ? "no_systems"
        : lower.includes("no topics") || lower.includes("no topic")
          ? "no_topics"
          : lower.includes("provider") || lower.includes("api") || lower.includes("rate limit") || lower.includes("openai")
            ? "provider_failure"
            : lower.includes("database") || lower.includes("insert") || lower.includes("db ") || lower.includes("supabase")
              ? "db_failure"
              : "generic";

  const titles: Record<string, string> = {
    missing_track: "Missing track",
    no_systems: "No systems configured",
    no_topics: "No topics configured",
    provider_failure: "Provider / API failure",
    db_failure: "Database insert failure",
    generic: "Error",
  };

  return (
    <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-red-800 dark:text-red-300">{titles[type]}</p>
          <p className="mt-1 text-sm text-red-700 dark:text-red-400">{message}</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 shrink-0"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  className = "",
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`text-lg font-semibold ${className}`}>{value}</p>
    </div>
  );
}

function ThroughputCard({ summary }: { summary: CampaignSummary | null }) {
  if (!summary?.createdAt || summary.savedTotal === 0) {
    return (
      <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
        <p className="text-xs text-slate-500 dark:text-slate-400">Throughput</p>
        <p className="text-lg font-semibold">—</p>
      </div>
    );
  }
  const start = new Date(summary.createdAt).getTime();
  const end = summary.completedAt ? new Date(summary.completedAt).getTime() : Date.now();
  const minutes = Math.max(0.1, (end - start) / 60000);
  const rate = Math.round(summary.savedTotal / minutes);
  return (
    <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
      <p className="text-xs text-slate-500 dark:text-slate-400">Throughput</p>
      <p className="text-lg font-semibold">~{rate}/min</p>
    </div>
  );
}
