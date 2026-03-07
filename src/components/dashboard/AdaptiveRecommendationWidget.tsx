"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { AdaptiveRecommendation } from "@/data/mock/types";

type AdaptiveRecommendationWidgetProps = {
  recommendations: AdaptiveRecommendation[];
};

const priorityColors = {
  high: "border-l-red-500",
  medium: "border-l-amber-500",
  low: "border-l-slate-400",
};

export function AdaptiveRecommendationWidget({ recommendations }: AdaptiveRecommendationWidgetProps) {
  if (recommendations.length === 0) return null;

  return (
    <Card>
      <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
        Recommended for You
      </h2>
      <div className="space-y-3">
        {recommendations.map((rec) => (
          <Link
            key={rec.id}
            href={rec.href ?? "#"}
            className={`block p-4 rounded-xl border-l-4 ${priorityColors[rec.priority]} bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors`}
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
    </Card>
  );
}
