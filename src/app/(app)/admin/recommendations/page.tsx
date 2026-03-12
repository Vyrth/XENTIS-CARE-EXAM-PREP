import { Card } from "@/components/ui/Card";

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
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          No recommendation templates configured yet. Rules are computed from adaptive_recommendation_profiles,
          recommended_content_queue, and user_remediation_plans. Configure rules below when ready.
        </p>
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
