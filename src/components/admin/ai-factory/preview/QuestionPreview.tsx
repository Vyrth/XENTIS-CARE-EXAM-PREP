"use client";

import { useMemo, useEffect, useState } from "react";
import { TaxonomyBadge } from "./TaxonomyBadge";
import { PreviewActions } from "./PreviewActions";
import { QualityAlerts } from "./QualityAlerts";
import { checkQuestionQuality } from "@/lib/ai/quality-checks";
import { checkDuplicateQuestion } from "@/app/(app)/actions/ai-quality";
import type { GenerationConfig } from "@/lib/ai/factory/types";

const INPUT_CLASS =
  "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";
const LABEL_CLASS = "block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1";

export interface QuestionDraft {
  stem: string;
  leadIn?: string;
  instructions?: string;
  options: { key: string; text: string; isCorrect: boolean; distractorRationale?: string }[];
  rationale?: string;
  itemType?: string;
  difficulty?: number;
}

export interface QuestionPreviewProps {
  config: GenerationConfig;
  draft: QuestionDraft;
  onChange: (draft: QuestionDraft) => void;
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

export function QuestionPreview({
  config,
  draft,
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
}: QuestionPreviewProps) {
  const quality = useMemo(() => {
    return checkQuestionQuality({
      stem: draft.stem,
      rationale: draft.rationale,
      options: draft.options,
      itemType: draft.itemType ?? config.itemTypeSlug,
      difficulty: draft.difficulty ?? config.targetDifficulty,
    });
  }, [draft, config.itemTypeSlug, config.targetDifficulty]);

  const [duplicateMessage, setDuplicateMessage] = useState<string | undefined>();
  const [duplicateBlocksSave, setDuplicateBlocksSave] = useState(false);
  useEffect(() => {
    if (!config.trackId || !draft.stem?.trim()) {
      setDuplicateMessage(undefined);
      setDuplicateBlocksSave(false);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      const r = await checkDuplicateQuestion(config.trackId!, config.topicId ?? null, draft.stem);
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
  }, [config.trackId, config.topicId, draft.stem]);

  const updateDraft = (partial: Partial<QuestionDraft>) => {
    onChange({ ...draft, ...partial });
  };

  const updateOption = (index: number, partial: Partial<QuestionDraft["options"][0]>) => {
    const next = [...draft.options];
    next[index] = { ...next[index], ...partial };
    updateDraft({ options: next });
  };

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold text-slate-900 dark:text-white">Question Preview</h3>
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

      <div className="space-y-4">
        <div>
          <label className={LABEL_CLASS}>Stem</label>
          <textarea
            value={draft.stem}
            onChange={(e) => updateDraft({ stem: e.target.value })}
            rows={4}
            className={INPUT_CLASS}
            placeholder="Question stem..."
            aria-label="Question stem"
          />
        </div>

        {draft.leadIn != null && draft.leadIn !== "" && (
          <div>
            <label className={LABEL_CLASS}>Lead-in</label>
            <input
              type="text"
              value={draft.leadIn}
              onChange={(e) => updateDraft({ leadIn: e.target.value })}
              className={INPUT_CLASS}
              aria-label="Lead-in"
            />
          </div>
        )}

        {draft.instructions != null && draft.instructions !== "" && (
          <div>
            <label className={LABEL_CLASS}>Instructions</label>
            <input
              type="text"
              value={draft.instructions}
              onChange={(e) => updateDraft({ instructions: e.target.value })}
              className={INPUT_CLASS}
              aria-label="Instructions"
            />
          </div>
        )}

        <div>
          <label className={LABEL_CLASS}>Answer choices</label>
          <div className="space-y-3">
            {draft.options.map((opt, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg border ${
                  opt.isCorrect
                    ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/20"
                    : "border-slate-200 dark:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-sm font-medium text-slate-600 dark:text-slate-400">
                    {opt.key}
                  </span>
                  <label className="flex items-center gap-1.5 text-xs">
                    <input
                      type="checkbox"
                      checked={opt.isCorrect}
                      onChange={(e) => updateOption(i, { isCorrect: e.target.checked })}
                      className="rounded border-slate-300"
                      aria-label={`Mark option ${opt.key} as correct`}
                    />
                    Correct
                  </label>
                </div>
                <textarea
                  value={opt.text}
                  onChange={(e) => updateOption(i, { text: e.target.value })}
                  rows={2}
                  className={`${INPUT_CLASS} text-sm`}
                  placeholder="Option text"
                  aria-label={`Option ${opt.key} text`}
                />
                <div className="mt-2">
                  <label className="text-xs text-slate-500 dark:text-slate-400">Distractor rationale</label>
                  <textarea
                    value={opt.distractorRationale ?? ""}
                    onChange={(e) => updateOption(i, { distractorRationale: e.target.value || undefined })}
                    rows={1}
                    className={`${INPUT_CLASS} text-sm mt-0.5`}
                    placeholder="Why this is wrong (optional)"
                    aria-label={`Distractor rationale for ${opt.key}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className={LABEL_CLASS}>Rationale</label>
          <textarea
            value={draft.rationale ?? ""}
            onChange={(e) => updateDraft({ rationale: e.target.value || undefined })}
            rows={4}
            className={INPUT_CLASS}
            placeholder="Explanation of correct answer..."
            aria-label="Rationale"
          />
        </div>
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
