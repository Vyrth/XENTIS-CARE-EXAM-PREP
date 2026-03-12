"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Icons } from "@/components/ui/icons";
import type { AdaptiveRecommendation } from "@/data/mock/types";

type AdaptiveRecommendationWidgetProps = {
  recommendations: AdaptiveRecommendation[];
};

const priorityColors = {
  high: "border-l-rose-500 bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-50 dark:hover:bg-rose-950/30",
  medium: "border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-50 dark:hover:bg-amber-950/30",
  low: "border-l-indigo-400 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800",
};

export function AdaptiveRecommendationWidget({ recommendations }: AdaptiveRecommendationWidgetProps) {
  if (recommendations.length === 0) {
    return (
      <Card variant="elevated" padding="none" className="overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-indigo-500/20 to-violet-500/20 rounded-t-card" />
        <div className="p-6">
          <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
            Recommended for You
          </h2>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 dark:bg-indigo-400/10 flex items-center justify-center mb-3 [&>svg]:w-6 [&>svg]:h-6 text-indigo-600 dark:text-indigo-400">
              {Icons["sparkles"]}
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Recommendations will appear as you build activity.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
              Answer questions and complete study guides to get personalized suggestions.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card variant="elevated" padding="none" className="overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-indigo-500/20 to-violet-500/20 rounded-t-card" />
      <div className="p-6">
        <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
          Recommended for You
        </h2>
        <div className="space-y-3">
          {recommendations.map((rec) => (
            <Link
              key={rec.id}
              href={rec.href ?? "#"}
              className={`block p-4 rounded-xl border-l-4 ${priorityColors[rec.priority]} transition-colors`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {rec.title}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    {rec.description}
                  </p>
                </div>
                <Badge
                  variant={rec.priority === "high" ? "error" : rec.priority === "medium" ? "warning" : "neutral"}
                  size="sm"
                >
                  {rec.priority}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </Card>
  );
}
