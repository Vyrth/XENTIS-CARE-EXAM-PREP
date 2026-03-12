"use client";

import { Icons } from "@/components/ui/icons";
import { GENERATION_PRESETS, type GenerationPreset } from "@/lib/ai/factory/presets";

const TRACK_LABELS: Record<string, string> = {
  lvn: "LVN",
  rn: "RN",
  fnp: "FNP",
  pmhnp: "PMHNP",
};

const CONTENT_LABELS: Record<string, string> = {
  question: "Questions",
  study_guide: "Study Guide",
  flashcard_deck: "Flashcards",
  high_yield_summary: "High-Yield",
  common_confusion: "Confusion",
  board_trap: "Board Trap",
  compare_contrast_summary: "Compare/Contrast",
};

export interface PresetPickerProps {
  onSelect: (preset: GenerationPreset, generateNow?: boolean) => void;
  selectedPresetId?: string | null;
}

export function PresetPicker({ onSelect, selectedPresetId }: PresetPickerProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
        <span className="text-indigo-500">{Icons.sparkles}</span>
        Quick-start presets
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {GENERATION_PRESETS.map((preset) => {
          const isSelected = selectedPresetId === preset.id;
          return (
            <div key={preset.id} className="relative group">
            <button
              type="button"
              onClick={() => onSelect(preset)}
              className={`
                flex flex-col items-start gap-0.5 p-3 rounded-lg border text-left
                transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2
                ${
                  isSelected
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-400"
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600"
                }
              `}
              aria-pressed={isSelected}
              aria-label={`Apply preset: ${preset.name}`}
            >
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {TRACK_LABELS[preset.trackSlug] ?? preset.trackSlug}
              </span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-2">
                {preset.name}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                {CONTENT_LABELS[preset.contentType] ?? preset.contentType}
              </span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(preset, true);
              }}
              className="absolute top-2 right-2 p-1.5 rounded-md bg-indigo-600 text-white opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity hover:bg-indigo-700"
              aria-label={`Apply preset and generate: ${preset.name}`}
              title="Apply & Generate"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
