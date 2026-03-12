"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Suspense } from "react";
import type { HighYieldContentType } from "@/lib/admin/high-yield-studio-loaders";

const TYPE_LABELS: Record<HighYieldContentType | "", string> = {
  "": "All types",
  high_yield_summary: "High-Yield Summary",
  common_confusion: "Common Confusion",
  board_trap: "Board Trap",
  compare_contrast_summary: "Compare/Contrast",
};

export interface HighYieldTypeFilterProps {
  selectedType?: string | null;
}

function HighYieldTypeFilterInner({ selectedType }: HighYieldTypeFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleChange = (type: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (type) params.set("type", type);
    else params.delete("type");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <select
      value={selectedType ?? ""}
      onChange={(e) => handleChange(e.target.value)}
      className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
    >
      {Object.entries(TYPE_LABELS).map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}

export function HighYieldTypeFilter(props: HighYieldTypeFilterProps) {
  return (
    <Suspense fallback={<div className="h-9 w-36 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />}>
      <HighYieldTypeFilterInner {...props} />
    </Suspense>
  );
}
