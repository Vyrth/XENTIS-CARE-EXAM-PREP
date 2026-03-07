import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";

export default function AnalyticsReviewConsolePage() {
  const metrics = [
    { label: "Active users (7d)", value: "1,234" },
    { label: "Questions answered (7d)", value: "12,456" },
    { label: "Study sessions (7d)", value: "3,890" },
    { label: "Avg session length", value: "24 min" },
  ];

  const systemUsage = [
    { name: "Cardiovascular", pct: 32 },
    { name: "Respiratory", pct: 22 },
    { name: "Renal", pct: 18 },
    { name: "Psychiatric", pct: 28 },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        Analytics Review Console
      </h1>
      <p className="text-slate-600 dark:text-slate-400">
        Platform usage, content performance, and engagement metrics.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <Card key={m.label} padding="sm">
            <p className="text-sm text-slate-500">{m.label}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{m.value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-6">
          Question Usage by System
        </h2>
        <div className="space-y-4">
          {systemUsage.map((s) => (
            <div key={s.name}>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-600 dark:text-slate-400">{s.name}</span>
                <span className="font-medium">{s.pct}%</span>
              </div>
              <ProgressBar value={s.pct} size="sm" />
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
          Content Performance
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          Top-performing questions, study guides, and videos. Identify content that needs improvement.
        </p>
        <button type="button" className="mt-4 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-sm">
          View detailed report
        </button>
      </Card>
    </div>
  );
}
