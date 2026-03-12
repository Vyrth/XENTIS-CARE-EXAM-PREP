"use client";

import type { GenerationConfig, ExamTrackSlug } from "@/lib/ai/factory/types";

export interface FieldErrors {
  trackId?: string;
  domainId?: string;
  systemId?: string;
  topicId?: string;
  objective?: string;
  targetDifficulty?: string;
  itemTypeSlug?: string;
  batchCount?: string;
  saveStatus?: string;
  /** Uncategorized validation errors */
  other?: string;
}

export interface GenerationConfigPanelProps {
  config: GenerationConfig;
  onChange: (config: GenerationConfig) => void;
  tracks: { id: string; slug: string; name: string }[];
  systems: { id: string; slug: string; name: string; examTrackId: string }[];
  topics: { id: string; slug: string; name: string; domainId: string; systemIds?: string[] }[];
  domains?: { id: string; slug: string; name: string }[];
  /** Inline validation errors per field */
  fieldErrors?: FieldErrors;
  /** Which fields to show */
  showDomain?: boolean;
  showSystem?: boolean;
  showTopic?: boolean;
  showObjective?: boolean;
  showDifficulty?: boolean;
  showItemType?: boolean;
  showBatchCount?: boolean;
  showSaveStatus?: boolean;
  showStudyGuideMode?: boolean;
  showBoardFocus?: boolean;
  showSectionCount?: boolean;
  showFlashcardMode?: boolean;
  showCardCount?: boolean;
  showSourceText?: boolean;
  questionTypes?: { id: string; slug: string; name: string }[];
}

const INPUT_CLASS =
  "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-500 dark:focus:border-indigo-500 transition-colors";

const LABEL_CLASS = "block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1";

export function GenerationConfigPanel({
  config,
  onChange,
  tracks,
  systems,
  topics,
  domains = [],
  showDomain = false,
  showSystem = true,
  showTopic = true,
  showObjective = true,
  showDifficulty = true,
  showItemType = false,
  showBatchCount = false,
  showSaveStatus = true,
  showStudyGuideMode = false,
  showBoardFocus = false,
  showSectionCount = false,
  showFlashcardMode = false,
  showCardCount = false,
  showSourceText = false,
  questionTypes = [],
  fieldErrors = {},
}: GenerationConfigPanelProps) {
  const filteredSystems = config.trackId
    ? systems.filter((s) => s.examTrackId === config.trackId)
    : systems;
  const trackSystemIds = new Set(filteredSystems.map((s) => s.id));

  let filteredTopics = config.trackId
    ? topics.filter((t) => !t.systemIds?.length || t.systemIds.some((sid) => trackSystemIds.has(sid)))
    : topics;

  if (config.domainId) {
    filteredTopics = filteredTopics.filter((t) => t.domainId === config.domainId);
  }
  if (config.systemId) {
    filteredTopics = filteredTopics.filter(
      (t) => !t.systemIds?.length || t.systemIds.includes(config.systemId!)
    );
  }

  const update = (partial: Partial<GenerationConfig>) => {
    onChange({ ...config, ...partial });
  };

  const handleTrackChange = (trackId: string) => {
    const track = tracks.find((t) => t.id === trackId);
    const slug = (track?.slug ?? "rn").toLowerCase() as ExamTrackSlug;
    update({
      trackId,
      trackSlug: slug,
      systemId: undefined,
      systemName: undefined,
      topicId: undefined,
      topicName: undefined,
    });
  };

  const handleDomainChange = (domainId: string) => {
    const domain = domains.find((d) => d.id === domainId);
    update({
      domainId: domainId || undefined,
      domainName: domain?.name,
      topicId: undefined,
      topicName: undefined,
    });
  };

  const handleSystemChange = (systemId: string) => {
    const sys = systems.find((s) => s.id === systemId);
    update({
      systemId: systemId || undefined,
      systemName: sys?.name,
      topicId: undefined,
      topicName: undefined,
    });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div>
        <label htmlFor="gen-track" className={LABEL_CLASS}>
          Track *
        </label>
        <select
          id="gen-track"
          value={config.trackId ?? ""}
          onChange={(e) => handleTrackChange(e.target.value)}
          className={`${INPUT_CLASS} ${fieldErrors.trackId ? "border-red-500 dark:border-red-500" : ""}`}
          aria-required
          aria-invalid={!!fieldErrors.trackId}
          aria-describedby={fieldErrors.trackId ? "gen-track-error" : undefined}
          aria-label="Select exam track"
        >
          <option value="">Select track</option>
          {tracks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        {fieldErrors.trackId && (
          <p id="gen-track-error" className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
            {fieldErrors.trackId}
          </p>
        )}
      </div>

      {showDomain && domains.length > 0 && (
        <div>
          <label htmlFor="gen-domain" className={LABEL_CLASS}>
            Domain
          </label>
          <select
            id="gen-domain"
            value={config.domainId ?? ""}
            onChange={(e) => handleDomainChange(e.target.value)}
            className={INPUT_CLASS}
            aria-label="Select domain"
          >
            <option value="">Any</option>
            {domains.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {showSystem && (
        <div>
          <label htmlFor="gen-system" className={LABEL_CLASS}>
            System
          </label>
          <select
            id="gen-system"
            value={config.systemId ?? ""}
            onChange={(e) => handleSystemChange(e.target.value)}
            className={INPUT_CLASS}
            aria-label="Select system (filtered by track)"
          >
            <option value="">Any</option>
            {filteredSystems.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {showTopic && (
        <div>
          <label htmlFor="gen-topic" className={LABEL_CLASS}>
            Topic
          </label>
          <select
            id="gen-topic"
            value={config.topicId ?? ""}
            onChange={(e) => {
              const id = e.target.value || undefined;
              const top = topics.find((t) => t.id === id);
              update({ topicId: id, topicName: top?.name });
            }}
            className={INPUT_CLASS}
            aria-label="Select topic"
          >
            <option value="">Any</option>
            {filteredTopics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {showObjective && (
        <div className="sm:col-span-2 lg:col-span-4">
          <label htmlFor="gen-objective" className={LABEL_CLASS}>
            Objective / Focus
          </label>
          <input
            id="gen-objective"
            type="text"
            value={config.objective ?? ""}
            onChange={(e) => update({ objective: e.target.value || undefined })}
            placeholder="Optional learning objective or focus area"
            className={INPUT_CLASS}
            aria-label="Learning objective"
          />
        </div>
      )}

      {showDifficulty && (
        <div>
          <label htmlFor="gen-difficulty" className={LABEL_CLASS}>
            Difficulty (1–5)
          </label>
          <select
            id="gen-difficulty"
            value={config.targetDifficulty ?? ""}
            onChange={(e) =>
              update({
                targetDifficulty: e.target.value ? (Number(e.target.value) as 1 | 2 | 3 | 4 | 5) : undefined,
              })
            }
            className={`${INPUT_CLASS} ${fieldErrors.targetDifficulty ? "border-red-500 dark:border-red-500" : ""}`}
            aria-invalid={!!fieldErrors.targetDifficulty}
            aria-describedby={fieldErrors.targetDifficulty ? "gen-difficulty-error" : undefined}
            aria-label="Difficulty level"
          >
            <option value="">—</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          {fieldErrors.targetDifficulty && (
            <p id="gen-difficulty-error" className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
              {fieldErrors.targetDifficulty}
            </p>
          )}
        </div>
      )}

      {showItemType && questionTypes.length > 0 && (
        <div>
          <label htmlFor="gen-item-type" className={LABEL_CLASS}>
            Question type *
          </label>
          <select
            id="gen-item-type"
            value={config.itemTypeSlug ?? "single_best_answer"}
            onChange={(e) => update({ itemTypeSlug: e.target.value || undefined })}
            className={`${INPUT_CLASS} ${fieldErrors.itemTypeSlug ? "border-red-500 dark:border-red-500" : ""}`}
            aria-required={showItemType}
            aria-invalid={!!fieldErrors.itemTypeSlug}
            aria-describedby={fieldErrors.itemTypeSlug ? "gen-item-type-error" : undefined}
            aria-label="Question type"
          >
            {questionTypes.map((qt) => (
              <option key={qt.id} value={qt.slug}>
                {qt.name}
              </option>
            ))}
          </select>
          {fieldErrors.itemTypeSlug && (
            <p id="gen-item-type-error" className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
              {fieldErrors.itemTypeSlug}
            </p>
          )}
        </div>
      )}

      {showBatchCount && (
        <div>
          <label htmlFor="gen-batch-count" className={LABEL_CLASS}>
            Count
          </label>
          <input
            id="gen-batch-count"
            type="number"
            min={1}
            max={9999}
            value={config.batchCount ?? 1}
            onChange={(e) => update({ batchCount: Math.min(9999, Math.max(1, Number(e.target.value) || 1)) })}
            className={`${INPUT_CLASS} ${fieldErrors.batchCount ? "border-red-500 dark:border-red-500" : ""}`}
            aria-invalid={!!fieldErrors.batchCount}
            aria-describedby={fieldErrors.batchCount ? "gen-batch-count-error" : undefined}
            aria-label="Batch count"
          />
          {fieldErrors.batchCount && (
            <p id="gen-batch-count-error" className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
              {fieldErrors.batchCount}
            </p>
          )}
        </div>
      )}

      {showStudyGuideMode && (
        <div>
          <label htmlFor="gen-study-mode" className={LABEL_CLASS}>
            Mode
          </label>
          <select
            id="gen-study-mode"
            value={config.studyGuideMode ?? "full"}
            onChange={(e) =>
              update({ studyGuideMode: (e.target.value as "full" | "section_pack") || "full" })
            }
            className={INPUT_CLASS}
            aria-label="Study guide mode"
          >
            <option value="full">Full guide</option>
            <option value="section_pack">Section pack</option>
          </select>
        </div>
      )}

      {showBoardFocus && (
        <div>
          <label htmlFor="gen-board-focus" className={LABEL_CLASS}>
            Board focus
          </label>
          <input
            id="gen-board-focus"
            type="text"
            value={config.boardFocus ?? config.objective ?? ""}
            onChange={(e) => update({ boardFocus: e.target.value || undefined })}
            placeholder="e.g., NCLEX prioritization"
            className={INPUT_CLASS}
            aria-label="Board focus area"
          />
        </div>
      )}

      {showSectionCount && (
        <div>
          <label htmlFor="gen-section-count" className={LABEL_CLASS}>
            Sections (2–8)
          </label>
          <input
            id="gen-section-count"
            type="number"
            min={2}
            max={8}
            value={config.sectionCount ?? 4}
            onChange={(e) =>
              update({ sectionCount: Math.min(8, Math.max(2, Number(e.target.value) || 4)) })
            }
            className={INPUT_CLASS}
            aria-label="Section count"
          />
        </div>
      )}

      {showFlashcardMode && (
        <div>
          <label htmlFor="gen-flashcard-mode" className={LABEL_CLASS}>
            Deck mode
          </label>
          <select
            id="gen-flashcard-mode"
            value={config.flashcardDeckMode ?? "rapid_recall"}
            onChange={(e) =>
              update({ flashcardDeckMode: (e.target.value as "rapid_recall" | "high_yield_clinical") || "rapid_recall" })
            }
            className={INPUT_CLASS}
            aria-label="Flashcard deck mode"
          >
            <option value="rapid_recall">Rapid recall</option>
            <option value="high_yield_clinical">High-yield clinical</option>
          </select>
        </div>
      )}

      {showCardCount && (
        <div>
          <label htmlFor="gen-card-count" className={LABEL_CLASS}>
            Cards (3–25)
          </label>
          <input
            id="gen-card-count"
            type="number"
            min={3}
            max={25}
            value={config.cardCount ?? 8}
            onChange={(e) =>
              update({ cardCount: Math.min(25, Math.max(3, Number(e.target.value) || 8)) })
            }
            className={INPUT_CLASS}
            aria-label="Card count"
          />
        </div>
      )}

      {showSourceText && (
        <div className="sm:col-span-2 lg:col-span-4">
          <label htmlFor="gen-source-text" className={LABEL_CLASS}>
            Source text (study guide)
          </label>
          <textarea
            id="gen-source-text"
            value={config.sourceText ?? ""}
            onChange={(e) => update({ sourceText: e.target.value || undefined })}
            placeholder="Paste study guide content to generate cards from…"
            rows={4}
            className={INPUT_CLASS}
            aria-label="Source text for generation"
          />
        </div>
      )}

      {showSaveStatus && (
        <div>
          <label htmlFor="gen-save-status" className={LABEL_CLASS}>
            Save as
          </label>
          <select
            id="gen-save-status"
            value={config.saveStatus ?? "draft"}
            onChange={(e) =>
              update({ saveStatus: (e.target.value as "draft" | "editor_review") || "draft" })
            }
            className={`${INPUT_CLASS} ${fieldErrors.saveStatus ? "border-red-500 dark:border-red-500" : ""}`}
            aria-invalid={!!fieldErrors.saveStatus}
            aria-describedby={fieldErrors.saveStatus ? "gen-save-status-error" : undefined}
            aria-label="Save status"
          >
            <option value="draft">Draft</option>
            <option value="editor_review">Editor review</option>
          </select>
          {fieldErrors.saveStatus && (
            <p id="gen-save-status-error" className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
              {fieldErrors.saveStatus}
            </p>
          )}
        </div>
      )}

      {fieldErrors.other && (
        <div className="sm:col-span-2 lg:col-span-4">
          <p className="text-xs text-red-600 dark:text-red-400" role="alert">
            {fieldErrors.other}
          </p>
        </div>
      )}
    </div>
  );
}
