"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Icons } from "@/components/ui/icons";
import { generatePilotItemAction, savePilotItemAction } from "@/app/(app)/actions/ai-pilot";
import type { PilotGenerationSpec, PilotPreviewItem } from "@/app/(app)/actions/ai-pilot";
import type { PilotTrackOptions } from "@/lib/admin/pilot-loaders";
import type { AIFactoryPageData } from "@/lib/admin/ai-factory-loaders";

export interface PilotGenerationTabProps {
  data: AIFactoryPageData;
  pilotOptions: PilotTrackOptions[];
}

/** Pilot spec: questions, study guides, flashcard decks, high-yield per track */
const FULL_PILOT_SPEC = {
  questionsPerTrack: 10,
  studyGuidesPerTrack: 2,
  flashcardDecksPerTrack: 1,
  highYieldPerTrack: 3,
};

const QUICK_PILOT_SPEC = {
  questionsPerTrack: 2,
  studyGuidesPerTrack: 1,
  flashcardDecksPerTrack: 1,
  highYieldPerTrack: 1,
};

function buildPilotSpecs(
  pilotOptions: PilotTrackOptions[],
  quick: boolean
): PilotGenerationSpec[] {
  const spec = quick ? QUICK_PILOT_SPEC : FULL_PILOT_SPEC;
  const specs: PilotGenerationSpec[] = [];

  for (const track of pilotOptions) {
    if (track.topics.length === 0) continue;

    let topicIdx = 0;
    const nextTopic = () => {
      const t = track.topics[topicIdx % track.topics.length];
      topicIdx++;
      return t;
    };

    for (let i = 0; i < spec.questionsPerTrack; i++) {
      const t = nextTopic();
      specs.push({
        trackId: track.trackId,
        trackSlug: track.trackSlug,
        trackName: track.trackName,
        systemId: t.systemId,
        systemName: t.systemName,
        topicId: t.id,
        topicName: t.name,
        contentType: "question",
      });
    }
    for (let i = 0; i < spec.studyGuidesPerTrack; i++) {
      const t = nextTopic();
      specs.push({
        trackId: track.trackId,
        trackSlug: track.trackSlug,
        trackName: track.trackName,
        systemId: t.systemId,
        systemName: t.systemName,
        topicId: t.id,
        topicName: t.name,
        contentType: "study_guide",
      });
    }
    for (let i = 0; i < spec.flashcardDecksPerTrack; i++) {
      const t = nextTopic();
      specs.push({
        trackId: track.trackId,
        trackSlug: track.trackSlug,
        trackName: track.trackName,
        systemId: t.systemId,
        systemName: t.systemName,
        topicId: t.id,
        topicName: t.name,
        contentType: "flashcard_deck",
      });
    }
    const hyTypes: PilotGenerationSpec["highYieldType"][] = [
      "high_yield_summary",
      "common_confusion",
      "board_trap",
    ];
    for (let i = 0; i < spec.highYieldPerTrack; i++) {
      const t = nextTopic();
      specs.push({
        trackId: track.trackId,
        trackSlug: track.trackSlug,
        trackName: track.trackName,
        systemId: t.systemId,
        systemName: t.systemName,
        topicId: t.id,
        topicName: t.name,
        contentType: "high_yield",
        highYieldType: hyTypes[i % hyTypes.length],
      });
    }
  }

  return specs;
}

function getPreviewSummary(item: PilotPreviewItem): string {
  if (item.error) return item.error;
  const d = item.draft as Record<string, unknown>;
  if (item.contentType === "question") {
    const stem = (d.stem as string) ?? "";
    return stem.slice(0, 80) + (stem.length > 80 ? "…" : "");
  }
  if (item.contentType === "study_guide") {
    return (d.title as string) ?? "Study guide";
  }
  if (item.contentType === "flashcard_deck") {
    const cards = (d.cards as unknown[])?.length ?? 0;
    return `${d.name ?? "Deck"} (${cards} cards)`;
  }
  if (item.contentType === "high_yield") {
    return (d.title as string) ?? "High-yield";
  }
  return "—";
}

function getContentTypeLabel(ct: string): string {
  const m: Record<string, string> = {
    question: "Question",
    study_guide: "Study guide",
    flashcard_deck: "Flashcard deck",
    high_yield: "High-yield",
  };
  return m[ct] ?? ct;
}

export function PilotGenerationTab({ data, pilotOptions }: PilotGenerationTabProps) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previews, setPreviews] = useState<PilotPreviewItem[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Record<string, number> | null>(null);

  const runPilot = useCallback(
    async (quick: boolean) => {
      const specs = buildPilotSpecs(pilotOptions, quick);
      if (specs.length === 0) {
        setError("No topics found for any track. Ensure taxonomy is seeded.");
        return;
      }

      setError(null);
      setPreviews([]);
      setSelected(new Set());
      setRunning(true);
      setProgress({ current: 0, total: specs.length });

      const results: PilotPreviewItem[] = [];
      for (let i = 0; i < specs.length; i++) {
        setProgress({ current: i + 1, total: specs.length });
        const result = await generatePilotItemAction(specs[i], data);
        if (result.item) {
          results.push(result.item);
          setPreviews([...results]);
        } else if (result.error) {
          results.push({
            spec: specs[i],
            contentType: specs[i].contentType,
            draft: {},
            auditId: null,
            error: result.error,
          });
          setPreviews([...results]);
        }
      }

      setRunning(false);
      setSelected(new Set(results.map((_, i) => i)));
    },
    [pilotOptions, data]
  );

  const toggleSelect = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(previews.map((_, i) => i).filter((i) => !previews[i].error)));
  };

  const selectNone = () => setSelected(new Set());

  const handleSaveSelected = async () => {
    const toSave = [...selected].sort((a, b) => a - b).map((i) => previews[i]);
    const valid = toSave.filter((p) => !p.error && p.auditId);
    if (valid.length === 0) {
      setError("Select valid items to save (items with errors cannot be saved).");
      return;
    }

    setError(null);
    setSaving(true);
    const counts: Record<string, number> = {};
    let saved = 0;

    for (const item of valid) {
      const result = await savePilotItemAction(
        {
          contentType: item.contentType,
          spec: item.spec,
          draft: item.draft,
          auditId: item.auditId,
          highYieldType: item.spec.highYieldType,
        },
        data
      );
      if (result.success && result.contentId) {
        saved++;
        const key = `${item.spec.trackSlug}:${item.contentType}`;
        counts[key] = (counts[key] ?? 0) + 1;
      }
    }

    setSummary(counts);
    setSaving(false);
    if (saved > 0) {
      router.refresh();
    }
  };

  const totalTopics = pilotOptions.reduce((acc, t) => acc + t.topics.length, 0);

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="font-semibold text-slate-900 dark:text-white mb-2">Pilot Generation Run</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          First live production test. Uses real taxonomy from Supabase. Generates content with track-specific tone
          (RN=NCLEX, FNP=primary care, PMHNP=psychiatry, LVN=fundamentals). Preview before save; save selected only.
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => runPilot(false)}
            disabled={running || totalTopics === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {running && <span className="animate-spin">{Icons.loader}</span>}
            {running ? `Generating ${progress.current}/${progress.total}…` : "Run full pilot"}
          </button>
          <button
            type="button"
            onClick={() => runPilot(true)}
            disabled={running || totalTopics === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            Quick pilot (fewer items)
          </button>
        </div>

        {totalTopics === 0 && (
          <p className="mt-3 text-sm text-amber-600 dark:text-amber-400">
            No topics found. Run taxonomy seeds (systems, topics, topic_system_links).
          </p>
        )}
      </Card>

      {previews.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-slate-900 dark:text-white">
              Generated previews ({previews.length})
            </h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Select all valid
              </button>
              <button
                type="button"
                onClick={selectNone}
                className="text-sm text-slate-500 hover:underline"
              >
                Clear selection
              </button>
              <button
                type="button"
                onClick={handleSaveSelected}
                disabled={saving || selected.size === 0}
                className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? "Saving…" : `Save selected (${selected.size})`}
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {previews.map((item, idx) => (
              <label
                key={idx}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${
                  item.error
                    ? "border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10"
                    : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(idx)}
                  onChange={() => toggleSelect(idx)}
                  disabled={!!item.error}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                    <span className="font-medium text-indigo-600 dark:text-indigo-400">
                      {item.spec.trackName}
                    </span>
                    <span>{getContentTypeLabel(item.contentType)}</span>
                    <span>{item.spec.topicName}</span>
                  </div>
                  <p className="text-sm text-slate-900 dark:text-white mt-0.5 truncate">
                    {getPreviewSummary(item)}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </Card>
      )}

      {summary && Object.keys(summary).length > 0 && (
        <Card>
          <h3 className="font-medium text-slate-900 dark:text-white mb-2">Saved summary</h3>
          <div className="flex flex-wrap gap-4 text-sm">
            {Object.entries(summary).map(([key, count]) => (
              <span key={key} className="text-slate-600 dark:text-slate-400">
                {key}: {count}
              </span>
            ))}
          </div>
        </Card>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
