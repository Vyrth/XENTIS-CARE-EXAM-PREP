import { Card } from "@/components/ui/Card";
import { MOCK_RECOMMENDATIONS } from "@/data/mock/recommendations";

export default function AdaptiveRecommendationManagerPage() {
  return (
    <div className="p-6 lg:p-8 space-y-8">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        Adaptive Recommendation Manager
      </h1>
      <p className="text-slate-600 dark:text-slate-400">
        Configure recommendation rules. Recommendations are driven by mastery, weak areas, and study patterns.
      </p>

      <Card>
        <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
          Current Recommendation Templates
        </h2>
        <div className="space-y-4">
          {MOCK_RECOMMENDATIONS.map((rec) => (
            <div
              key={rec.id}
              className="p-4 rounded-lg border border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">{rec.title}</p>
                  <p className="text-sm text-slate-500 mt-1">{rec.description}</p>
                  <p className="text-xs text-slate-400 mt-1">Priority: {rec.priority} · Reason: {rec.reason}</p>
                </div>
                <span className="px-2 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-800">
                  {rec.type}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
          Rule Configuration
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          Define when each recommendation type appears: by weak area, by mastery gap, by recency, etc.
        </p>
        <button type="button" className="mt-4 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-sm">
          Configure rules
        </button>
      </Card>
    </div>
  );
}
