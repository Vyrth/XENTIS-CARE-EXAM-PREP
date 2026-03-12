"use client";

import { useState, useMemo, useEffect } from "react";
import { TaxonomyBadge } from "./TaxonomyBadge";
import { PreviewActions } from "./PreviewActions";
import { QualityAlerts } from "./QualityAlerts";
import { checkFlashcardDeckQuality } from "@/lib/ai/quality-checks";
import { checkDuplicateFlashcardDeck } from "@/app/(app)/actions/ai-quality";
import type { GenerationConfig } from "@/lib/ai/factory/types";

const INPUT_CLASS =
  "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";
const LABEL_CLASS = "block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1";

export interface CardDraft {
  frontText: string;
  backText: string;
  hint?: string;
  memoryTrick?: string;
}

export interface FlashcardDeckDraft {
  name: string;
  description?: string;
  deckType?: string;
  difficulty?: string;
  cards: CardDraft[];
}

export interface FlashcardPreviewProps {
  config: GenerationConfig;
  draft: FlashcardDeckDraft;
  onChange: (draft: FlashcardDeckDraft) => void;
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

export function FlashcardPreview({
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
}: FlashcardPreviewProps) {
  const [expandedCard, setExpandedCard] = useState<number | null>(0);
  const [duplicateMessages, setDuplicateMessages] = useState<string[]>([]);
  const [duplicateBlocksSave, setDuplicateBlocksSave] = useState(false);

  const quality = useMemo(() => checkFlashcardDeckQuality(draft), [draft]);

  useEffect(() => {
    const fronts = (draft.cards ?? []).map((c) => c?.frontText?.trim() ?? "").filter(Boolean);
    if (!config.trackId || fronts.length === 0) {
      setDuplicateMessages([]);
      setDuplicateBlocksSave(false);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      const r = await checkDuplicateFlashcardDeck(
        config.trackId!,
        config.topicId ?? null,
        config.systemId ?? null,
        fronts
      );
      if (!cancelled && r.messages.length > 0) {
        setDuplicateMessages(r.messages);
        setDuplicateBlocksSave(r.hasIdenticalDuplicate ?? false);
      } else if (!cancelled) {
        setDuplicateMessages([]);
        setDuplicateBlocksSave(false);
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [config.trackId, config.topicId, config.systemId, draft.cards]);

  const updateDraft = (partial: Partial<FlashcardDeckDraft>) => {
    onChange({ ...draft, ...partial });
  };

  const updateCard = (index: number, partial: Partial<CardDraft>) => {
    const next = [...draft.cards];
    next[index] = { ...next[index], ...partial };
    updateDraft({ cards: next });
  };

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold text-slate-900 dark:text-white">Flashcard Deck Preview</h3>
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
        duplicateMessage={duplicateMessages.length > 0 ? duplicateMessages.join("; ") : undefined}
        duplicateBlocksSave={duplicateBlocksSave}
        boardRelevance={quality.boardRelevance}
      />

      <div className="space-y-4">
        <div>
          <label className={LABEL_CLASS}>Deck name</label>
          <input
            type="text"
            value={draft.name}
            onChange={(e) => updateDraft({ name: e.target.value })}
            className={INPUT_CLASS}
            aria-label="Deck name"
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>Description</label>
          <textarea
            value={draft.description ?? ""}
            onChange={(e) => updateDraft({ description: e.target.value || undefined })}
            rows={2}
            className={INPUT_CLASS}
            aria-label="Deck description"
          />
        </div>
        <div className="flex gap-2 text-sm text-slate-600 dark:text-slate-400">
          <span>
            Mode: {draft.deckType === "high_yield_clinical" ? "High-yield clinical" : "Rapid recall"}
          </span>
          <span>•</span>
          <span>{draft.cards.length} cards</span>
        </div>

        <div>
          <label className={LABEL_CLASS}>Cards</label>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {draft.cards.map((card, i) => (
              <div
                key={i}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setExpandedCard(expandedCard === i ? null : i)}
                  className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  aria-expanded={expandedCard === i}
                >
                  <span className="text-sm text-slate-700 dark:text-slate-300 truncate">
                    {card.frontText.slice(0, 60)}
                    {card.frontText.length > 60 ? "…" : ""}
                  </span>
                  <span className="text-slate-400 shrink-0 ml-2">{expandedCard === i ? "▼" : "▶"}</span>
                </button>
                {expandedCard === i && (
                  <div className="p-3 pt-0 space-y-3 border-t border-slate-200 dark:border-slate-700">
                    <div>
                      <label className={LABEL_CLASS}>Front</label>
                      <textarea
                        value={card.frontText}
                        onChange={(e) => updateCard(i, { frontText: e.target.value })}
                        rows={2}
                        className={INPUT_CLASS}
                        aria-label={`Card ${i + 1} front`}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLASS}>Back</label>
                      <textarea
                        value={card.backText}
                        onChange={(e) => updateCard(i, { backText: e.target.value })}
                        rows={2}
                        className={INPUT_CLASS}
                        aria-label={`Card ${i + 1} back`}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLASS}>Hint (optional)</label>
                      <input
                        type="text"
                        value={card.hint ?? ""}
                        onChange={(e) => updateCard(i, { hint: e.target.value || undefined })}
                        className={INPUT_CLASS}
                        aria-label={`Card ${i + 1} hint`}
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
