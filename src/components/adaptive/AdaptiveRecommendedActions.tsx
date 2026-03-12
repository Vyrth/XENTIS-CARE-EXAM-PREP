"use client";

import { memo } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Icons } from "@/components/ui/icons";

export interface AdaptiveRecommendedActionsProps {
  trackSlug: string;
  weakSystemIds?: string[];
  weakDomainIds?: string[];
}

export const AdaptiveRecommendedActions = memo(function AdaptiveRecommendedActions({
  trackSlug,
  weakSystemIds = [],
  weakDomainIds = [],
}: AdaptiveRecommendedActionsProps) {
  const firstWeakSystem = weakSystemIds[0];
  const firstWeakDomain = weakDomainIds[0];

  const actions = [
    {
      href: "/flashcards",
      label: "Flashcards",
      icon: "layers",
      description: "Review key concepts",
    },
    {
      href: "/study-guides",
      label: "Study Guides",
      icon: "book-open",
      description: "Deep dive into topics",
    },
    {
      href: "/ai-tutor",
      label: "Remediate with Jade Tutor",
      icon: "sparkles",
      description: "Track-scoped remediation brain",
    },
    {
      href: firstWeakSystem
        ? `/practice/${trackSlug}?systemId=${firstWeakSystem}`
        : "/questions",
      label: "Targeted Practice",
      icon: "clipboard-list",
      description: firstWeakSystem ? "Focus on weak systems" : "Practice questions",
    },
  ];

  return (
    <Card padding="lg">
      <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
        Recommended Next Steps
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {actions.map((a) => {
          const iconEl = Icons[a.icon as keyof typeof Icons] ?? Icons["layout-dashboard"];
          return (
            <Link
              key={a.href}
              href={a.href}
              className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 [&>svg]:w-5 [&>svg]:h-5">
                {iconEl}
              </div>
              <div>
                <p className="font-medium text-slate-900 dark:text-white">{a.label}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{a.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </Card>
  );
});
