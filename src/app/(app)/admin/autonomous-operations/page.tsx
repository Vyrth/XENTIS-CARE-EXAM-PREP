import Link from "next/link";
import { loadAutonomousSettingsAction, loadSourceFrameworksAction, loadBlueprintGapsAction } from "@/app/(app)/actions/autonomous-settings";
import { Card } from "@/components/ui/Card";
import { Icons } from "@/components/ui/icons";
import { AutonomousSettingsForm } from "./AutonomousSettingsForm";
import { AutonomousGenerationPanel } from "./AutonomousGenerationPanel";

export default async function AutonomousOperationsPage() {
  const [settings, frameworks, gaps] = await Promise.all([
    loadAutonomousSettingsAction(),
    loadSourceFrameworksAction(),
    loadBlueprintGapsAction(null),
  ]);

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
          Autonomous Content Operations
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Cadence, source governance, blueprint targets, and auto-publish thresholds.
        </p>
      </div>

      <AutonomousGenerationPanel />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            {Icons.cpu} Cadence & Thresholds
          </h2>
          <AutonomousSettingsForm settings={settings} />
        </Card>

        <Card>
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            {Icons.book} Source Frameworks
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            RN/LVN: NCSBN NCLEX test plans. FNP/PMHNP: ANCC certification outlines. No generic blogs or prep sites.
          </p>
          <ul className="space-y-2">
            {frameworks.map((f) => (
              <li key={f.id} className="flex items-center gap-2 text-sm">
                <span className="font-medium text-slate-900 dark:text-white">{f.name}</span>
                <span className="text-slate-500">({f.slug})</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            {Icons["bar-chart"]} Blueprint Gaps (Top 20)
          </h2>
        {gaps.length === 0 ? (
          <p className="text-slate-500 py-4">No gaps or no data.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-2 font-medium">Track</th>
                  <th className="text-left py-2 font-medium">System/Topic</th>
                  <th className="text-right py-2 font-medium">Current</th>
                  <th className="text-right py-2 font-medium">Target</th>
                  <th className="text-right py-2 font-medium">Gap</th>
                </tr>
              </thead>
              <tbody>
                {gaps.slice(0, 20).map((g, i) => (
                  <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-2">{g.trackSlug}</td>
                    <td className="py-2">{g.systemId ? "System" : "Topic"}</td>
                    <td className="text-right py-2">{g.current}</td>
                    <td className="text-right py-2">{g.target}</td>
                    <td className="text-right py-2 text-amber-600">{g.gap}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-900/10">
          <h3 className="font-medium text-amber-900 dark:text-amber-200 mb-2 flex items-center gap-2">
          {Icons.calendar} Cron Schedules
        </h3>
        <ul className="text-sm text-amber-800 dark:text-amber-300 space-y-1">
          <li>• Every 2h: Process queued shards</li>
          <li>• Every 12h: Autonomous gap-based generation (when enabled)</li>
          <li>• Daily 02:00 UTC: Nightly underfill campaign</li>
          <li>• Sunday 03:00 UTC: Weekly blueprint rebalance</li>
          <li>• 1st of month 04:00 UTC: Monthly low-coverage</li>
        </ul>
      </Card>

      <div className="flex gap-4">
        <Link href="/admin/ai-factory" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
          AI Content Factory →
        </Link>
        <Link href="/admin" className="text-sm text-slate-600 dark:text-slate-400 hover:underline">
          ← Back to Admin
        </Link>
      </div>
    </div>
  );
}
