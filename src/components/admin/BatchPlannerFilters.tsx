"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Suspense } from "react";

export interface BatchPlannerFiltersProps {
  tracks: { id: string; slug: string; name: string }[];
  selectedTrackId?: string | null;
  selectedStatus?: string | null;
}

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In progress" },
  { value: "under_review", label: "Under review" },
  { value: "completed", label: "Completed" },
];

function BatchPlannerFiltersInner({
  tracks,
  selectedTrackId,
  selectedStatus,
}: BatchPlannerFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleChange = (key: "trackId" | "status", value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <label htmlFor="bp-track" className="text-sm font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
          Track
        </label>
        <select
          id="bp-track"
          value={selectedTrackId ?? "all"}
          onChange={(e) => handleChange("trackId", e.target.value === "all" ? "" : e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
        >
          <option value="all">All tracks</option>
          {tracks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <label htmlFor="bp-status" className="text-sm font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
          Status
        </label>
        <select
          id="bp-status"
          value={selectedStatus ?? ""}
          onChange={(e) => handleChange("status", e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value || "all"} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function BatchPlannerFilters(props: BatchPlannerFiltersProps) {
  return (
    <Suspense fallback={<div className="h-9 w-64 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />}>
      <BatchPlannerFiltersInner {...props} />
    </Suspense>
  );
}
