"use client";

import { useMemo, useEffect, useState } from "react";
import { TaxonomyBadge } from "./TaxonomyBadge";
import { PreviewActions } from "./PreviewActions";
import { QualityAlerts } from "./QualityAlerts";
import { checkHighYieldQuality } from "@/lib/ai/quality-checks";
import { checkDuplicateHighYieldTitle } from "@/app/(app)/actions/ai-quality";
import type { GenerationConfig } from "@/lib/ai/factory/types";

const INPUT_CLASS =
  "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";
const LABEL_CLASS = "block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1";

type HighYieldContentType = "high_yield_summary" | "common_confusion" | "board_trap" | "compare_contrast_summary";

const TYPE_LABELS: Record<HighYieldContentType, string> = {
  high_yield_summary: "High-yield summary",
  common_confusion: "Common confusion",
  board_trap: "Board trap",
  compare_contrast_summary: "Compare/contrast",
};

export interface HighYieldPreviewProps {
  config: GenerationConfig;
  draft: Record<string, unknown>;
  contentType: HighYieldContentType;
  onChange: (draft: Record<string, unknown>) => void;
  onSave: () => void;
  onDiscard: () => void;
  onRegenerate?: () => void;
  saving?: boolean;
  regenerating?: boolean;
  trackName?: string;
  domainName?: string;
  systemName?: string;
  topicName?: string;
}

export function HighYieldPreview({
  config,
  draft,
  contentType,
  onChange,
  onSave,
  onDiscard,
  onRegenerate,
  saving = false,
  regenerating = false,
  trackName,
  domainName,
  systemName,
  topicName,
}: HighYieldPreviewProps) {
  const quality = useMemo(() => checkHighYieldQuality(draft, contentType), [draft, contentType]);

  const [duplicateMessage, setDuplicateMessage] = useState<string | undefined>();
  const [duplicateBlocksSave, setDuplicateBlocksSave] = useState(false);
  useEffect(() => {
    const title = String(draft.title ?? "").trim();
    if (!config.trackId || !title) {
      setDuplicateMessage(undefined);
      setDuplicateBlocksSave(false);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      const r = await checkDuplicateHighYieldTitle(
        config.trackId!,
        config.topicId ?? null,
        config.systemId ?? null,
        title
      );
      if (!cancelled && r.isDuplicate && r.message) {
        setDuplicateMessage(r.message);
        setDuplicateBlocksSave(r.isIdentical ?? false);
      } else if (!cancelled) {
        setDuplicateMessage(undefined);
        setDuplicateBlocksSave(false);
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [config.trackId, config.topicId, config.systemId, draft.title]);

  const update = (key: string, value: unknown) => {
    onChange({ ...draft, [key]: value });
  };

  const title = String(draft.title ?? "");
  const explanation = String(draft.explanation ?? "");
  const whyHighYield = draft.whyHighYield ? String(draft.whyHighYield) : "";
  const highYieldScore = draft.highYieldScore ?? (draft as { highYieldScore?: number }).highYieldScore;

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold text-slate-900 dark:text-white">
          {TYPE_LABELS[contentType]} Preview
        </h3>
        <TaxonomyBadge
          config={config}
          trackName={trackName}
          domainName={domainName}
          systemName={systemName}
          topicName={topicName}
        />
      </div>

      <QualityAlerts
        errors={quality.errors}
        warnings={quality.warnings}
        duplicateMessage={duplicateMessage}
        duplicateBlocksSave={duplicateBlocksSave}
        boardRelevance={quality.boardRelevance}
      />

      <div className="flex gap-2 text-sm">
        <span className="text-slate-500 dark:text-slate-400">Type:</span>
        <span className="font-medium text-slate-700 dark:text-slate-300">
          {TYPE_LABELS[contentType]}
        </span>
        {highYieldScore != null && (
          <>
            <span className="text-slate-400">•</span>
            <span className="text-slate-600 dark:text-slate-400">
              Ranking: {String(highYieldScore)}
            </span>
          </>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label className={LABEL_CLASS}>Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => update("title", e.target.value)}
            className={INPUT_CLASS}
            aria-label="Title"
          />
        </div>

        <div>
          <label className={LABEL_CLASS}>Explanation</label>
          <textarea
            value={explanation}
            onChange={(e) => update("explanation", e.target.value)}
            rows={6}
            className={INPUT_CLASS}
            aria-label="Explanation"
          />
        </div>

        {contentType === "high_yield_summary" && (
          <div>
            <label className={LABEL_CLASS}>Why high-yield</label>
            <textarea
              value={whyHighYield}
              onChange={(e) => update("whyHighYield", e.target.value)}
              rows={2}
              className={INPUT_CLASS}
              aria-label="Why high-yield"
            />
          </div>
        )}

        {contentType === "common_confusion" && (
          <>
            <div>
              <label className={LABEL_CLASS}>Concept A</label>
              <input
                type="text"
                value={String(draft.conceptA ?? "")}
                onChange={(e) => update("conceptA", e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Concept B</label>
              <input
                type="text"
                value={String(draft.conceptB ?? "")}
                onChange={(e) => update("conceptB", e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Key difference</label>
              <textarea
                value={String(draft.keyDifference ?? "")}
                onChange={(e) => update("keyDifference", e.target.value)}
                rows={2}
                className={INPUT_CLASS}
              />
            </div>
          </>
        )}

        {contentType === "board_trap" && (
          <>
            <div>
              <label className={LABEL_CLASS}>Trap description</label>
              <textarea
                value={String(draft.trapDescription ?? (draft as { trap_description?: string }).trap_description ?? "")}
                onChange={(e) => update("trapDescription", e.target.value)}
                rows={3}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Correct approach</label>
              <textarea
                value={String(draft.correctApproach ?? (draft as { correct_approach?: string }).correct_approach ?? "")}
                onChange={(e) => update("correctApproach", e.target.value)}
                rows={3}
                className={INPUT_CLASS}
              />
            </div>
          </>
        )}

        {contentType === "compare_contrast_summary" && (
          <>
            <div>
              <label className={LABEL_CLASS}>Concept A</label>
              <input
                type="text"
                value={String(draft.conceptA ?? "")}
                onChange={(e) => update("conceptA", e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Concept B</label>
              <input
                type="text"
                value={String(draft.conceptB ?? "")}
                onChange={(e) => update("conceptB", e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Key difference</label>
              <textarea
                value={String(draft.keyDifference ?? "")}
                onChange={(e) => update("keyDifference", e.target.value)}
                rows={3}
                className={INPUT_CLASS}
              />
            </div>
          </>
        )}
      </div>

      <PreviewActions
        onSave={onSave}
        onDiscard={onDiscard}
        onRegenerate={onRegenerate}
        saving={saving}
        regenerating={regenerating}
        saveDisabled={!quality.valid || duplicateBlocksSave}
      />
    </div>
  );
}
