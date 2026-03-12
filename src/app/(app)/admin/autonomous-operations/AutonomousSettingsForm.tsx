"use client";

import { useState, useEffect } from "react";
import { saveAutonomousSettingsAction } from "@/app/(app)/actions/autonomous-settings";
import type { AutonomousSettings } from "@/lib/admin/autonomous-operations";

export function AutonomousSettingsForm({ settings }: { settings: AutonomousSettings | null }) {
  const [cadence, setCadence] = useState(settings?.cadence ?? {});
  const [autoPublish, setAutoPublish] = useState(settings?.autoPublish ?? {});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setCadence(settings.cadence ?? {});
      setAutoPublish(settings.autoPublish ?? {});
    }
  }, [settings]);

  const save = async (key: string, value: Record<string, unknown>) => {
    setSaving(key);
    await saveAutonomousSettingsAction(key, value);
    setSaving(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Cadence</h3>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!cadence.nightlyUnderfillEnabled}
            onChange={(e) => {
              const next = { ...cadence, nightlyUnderfillEnabled: e.target.checked };
              setCadence(next);
              save("cadence", next);
            }}
          />
          Nightly underfill
        </label>
        <label className="flex items-center gap-2 text-sm mt-1">
          <input
            type="checkbox"
            checked={!!cadence.weeklyRebalanceEnabled}
            onChange={(e) => {
              const next = { ...cadence, weeklyRebalanceEnabled: e.target.checked };
              setCadence(next);
              save("cadence", next);
            }}
          />
          Weekly rebalance
        </label>
        <label className="flex items-center gap-2 text-sm mt-1">
          <input
            type="checkbox"
            checked={!!cadence.monthlyLowCoverageEnabled}
            onChange={(e) => {
              const next = { ...cadence, monthlyLowCoverageEnabled: e.target.checked };
              setCadence(next);
              save("cadence", next);
            }}
          />
          Monthly low-coverage
        </label>
      </div>

      <div>
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Auto-Publish</h3>
        <div className="flex items-center gap-2 text-sm">
          <span>Min quality score:</span>
          <input
            type="number"
            min={0}
            max={100}
            value={autoPublish.minQualityScore ?? 75}
            className="w-16 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
            onChange={(e) => {
              const next = { ...autoPublish, minQualityScore: parseInt(e.target.value, 10) || 75 };
              setAutoPublish(next);
              save("auto_publish", next);
            }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Above: auto-publish. Below borderline: review queue. Below reject: reject.
        </p>
      </div>
    </div>
  );
}
