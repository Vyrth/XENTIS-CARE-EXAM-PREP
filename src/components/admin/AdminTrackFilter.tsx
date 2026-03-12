"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Suspense } from "react";

export interface AdminTrackFilterProps {
  tracks: { id: string; slug: string; name: string }[];
  /** Current selected track ID from URL (trackId search param) */
  selectedTrackId?: string | null;
  label?: string;
}

function AdminTrackFilterInner({
  tracks,
  selectedTrackId,
  label = "Filter by track",
}: AdminTrackFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleChange = (trackId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (trackId && trackId !== "all") {
      params.set("trackId", trackId);
    } else {
      params.delete("trackId");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="admin-track-filter" className="text-sm font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
        {label}
      </label>
      <select
        id="admin-track-filter"
        value={selectedTrackId ?? "all"}
        onChange={(e) => handleChange(e.target.value)}
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
  );
}

export function AdminTrackFilter(props: AdminTrackFilterProps) {
  return (
    <Suspense fallback={<div className="h-9 w-40 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />}>
      <AdminTrackFilterInner {...props} />
    </Suspense>
  );
}
