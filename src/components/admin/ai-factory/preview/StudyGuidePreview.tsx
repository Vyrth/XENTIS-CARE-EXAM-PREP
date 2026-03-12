"use client";

import { useState, useMemo, useEffect } from "react";
import { TaxonomyBadge } from "./TaxonomyBadge";
import { PreviewActions } from "./PreviewActions";
import { QualityAlerts } from "./QualityAlerts";
import { checkStudyGuideQuality } from "@/lib/ai/quality-checks";
import { checkDuplicateStudyGuide } from "@/app/(app)/actions/ai-quality";
import type { GenerationConfig } from "@/lib/ai/factory/types";

const INPUT_CLASS =
  "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";
const LABEL_CLASS = "block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1";

export interface SectionDraft {
  title: string;
  slug?: string;
  contentMarkdown: string;
  plainExplanation?: string;
  keyTakeaways?: string[];
  commonTraps?: string[];
  quickReviewBullets?: string[];
  mnemonics?: string[];
  highYield?: boolean;
}

export interface StudyGuideDraft {
  title: string;
  slugSuggestion?: string;
  description: string;
  boardFocus?: string;
  sections: SectionDraft[];
}

export interface StudyGuidePreviewProps {
  config: GenerationConfig;
  draft: StudyGuideDraft;
  onChange: (draft: StudyGuideDraft) => void;
  onSave: () => void;
  onDiscard: () => void;
  onRegenerate?: () => void;
  saving?: boolean;
  regenerating?: boolean;
  mode?: "full" | "section_pack";
  trackName?: string;
  domainName?: string;
  systemName?: string;
  topicName?: string;
}

export function StudyGuidePreview(props: StudyGuidePreviewProps) {
  const {
    config,
    draft,
    onChange,
    onSave,
    onDiscard,
    onRegenerate,
    saving = false,
    regenerating = false,
    mode = "full",
    trackName,
    domainName,
    systemName,
    topicName,
  } = props;

  const [expandedSection, setExpandedSection] = useState<number | null>(0);
  const [duplicateMessage, setDuplicateMessage] = useState<string | undefined>();
  const [duplicateBlocksSave, setDuplicateBlocksSave] = useState(false);

  const quality = useMemo(() => {
    return checkStudyGuideQuality(draft, mode);
  }, [draft, mode]);

  useEffect(() => {
    const title = mode === "full" ? draft.title : draft.sections?.[0]?.title ?? "";
    if (!config.trackId || !title?.trim()) {
      setDuplicateMessage(undefined);
      setDuplicateBlocksSave(false);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      const r = await checkDuplicateStudyGuide(
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
  }, [config.trackId, config.topicId, config.systemId, mode, draft.title, draft.sections]);

  const updateDraft = (partial: Partial<StudyGuideDraft>) => {
    onChange({ ...draft, ...partial });
  };

  const updateSection = (index: number, partial: Partial<SectionDraft>) => {
    const next = [...draft.sections];
    next[index] = { ...next[index], ...partial };
    updateDraft({ sections: next });
  };

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold text-slate-900 dark:text-white">Study Guide Preview</h3>
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
        {mode === "full" && (
          <>
            <div>
              <label className={LABEL_CLASS}>Title</label>
              <input
                type="text"
                value={draft.title}
                onChange={(e) => updateDraft({ title: e.target.value })}
                className={INPUT_CLASS}
                aria-label="Guide title"
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Description</label>
              <textarea
                value={draft.description}
                onChange={(e) => updateDraft({ description: e.target.value })}
                rows={2}
                className={INPUT_CLASS}
                aria-label="Guide description"
              />
            </div>
            {draft.boardFocus && (
              <div>
                <label className={LABEL_CLASS}>Board focus</label>
                <input
                  type="text"
                  value={draft.boardFocus}
                  onChange={(e) => updateDraft({ boardFocus: e.target.value })}
                  className={INPUT_CLASS}
                  aria-label="Board focus"
                />
              </div>
            )}
          </>
        )}

        <div>
          <label className={LABEL_CLASS}>Sections ({draft.sections.length})</label>
          <div className="space-y-2">
            {draft.sections.map((sec, i) => (
              <div
                key={i}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setExpandedSection(expandedSection === i ? null : i)}
                  className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  aria-expanded={expandedSection === i}
                >
                  <span className="font-medium text-slate-900 dark:text-white">
                    {sec.title || `Section ${i + 1}`}
                  </span>
                  {sec.highYield && (
                    <span className="text-xs text-amber-600 dark:text-amber-400">high-yield</span>
                  )}
                  <span className="text-slate-400">{expandedSection === i ? "▼" : "▶"}</span>
                </button>
                {expandedSection === i && (
                  <div className="p-3 pt-0 space-y-3 border-t border-slate-200 dark:border-slate-700">
                    <div>
                      <label className={LABEL_CLASS}>Section title</label>
                      <input
                        type="text"
                        value={sec.title}
                        onChange={(e) => updateSection(i, { title: e.target.value })}
                        className={INPUT_CLASS}
                        aria-label={`Section ${i + 1} title`}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLASS}>Content (Markdown)</label>
                      <textarea
                        value={sec.contentMarkdown}
                        onChange={(e) => updateSection(i, { contentMarkdown: e.target.value })}
                        rows={6}
                        className={`${INPUT_CLASS} font-mono text-xs`}
                        aria-label={`Section ${i + 1} content`}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
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
