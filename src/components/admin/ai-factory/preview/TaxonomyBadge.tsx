"use client";

import type { GenerationConfig } from "@/lib/ai/factory/types";

export interface TaxonomyBadgeProps {
  config: GenerationConfig;
  trackName?: string;
  domainName?: string;
  systemName?: string;
  topicName?: string;
  className?: string;
}

export function TaxonomyBadge({
  config,
  trackName,
  domainName,
  systemName,
  topicName,
  className = "",
}: TaxonomyBadgeProps) {
  const track = trackName ?? config.trackSlug?.toUpperCase() ?? "—";
  const domain = domainName ?? config.domainName ?? null;
  const system = systemName ?? config.systemName ?? null;
  const topic = topicName ?? config.topicName ?? null;

  const parts = [track];
  if (domain) parts.push(domain);
  if (system) parts.push(system);
  if (topic) parts.push(topic);

  return (
    <div
      className={`flex flex-wrap gap-1.5 text-xs ${className}`}
      role="group"
      aria-label="Content taxonomy assignment"
    >
      <span className="font-medium text-slate-500 dark:text-slate-400">Assignment:</span>
      {parts.map((p, i) => (
        <span
          key={i}
          className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-medium text-slate-700 dark:text-slate-300"
        >
          {p}
        </span>
      ))}
    </div>
  );
}
