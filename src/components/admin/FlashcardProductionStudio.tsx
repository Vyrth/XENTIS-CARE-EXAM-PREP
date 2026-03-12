"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { TrackBadge } from "@/components/admin/TrackBadge";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { AdminTrackSelect } from "@/components/admin/AdminTrackSelect";
import {
  createFlashcardDeck,
  updateFlashcardDeck,
  saveFlashcards,
  deleteFlashcard,
  reorderFlashcards,
  fetchStudyGuideSectionContent,
} from "@/app/(app)/actions/flashcards";
import type {
  AdminFlashcardDeckForEdit,
  AdminFlashcard,
  CardMetadata,
  SystemOption,
  TopicOption,
  StudyGuideSectionOption,
  AISavedFlashcardSet,
} from "@/lib/admin/flashcard-studio-loaders";
import type { ExamTrackOption } from "@/components/admin/AdminTrackSelect";
import type { WorkflowStatus } from "@/types/admin";
import { Icons } from "@/components/ui/icons";
import { AIDraftGeneratorPanel } from "@/components/admin/AIDraftGeneratorPanel";

const INPUT_CLASS =
  "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm";

const DECK_TYPES = [
  { value: "standard", label: "Standard" },
  { value: "high_yield", label: "High Yield" },
  { value: "rapid_recall", label: "Rapid Recall" },
  { value: "compare_contrast", label: "Compare/Contrast" },
  { value: "pharm_focus", label: "Pharm Focus" },
];

const DIFFICULTIES = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

export interface FlashcardProductionStudioProps {
  deckId?: string;
  initialDeck?: AdminFlashcardDeckForEdit | null;
  tracks: ExamTrackOption[];
  systems: SystemOption[];
  topics: TopicOption[];
  studyGuideSections?: StudyGuideSectionOption[];
  aiSavedSets?: AISavedFlashcardSet[];
  defaultTrackId?: string;
}

export function FlashcardProductionStudio({
  deckId,
  initialDeck,
  tracks,
  systems,
  topics,
  studyGuideSections = [],
  aiSavedSets = [],
  defaultTrackId,
}: FlashcardProductionStudioProps) {
  const [trackId, setTrackId] = useState(
    initialDeck?.examTrackId ?? defaultTrackId ?? ""
  );
  const [systemId, setSystemId] = useState(initialDeck?.systemId ?? "");
  const [topicId, setTopicId] = useState(initialDeck?.topicId ?? "");
  const [name, setName] = useState(initialDeck?.name ?? "");
  const [description, setDescription] = useState(
    initialDeck?.description ?? ""
  );
  const [deckType, setDeckType] = useState(initialDeck?.deckType ?? "standard");
  const [difficulty, setDifficulty] = useState(
    initialDeck?.difficulty ?? "medium"
  );
  const [status, setStatus] = useState(initialDeck?.status ?? "draft");
  const [isPublic, setIsPublic] = useState(initialDeck?.isPublic ?? false);
  const [cards, setCards] = useState<AdminFlashcard[]>(
    initialDeck?.cards ?? []
  );
  const [activeCardIdx, setActiveCardIdx] = useState(0);
  const [previewMode, setPreviewMode] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [importModal, setImportModal] = useState<"guide" | "ai" | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [showAIDraft, setShowAIDraft] = useState(false);
  const [guideSections, setGuideSections] = useState<StudyGuideSectionOption[]>(
    studyGuideSections
  );

  const filteredSystems = systems.filter(
    (s) => !trackId || s.examTrackId === trackId
  );
  const filteredTopics = topics.filter((t) => {
    if (!trackId) return true;
    const sysIds = new Set(
      systems.filter((s) => s.examTrackId === trackId).map((s) => s.id)
    );
    return !t.systemIds?.length || t.systemIds.some((sid) => sysIds.has(sid));
  });

  const activeCard = cards[activeCardIdx];

  const updateCard = useCallback(
    (idx: number, updates: Partial<AdminFlashcard>) => {
      setCards((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], ...updates };
        return next;
      });
    },
    []
  );

  const updateCardMetadata = useCallback(
    (idx: number, updates: Partial<CardMetadata>) => {
      setCards((prev) => {
        const next = [...prev];
        const meta = next[idx]?.metadata ?? {};
        next[idx] = { ...next[idx], metadata: { ...meta, ...updates } };
        return next;
      });
    },
    []
  );

  const addCard = useCallback(() => {
    setCards((p) => [
      ...p,
      {
        id: "",
        frontText: "",
        backText: "",
        displayOrder: p.length,
        metadata: {},
      },
    ]);
    setActiveCardIdx(cards.length);
  }, [cards.length]);

  const cloneCard = useCallback(
    (idx: number) => {
      const c = cards[idx];
      const clone: AdminFlashcard = {
        id: "",
        frontText: c.frontText,
        backText: c.backText,
        displayOrder: cards.length,
        metadata: { ...c.metadata },
      };
      setCards((p) => [...p.slice(0, idx + 1), clone, ...p.slice(idx + 1)]);
      setActiveCardIdx(idx + 1);
    },
    [cards]
  );

  const removeCard = useCallback((idx: number) => {
    setCards((p) => p.filter((_, i) => i !== idx));
    setActiveCardIdx(Math.max(0, Math.min(activeCardIdx, cards.length - 2)));
  }, [activeCardIdx, cards.length]);

  const moveCard = useCallback(
    (idx: number, dir: "up" | "down") => {
      const next = idx + (dir === "up" ? -1 : 1);
      if (next < 0 || next >= cards.length) return;
      setCards((p) => {
        const arr = [...p];
        [arr[idx], arr[next]] = [arr[next], arr[idx]];
        return arr.map((c, i) => ({ ...c, displayOrder: i }));
      });
      setActiveCardIdx(next);
    },
    [cards.length]
  );

  const applyBulkEntry = useCallback(() => {
    const lines = bulkText.split("\n").filter((l) => l.trim());
    const newCards: AdminFlashcard[] = lines.map((line, i) => {
      const sep = line.includes("|") ? "|" : "\t";
      const [front, back] = line.split(sep).map((s) => s.trim());
      return {
        id: "",
        frontText: front || "",
        backText: back || front || "",
        displayOrder: cards.length + i,
        metadata: {},
      };
    });
    setCards((p) => [...p, ...newCards]);
    setBulkText("");
    setBulkMode(false);
    setActiveCardIdx(cards.length);
  }, [bulkText, cards.length]);

  const openImportGuide = useCallback(async () => {
    if (!trackId) {
      alert("Select a track first");
      return;
    }
    setImportModal("guide");
    if (guideSections.length === 0) {
      try {
        const res = await fetch(
          `/api/admin/study-guide-sections?trackId=${trackId}`
        );
        const data = await res.json();
        setGuideSections(data.sections ?? []);
      } catch {
        setGuideSections([]);
      }
    }
  }, [trackId, guideSections.length]);

  const handleImportFromGuide = useCallback(
    async (sectionId: string) => {
      setImportLoading(true);
      try {
        const { content } = await fetchStudyGuideSectionContent(sectionId);
        if (!content) {
          alert("Section has no content");
          return;
        }
        const res = await fetch("/api/ai/generate-flashcards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceText: content.slice(0, 10000),
            examTrack: tracks.find((t) => t.id === trackId)?.slug ?? "rn",
            topicId: topicId || undefined,
            systemId: systemId || undefined,
            sourceType: "study_guide",
            sourceId: sectionId,
            numberOfCards: 8,
          }),
        });
        const data = await res.json();
        if (data.success && data.data?.flashcards?.length) {
          const newCards: AdminFlashcard[] = data.data.flashcards.map(
            (f: { front_text: string; back_text: string; hint_text?: string; memory_trick?: string }, i: number) => ({
              id: "",
              frontText: f.front_text,
              backText: f.back_text,
              displayOrder: cards.length + i,
              metadata: {
                hint: f.hint_text,
                memoryTrick: f.memory_trick,
              },
            })
          );
          setCards((p) => [...p, ...newCards]);
          setImportModal(null);
        } else {
          alert(data.error ?? "Failed to generate flashcards");
        }
      } catch (e) {
        alert(String(e));
      } finally {
        setImportLoading(false);
      }
    },
    [trackId, systemId, topicId, cards.length, tracks]
  );

  const handleImportFromAI = useCallback(
    (set: AISavedFlashcardSet) => {
      const list = set.outputData?.flashcards ?? [];
      const newCards: AdminFlashcard[] = list.map((f, i) => ({
        id: "",
        frontText: f.front,
        backText: f.back,
        displayOrder: cards.length + i,
        metadata: {
          hint: f.hint,
          memoryTrick: f.memory_trick,
        },
      }));
      setCards((p) => [...p, ...newCards]);
      setImportModal(null);
    },
    [cards.length]
  );

  const handleSave = useCallback(async () => {
    setErrors([]);
    setSaving(true);
    try {
      const formData = {
        examTrackId: trackId,
        systemId: systemId || null,
        topicId: topicId || null,
        name: name.trim(),
        description: description.trim() || null,
        deckType,
        difficulty,
        status,
        isPublic,
      };

      let dId = deckId;
      if (deckId) {
        const r = await updateFlashcardDeck(deckId, formData);
        if (!r.success) {
          setErrors(r.validationErrors ?? [r.error ?? "Save failed"]);
          return;
        }
      } else {
        const r = await createFlashcardDeck(formData);
        if (!r.success) {
          setErrors(r.validationErrors ?? [r.error ?? "Save failed"]);
          return;
        }
        dId = r.deckId;
      }

      if (!dId) return;

      const cardInputs = cards.map((c, i) => ({
        id: c.id || undefined,
        frontText: c.frontText,
        backText: c.backText,
        metadata: c.metadata,
        displayOrder: i,
      }));

      const r2 = await saveFlashcards(dId, cardInputs);
      if (!r2.success) {
        setErrors([r2.error ?? "Failed to save cards"]);
        return;
      }
      if (!deckId) {
        window.location.href = `/admin/flashcards/${dId}`;
      }
    } finally {
      setSaving(false);
    }
  }, [
    deckId,
    trackId,
    systemId,
    topicId,
    name,
    description,
    deckType,
    difficulty,
    status,
    isPublic,
    cards,
  ]);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/flashcards"
            className="text-slate-600 dark:text-slate-400 hover:underline"
          >
            ← Flashcards
          </Link>
          {deckId && (
            <span className="text-slate-500 text-sm">
              Editing {deckId.slice(0, 8)}…
            </span>
          )}
          {trackId && (
            <TrackBadge
              slug={
                (tracks.find((t) => t.id === trackId)?.slug as
                  | "lvn"
                  | "rn"
                  | "fnp"
                  | "pmhnp") ?? null
              }
            />
          )}
          {initialDeck?.status && (
            <StatusBadge
              status={initialDeck.status as WorkflowStatus}
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPreviewMode(!previewMode)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-sm"
          >
            {previewMode ? "Edit" : "Preview"}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <ul className="text-sm text-red-700 dark:text-red-300 list-disc list-inside">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {previewMode ? (
        <div className="max-w-2xl mx-auto space-y-6">
          <h1 className="font-heading text-xl font-bold text-slate-900 dark:text-white">
            {name || "Untitled Deck"}
          </h1>
          {cards.length === 0 ? (
            <p className="text-slate-500">No cards yet.</p>
          ) : (
            <>
              <Card
                className="min-h-[280px] flex flex-col items-center justify-center cursor-pointer"
                onClick={() => {}}
              >
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">
                  {activeCard ? "Front — tap to flip" : "No card"}
                </p>
                <p className="text-lg text-slate-900 dark:text-white text-center px-6">
                  {activeCard?.frontText || "(Empty)"}
                </p>
              </Card>
              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={() =>
                    setActiveCardIdx((i) => Math.max(0, i - 1))
                  }
                  disabled={activeCardIdx === 0}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-500">
                  {activeCardIdx + 1} / {cards.length}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setActiveCardIdx((i) =>
                      Math.min(cards.length - 1, i + 1)
                    )
                  }
                  disabled={activeCardIdx === cards.length - 1}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <h3 className="font-medium text-slate-900 dark:text-white mb-4">
              Deck metadata
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AdminTrackSelect
                tracks={tracks}
                value={trackId}
                onChange={(id) => {
                  setTrackId(id);
                  setSystemId("");
                  setTopicId("");
                }}
              />
              <div>
                <label className="block text-sm font-medium mb-1">System</label>
                <select
                  value={systemId}
                  onChange={(e) => setSystemId(e.target.value)}
                  className={INPUT_CLASS}
                >
                  <option value="">Select system</option>
                  {filteredSystems.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Topic</label>
                <select
                  value={topicId}
                  onChange={(e) => setTopicId(e.target.value)}
                  className={INPUT_CLASS}
                >
                  <option value="">Select topic</option>
                  {filteredTopics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Deck type
                </label>
                <select
                  value={deckType}
                  onChange={(e) => setDeckType(e.target.value)}
                  className={INPUT_CLASS}
                >
                  {DECK_TYPES.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Difficulty
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className={INPUT_CLASS}
                >
                  {DIFFICULTIES.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className={INPUT_CLASS}
                >
                  <option value="draft">Draft</option>
                  <option value="review">Review</option>
                  <option value="approved">Approved</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Deck title"
                  className={INPUT_CLASS}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Brief description"
                  className={INPUT_CLASS}
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Public (visible to all tracks)</span>
              </label>
            </div>
          </Card>

          {showAIDraft && (
            <AIDraftGeneratorPanel
              draftType="flashcard"
              tracks={tracks}
              systems={systems}
              topics={filteredTopics}
              onFlashcardDraft={(d) => {
                setCards((prev) => {
                  const next = [
                    ...prev,
                    {
                      id: "",
                      frontText: d.frontText,
                      backText: d.backText,
                      displayOrder: prev.length,
                      metadata: {
                        hint: d.hint,
                        memoryTrick: d.memoryTrick,
                      },
                    },
                  ];
                  setActiveCardIdx(next.length - 1);
                  return next;
                });
                setShowAIDraft(false);
              }}
            />
          )}
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <h3 className="font-medium text-slate-900 dark:text-white">
                Cards ({cards.length})
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAIDraft(!showAIDraft)}
                  className="text-sm text-amber-600 hover:underline"
                >
                  {showAIDraft ? "Hide" : "AI"} draft
                </button>
                <button
                  type="button"
                  onClick={() => setBulkMode(!bulkMode)}
                  className="text-sm text-indigo-600 hover:underline"
                >
                  {bulkMode ? "Single" : "Bulk entry"}
                </button>
                <button
                  type="button"
                  onClick={openImportGuide}
                  className="text-sm text-amber-600 hover:underline"
                >
                  Import from guide
                </button>
                <button
                  type="button"
                  onClick={() => setImportModal("ai")}
                  className="text-sm text-emerald-600 hover:underline"
                >
                  Import from AI
                </button>
                <button
                  type="button"
                  onClick={addCard}
                  className="text-sm text-indigo-600 hover:underline"
                >
                  + Add card
                </button>
              </div>
            </div>

            {bulkMode ? (
              <div className="space-y-2">
                <p className="text-xs text-slate-500">
                  One card per line. Use | or tab to separate front and back.
                </p>
                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  rows={12}
                  placeholder="Front | Back&#10;Question 1 | Answer 1&#10;..."
                  className={INPUT_CLASS}
                />
                <button
                  type="button"
                  onClick={applyBulkEntry}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm"
                >
                  Add cards
                </button>
              </div>
            ) : (
              <div className="flex flex-col lg:flex-row gap-6">
                <aside className="lg:w-48 shrink-0">
                  <nav className="space-y-1 max-h-64 overflow-y-auto">
                    {cards.map((c, i) => (
                      <div
                        key={c.id || i}
                        className="flex items-center gap-1 group"
                      >
                        <button
                          type="button"
                          onClick={() => setActiveCardIdx(i)}
                          className={`flex-1 text-left px-2 py-1.5 rounded text-sm truncate ${
                            activeCardIdx === i
                              ? "bg-indigo-100 dark:bg-indigo-900/50 font-medium"
                              : "hover:bg-slate-100 dark:hover:bg-slate-800"
                          }`}
                        >
                          {c.frontText.slice(0, 30) || `Card ${i + 1}`}
                        </button>
                        <div className="flex items-center opacity-0 group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => moveCard(i, "up")}
                            disabled={i === 0}
                            className="p-1 text-slate-500 disabled:opacity-30"
                          >
                            {Icons.chevronUp}
                          </button>
                          <button
                            type="button"
                            onClick={() => moveCard(i, "down")}
                            disabled={i === cards.length - 1}
                            className="p-1 text-slate-500 disabled:opacity-30"
                          >
                            {Icons.chevronDown}
                          </button>
                        </div>
                      </div>
                    ))}
                  </nav>
                </aside>

                <div className="flex-1 min-w-0">
                  {activeCard && (
                    <CardEditor
                      card={activeCard}
                      onUpdate={(u) => updateCard(activeCardIdx, u)}
                      onUpdateMetadata={(u) =>
                        updateCardMetadata(activeCardIdx, u)
                      }
                      onClone={() => cloneCard(activeCardIdx)}
                      onRemove={() => removeCard(activeCardIdx)}
                    />
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {importModal === "guide" && (
        <ImportGuideModal
          sections={guideSections}
          onSelect={handleImportFromGuide}
          onClose={() => setImportModal(null)}
          loading={importLoading}
        />
      )}
      {importModal === "ai" && (
        <ImportAIModal
          sets={aiSavedSets}
          onSelect={handleImportFromAI}
          onClose={() => setImportModal(null)}
        />
      )}
    </div>
  );
}

function CardEditor({
  card,
  onUpdate,
  onUpdateMetadata,
  onClone,
  onRemove,
}: {
  card: AdminFlashcard;
  onUpdate: (u: Partial<AdminFlashcard>) => void;
  onUpdateMetadata: (u: Partial<CardMetadata>) => void;
  onClone: () => void;
  onRemove: () => void;
}) {
  const m = card.metadata ?? {};
  const INPUT = INPUT_CLASS;

  return (
    <div className="space-y-4 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-slate-900 dark:text-white">Card</h4>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClone}
            className="text-xs text-indigo-600 hover:underline"
          >
            Clone
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-red-600 hover:underline"
          >
            Remove
          </button>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Front *
        </label>
        <textarea
          value={card.frontText}
          onChange={(e) => onUpdate({ frontText: e.target.value })}
          rows={2}
          className={INPUT}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Back *
        </label>
        <textarea
          value={card.backText}
          onChange={(e) => onUpdate({ backText: e.target.value })}
          rows={3}
          className={INPUT}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Hint
        </label>
        <input
          type="text"
          value={m.hint ?? ""}
          onChange={(e) => onUpdateMetadata({ hint: e.target.value })}
          className={INPUT}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Memory trick
        </label>
        <input
          type="text"
          value={m.memoryTrick ?? ""}
          onChange={(e) => onUpdateMetadata({ memoryTrick: e.target.value })}
          className={INPUT}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Compare/contrast
        </label>
        <textarea
          value={m.compareContrast ?? ""}
          onChange={(e) =>
            onUpdateMetadata({ compareContrast: e.target.value })
          }
          rows={2}
          className={INPUT}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Rapid recall
        </label>
        <input
          type="text"
          value={m.rapidRecall ?? ""}
          onChange={(e) =>
            onUpdateMetadata({ rapidRecall: e.target.value })
          }
          className={INPUT}
        />
      </div>
    </div>
  );
}

function ImportGuideModal({
  sections,
  onSelect,
  onClose,
  loading,
}: {
  sections: StudyGuideSectionOption[];
  onSelect: (sectionId: string) => void;
  onClose: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-slate-900 dark:text-white">
            Import from study guide section
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700"
          >
            {Icons.x}
          </button>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Select a section. AI will generate flashcards from its content.
        </p>
        <div className="overflow-y-auto flex-1 space-y-2">
          {sections.length === 0 ? (
            <p className="text-slate-500 text-sm">
              No study guide sections found for this track.
            </p>
          ) : (
            sections.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelect(s.id)}
                disabled={loading}
                className="w-full text-left p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <span className="font-medium">{s.sectionTitle}</span>
                <span className="text-slate-500 text-sm block">
                  {s.guideTitle} · {s.contentPreview.slice(0, 80)}…
                </span>
              </button>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

function ImportAIModal({
  sets,
  onSelect,
  onClose,
}: {
  sets: AISavedFlashcardSet[];
  onSelect: (set: AISavedFlashcardSet) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-slate-900 dark:text-white">
            Import from AI / Jade Tutor
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700"
          >
            {Icons.x}
          </button>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Select an AI-generated flashcard set to add to this deck.
        </p>
        <div className="overflow-y-auto flex-1 space-y-2">
          {sets.length === 0 ? (
            <p className="text-slate-500 text-sm">
              No AI-generated flashcard sets found.
            </p>
          ) : (
            sets.map((s) => {
              const count = s.outputData?.flashcards?.length ?? 0;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelect(s)}
                  className="w-full text-left p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <span className="font-medium">
                    {count} cards · {s.sourceContentType ?? "Jade Tutor"}
                  </span>
                  <span className="text-slate-500 text-sm block">
                    {new Date(s.createdAt).toLocaleString()}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}
