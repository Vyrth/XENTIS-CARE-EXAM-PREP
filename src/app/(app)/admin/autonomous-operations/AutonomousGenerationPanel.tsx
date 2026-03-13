"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Icons } from "@/components/ui/icons";
import {
  loadAutonomousCadenceAction,
  runAutonomousGenerationAction,
  setAutonomousPausedAction,
  saveAutonomousSettingsAction,
} from "@/app/(app)/actions/autonomous-settings";
import type { AutonomousGenerationCadence, AutonomousRunLog } from "@/lib/admin/autonomous-cadence";

export function AutonomousGenerationPanel() {
  const [cadence, setCadence] = useState<AutonomousGenerationCadence | null>(null);
  const [runLog, setRunLog] = useState<AutonomousRunLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { cadence: c, runLog: r } = await loadAutonomousCadenceAction();
    setCadence(c ?? null);
    setRunLog(r ?? null);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleDryRun = async () => {
    setError(null);
    setRunning(true);
    const { success, result, error: err } = await runAutonomousGenerationAction(true);
    setRunning(false);
    if (err) setError(err);
    if (result) {
      setLastResult(result.log as Record<string, unknown>);
      load();
    }
  };

  const handleRunNow = async () => {
    setError(null);
    setRunning(true);
    const { success, result, error: err } = await runAutonomousGenerationAction(false);
    setRunning(false);
    if (err) setError(err);
    if (result) {
      setLastResult(result.log as Record<string, unknown>);
      load();
    }
  };

  const handlePauseResume = async () => {
    if (!cadence) return;
    const paused = !cadence.paused;
    const { success, error: err } = await setAutonomousPausedAction(paused);
    if (err) setError(err);
    if (success) load();
  };

  const handleToggleEnabled = async () => {
    if (!cadence) return;
    const enabled = !cadence.enabled;
    const updated = { ...cadence, enabled };
    await saveAutonomousSettingsAction("autonomous_generation_cadence", updated);
    load();
  };

  if (loading || !cadence) {
    return (
      <Card>
        <p className="text-sm text-slate-500 py-4">Loading autonomous generation settings…</p>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
        {Icons.sparkles} Autonomous Generation
      </h2>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
        Gap-based recurring generation. Fills content gaps for RN, FNP, PMHNP, LVN. Auto-publishes when quality and evidence gates pass.
      </p>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!cadence.enabled}
              onChange={handleToggleEnabled}
              className="rounded border-slate-300"
            />
            Enabled
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!cadence.paused}
              onChange={handlePauseResume}
              className="rounded border-slate-300"
              disabled={!cadence.enabled}
            />
            Paused
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-500">Last run:</span>{" "}
            {runLog?.lastRunAt ? new Date(runLog.lastRunAt).toLocaleString() : "Never"}
          </div>
          <div>
            <span className="text-slate-500">Next window:</span>{" "}
            {runLog?.nextRunWindow ?? `~${cadence.generationIntervalHours}h`}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleDryRun}
            disabled={running}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-600 text-white text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
          >
            {running ? Icons.loader : null} Dry run
          </button>
          <button
            type="button"
            onClick={handleRunNow}
            disabled={running || cadence.paused}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {running ? Icons.loader : null} Run now
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {lastResult && (
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-sm space-y-1">
            <p className="font-medium text-slate-700 dark:text-slate-300">Last run summary</p>
            <p>Mode: {String(lastResult.mode)}</p>
            {lastResult.skippedReason ? <p className="text-amber-600">Skipped: {String(lastResult.skippedReason)}</p> : null}
            {lastResult.itemsRequested != null ? <p>Items requested: {Number(lastResult.itemsRequested)}</p> : null}
            {lastResult.itemsLaunched != null ? <p>Items launched: {Number(lastResult.itemsLaunched)}</p> : null}
            {lastResult.campaignId ? <p>Campaign ID: {String(lastResult.campaignId)}</p> : null}
          </div>
        )}

        <details className="text-sm">
          <summary className="cursor-pointer text-slate-600 dark:text-slate-400">Cadence config</summary>
          <pre className="mt-2 p-3 rounded bg-slate-100 dark:bg-slate-800 overflow-x-auto text-xs">
            {JSON.stringify(
              {
                gapAnalysisIntervalHours: cadence.gapAnalysisIntervalHours,
                generationIntervalHours: cadence.generationIntervalHours,
                maxJobsPerRun: cadence.maxJobsPerRun,
                maxItemsPerRun: cadence.maxItemsPerRun,
                priorityOrder: cadence.priorityOrder,
                trackEnabled: cadence.trackEnabled,
                contentTypeEnabled: cadence.contentTypeEnabled,
                perRunCaps: Object.fromEntries(
                  Object.entries(cadence.contentTypeCaps).map(([k, v]) => [k, v.perRunPerTrack])
                ),
              },
              null,
              2
            )}
          </pre>
        </details>
      </div>
    </Card>
  );
}
