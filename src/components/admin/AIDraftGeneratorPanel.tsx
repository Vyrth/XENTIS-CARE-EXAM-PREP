"use client";

import { useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { generateAdminDraft } from "@/app/(app)/actions/admin-drafts";
import type { AdminDraftParams } from "@/lib/ai/admin-drafts";
import type { QuestionOptionInput } from "@/lib/admin/question-validation";
import { Icons } from "@/components/ui/icons";

const TRACK_SLUGS = ["lvn", "rn", "fnp", "pmhnp"] as const;

export interface AIDraftGeneratorPanelProps {
  draftType: "question" | "distractor_rationale" | "study_section" | "flashcard" | "mnemonic" | "high_yield_summary";
  tracks: { id: string; slug: string; name: string }[];
  systems: { id: string; slug: string; name: string; examTrackId?: string }[];
  topics?: { id: string; slug: string; name: string }[];
  /** For question: question type slug */
  itemTypeSlug?: string;
  /** For distractor_rationale: prefill from form */
  optionText?: string;
  correctOptionText?: string;
  stem?: string;
  /** For mnemonic: concept to memorize */
  conceptOrText?: string;
  /** Callbacks to apply generated draft to form */
  onQuestionDraft?: (draft: {
    stem: string;
    leadIn?: string;
    instructions?: string;
    options: QuestionOptionInput[];
    rationale?: string;
  }) => void;
  onDistractorRationale?: (rationale: string) => void;
  onStudySectionDraft?: (draft: { title: string; contentMarkdown: string; keyTakeaways?: string[]; mnemonics?: string[] }) => void;
  onFlashcardDraft?: (draft: { frontText: string; backText: string; hint?: string; memoryTrick?: string }) => void;
  onMnemonicDraft?: (draft: { conceptSummary: string; mnemonic: string; whyItWorks: string; rapidRecallVersion: string; boardTip: string }) => void;
  onHighYieldDraft?: (draft: { title: string; explanation: string; whyHighYield?: string; commonConfusion?: string }) => void;
}

const INPUT_CLASS =
  "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm";

export function AIDraftGeneratorPanel({
  draftType,
  tracks,
  systems,
  topics = [],
  itemTypeSlug,
  optionText,
  correctOptionText,
  stem,
  conceptOrText,
  onQuestionDraft,
  onDistractorRationale,
  onStudySectionDraft,
  onFlashcardDraft,
  onMnemonicDraft,
  onHighYieldDraft,
}: AIDraftGeneratorPanelProps) {
  const [trackId, setTrackId] = useState("");
  const [systemId, setSystemId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [objective, setObjective] = useState("");
  const [targetDifficulty, setTargetDifficulty] = useState<number | "">("");
  const [conceptInput, setConceptInput] = useState(conceptOrText ?? "");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<unknown>(null);

  const track = trackId ? (tracks.find((t) => t.id === trackId)?.slug as "lvn" | "rn" | "fnp" | "pmhnp") ?? "rn" : "rn";
  const filteredSystems = trackId ? systems.filter((s) => s.examTrackId === trackId) : systems;
  const filteredTopics = trackId && topics.length ? topics : [];

  const buildParams = useCallback((): AdminDraftParams => {
    const sys = systems.find((s) => s.id === systemId);
    const top = topics.find((t) => t.id === topicId);
    return {
      track: TRACK_SLUGS.includes(track as (typeof TRACK_SLUGS)[number]) ? (track as "lvn" | "rn" | "fnp" | "pmhnp") : "rn",
      trackId: trackId || tracks[0]?.id || "",
      systemId: systemId || undefined,
      systemName: sys?.name,
      topicId: topicId || undefined,
      topicName: top?.name,
      objective: objective.trim() || undefined,
      targetDifficulty: typeof targetDifficulty === "number" && targetDifficulty >= 1 && targetDifficulty <= 5 ? (targetDifficulty as 1 | 2 | 3 | 4 | 5) : undefined,
      itemType: itemTypeSlug,
    };
  }, [track, trackId, systemId, topicId, objective, targetDifficulty, itemTypeSlug, systems, topics, tracks]);

  const handleGenerate = useCallback(async () => {
    setError(null);
    setPreview(null);
    const params = buildParams();
    if (!params.trackId) {
      setError("Select a track");
      return;
    }

    setGenerating(true);
    try {
      const result = await generateAdminDraft({
        type: draftType,
        params,
        optionText,
        correctOptionText,
        stem,
        conceptOrText: conceptInput.trim() || conceptOrText,
      });
      if (result.success && result.output) {
        setPreview(result.output);
      } else {
        setError(result.error ?? "Generation failed");
      }
    } finally {
      setGenerating(false);
    }
  }, [draftType, buildParams, optionText, correctOptionText, stem, conceptInput, conceptOrText]);

  const handleApply = useCallback(() => {
    if (!preview || typeof preview !== "object") return;
    const p = preview as { type: string; data: unknown };
    if (p.type === "question" && "data" in p && p.data && typeof p.data === "object") {
      const d = p.data as { stem: string; leadIn?: string; instructions?: string; options: QuestionOptionInput[]; rationale?: string };
      onQuestionDraft?.(d);
    } else if (p.type === "distractor_rationale" && "data" in p && p.data && typeof p.data === "object") {
      const d = p.data as { distractorRationale: string };
      onDistractorRationale?.(d.distractorRationale);
    } else if (p.type === "study_section" && "data" in p && p.data && typeof p.data === "object") {
      const d = p.data as { title: string; contentMarkdown: string; keyTakeaways?: string[]; mnemonics?: string[] };
      onStudySectionDraft?.(d);
    } else if (p.type === "flashcard" && "data" in p && p.data && typeof p.data === "object") {
      const d = p.data as { frontText: string; backText: string; hint?: string; memoryTrick?: string };
      onFlashcardDraft?.(d);
    } else if (p.type === "mnemonic" && "data" in p && p.data && typeof p.data === "object") {
      const d = p.data as { conceptSummary: string; mnemonic: string; whyItWorks: string; rapidRecallVersion: string; boardTip: string };
      onMnemonicDraft?.(d);
    } else if (p.type === "high_yield_summary" && "data" in p && p.data && typeof p.data === "object") {
      const d = p.data as { title: string; explanation: string; whyHighYield?: string; commonConfusion?: string };
      onHighYieldDraft?.(d);
    }
    setPreview(null);
  }, [preview, onQuestionDraft, onDistractorRationale, onStudySectionDraft, onFlashcardDraft, onMnemonicDraft, onHighYieldDraft]);

  const typeLabels: Record<string, string> = {
    question: "Question draft",
    distractor_rationale: "Distractor rationale",
    study_section: "Study section",
    flashcard: "Flashcard",
    mnemonic: "Mnemonic",
    high_yield_summary: "High-yield summary",
  };

  const canGenerate =
    draftType === "distractor_rationale"
      ? optionText && correctOptionText && stem
      : draftType === "mnemonic"
        ? conceptInput.trim() || conceptOrText
        : true;

  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-block">{Icons.sparkles}</span>
        <h3 className="font-semibold text-slate-900 dark:text-white">
          AI Draft: {typeLabels[draftType] ?? draftType}
        </h3>
        <span className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded">
          Auto-publish when quality gate passes; otherwise editor review
        </span>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Generate a track-specific draft. Auto-published when quality gate passes; otherwise routed to editor review.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Track *</label>
          <select
            value={trackId}
            onChange={(e) => {
              setTrackId(e.target.value);
              setSystemId("");
              setTopicId("");
            }}
            className={INPUT_CLASS}
          >
            <option value="">Select</option>
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">System</label>
          <select
            value={systemId}
            onChange={(e) => setSystemId(e.target.value)}
            className={INPUT_CLASS}
          >
            <option value="">Any</option>
            {filteredSystems.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        {filteredTopics.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Topic</label>
            <select
              value={topicId}
              onChange={(e) => setTopicId(e.target.value)}
              className={INPUT_CLASS}
            >
              <option value="">Any</option>
              {filteredTopics.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Difficulty (1-5)</label>
          <select
            value={targetDifficulty}
            onChange={(e) => setTargetDifficulty(e.target.value ? Number(e.target.value) : "")}
            className={INPUT_CLASS}
          >
            <option value="">—</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      {(draftType === "mnemonic" || draftType === "distractor_rationale") && (
        <div className="mb-4">
          {draftType === "mnemonic" && (
            <>
              <label className="block text-xs font-medium text-slate-500 mb-1">Concept to memorize *</label>
              <textarea
                value={conceptInput}
                onChange={(e) => setConceptInput(e.target.value)}
                placeholder="Enter the concept or text to create a mnemonic for"
                className={INPUT_CLASS}
                rows={2}
              />
            </>
          )}
          {draftType === "distractor_rationale" && (!optionText || !correctOptionText || !stem) && (
            <p className="text-xs text-amber-600">
              Fill in stem, correct answer, and the wrong option above, then generate.
            </p>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 mb-4">
        {draftType === "question" && (
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500 mb-1">Learning objective</label>
            <input
              type="text"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="Optional"
              className={INPUT_CLASS}
            />
          </div>
        )}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating || !canGenerate}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {generating ? "Generating…" : "Generate draft"}
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm mb-4">
          {error}
        </div>
      )}

      {preview ? (
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
          <p className="text-xs font-medium text-slate-500">Preview — review and edit before saving</p>
          <pre className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-sans max-h-64 overflow-y-auto">
            {JSON.stringify(preview, null, 2)}
          </pre>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleApply}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
            >
              Use draft
            </button>
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-sm"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
