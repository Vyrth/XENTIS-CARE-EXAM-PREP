"use client";

import type { QuestionRendererProps } from "./index";

export function HotspotRenderer({ question, response, onChange, disabled }: QuestionRendererProps) {
  const selected = response?.type === "hotspot" ? response.value : [];
  const regions = question.hotspotRegions ?? [
    { id: "r1", label: "Region A" },
    { id: "r2", label: "Region B" },
    { id: "r3", label: "Region C" },
  ];

  const toggle = (id: string) => {
    if (disabled) return;
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    onChange({ type: "hotspot", value: next });
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-xl min-h-[200px] flex items-center justify-center">
        <span className="text-slate-500">[Hotspot image — click regions]</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {regions.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => toggle(r.id)}
            disabled={disabled}
            className={`px-3 py-2 rounded-lg text-sm ${
              selected.includes(r.id)
                ? "bg-indigo-600 text-white"
                : "border border-slate-200 dark:border-slate-700"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}
