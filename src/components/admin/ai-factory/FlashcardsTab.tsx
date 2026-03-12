"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Icons } from "@/components/ui/icons";
import { GenerationConfigPanel } from "./GenerationConfigPanel";
import {
  FlashcardPreview,
  type FlashcardDeckDraft,
} from "./preview";
import {
  generateFlashcardDeckDraft,
  saveFlashcardDeckDraft,
  recordGenerationDiscardedAction,
} from "@/app/(app)/actions/ai-factory";
import { resolveConfigTrack } from "@/lib/ai/factory/resolve-track";
import { validateGenerationConfig } from "@/lib/ai/factory/validation";
import type { FieldErrors } from "./GenerationConfigPanel";
import type { GenerationConfig } from "@/lib/ai/factory/types";
import type { AIFactoryPageData } from "@/lib/admin/ai-factory-loaders";
import type { GenerationPreset } from "@/lib/ai/factory/presets";

export interface FlashcardsTabProps {
  config: GenerationConfig;
  data: AIFactoryPageData;
  onConfigChange: (config: GenerationConfig) => void;
  pendingGeneratePreset?: GenerationPreset | null;
  onGenerateTriggered?: () => void;
}

export function FlashcardsTab({ config, data, onConfigChange, pendingGeneratePreset, onGenerateTriggered }: FlashcardsTabProps) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [preview, setPreview] = useState<FlashcardDeckDraft | null>(null);
  const [auditId, setAuditId] = useState<string | null>(null);

  const resolvedConfig = resolveConfigTrack(config, data.tracks);
  const fullConfig: GenerationConfig = resolvedConfig ?? {
    ...config,
    trackSlug: ((config.trackSlug || data.tracks.find((t) => t.id === config.trackId)?.slug) ?? "rn").toLowerCase() as "lvn" | "rn" | "fnp" | "pmhnp",
  };

  const trackName = resolvedConfig
    ? data.tracks.find((t) => t.id === resolvedConfig.trackId)?.name
    : data.tracks.find((t) => t.id === config.trackId)?.name;
  const domainName = config.domainId ? data.domains.find((d) => d.id === config.domainId)?.name : undefined;
  const systemName = config.systemName;
  const topicName = config.topicName;

  const handleGeneratePreview = async () => {
    setError(null);
    setFieldErrors({});

    const validation = validateGenerationConfig(config, "flashcard_deck", data.tracks);
    if (!validation.success) {
      const errs: FieldErrors = {};
      for (const msg of validation.errors) {
        if (msg.includes("track") || msg === "Select a track" || msg.includes("Selected track")) errs.trackId = msg;
        else if (msg.includes("difficulty")) errs.targetDifficulty = msg;
        else if (msg.includes("Batch count")) errs.batchCount = msg;
        else if (msg.includes("Save status")) errs.saveStatus = msg;
        else errs.other = errs.other ? `${errs.other}; ${msg}` : msg;
      }
      setFieldErrors(errs);
      setError(validation.errors.join("; "));
      return;
    }
    if (!resolvedConfig) {
      setError("Select a track");
      setFieldErrors({ trackId: "Select a track" });
      return;
    }
    setPreview(null);
    setGenerating(true);
    try {
      const result = await generateFlashcardDeckDraft(fullConfig);
      if (result.success && result.draft) {
        setPreview(result.draft as FlashcardDeckDraft);
        setAuditId(result.auditId ?? null);
      } else {
        setError(result.error ?? "Generation failed");
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!preview || !resolvedConfig) return;
    setError(null);
    setSaving(true);
    try {
      const result = await saveFlashcardDeckDraft(fullConfig, preview, auditId ?? undefined);
      if (result.success && result.contentId) {
        router.push(`/admin/flashcards/${result.contentId}`);
      } else {
        setError(result.error ?? "Save failed");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = async () => {
    if (auditId) {
      await recordGenerationDiscardedAction(auditId);
    }
    setPreview(null);
    setAuditId(null);
    setError(null);
  };

  const hasTriggeredRef = useRef(false);
  useEffect(() => {
    if (pendingGeneratePreset && resolvedConfig && !generating && onGenerateTriggered) {
      if (!hasTriggeredRef.current) {
        hasTriggeredRef.current = true;
        handleGeneratePreview();
        onGenerateTriggered();
      }
    } else if (!pendingGeneratePreset) {
      hasTriggeredRef.current = false;
    }
  }, [pendingGeneratePreset, config, data.tracks]);

  return (
    <Card>
      <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Generate Flashcard Deck</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        Generate board-focused flashcard decks. Preview, edit cards, and save only when ready. Nothing is persisted until you click Save.
      </p>

      <GenerationConfigPanel
        config={config}
        onChange={(c) => {
          onConfigChange(c);
          if (Object.keys(fieldErrors).length) setFieldErrors({});
        }}
        tracks={data.tracks}
        systems={data.systems}
        topics={data.topics}
        domains={data.domains}
        fieldErrors={fieldErrors}
        showDomain
        showFlashcardMode
        showCardCount
        showSourceText
        showObjective
        showDifficulty
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleGeneratePreview}
          disabled={generating || !resolvedConfig}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
          aria-busy={generating}
          aria-label={generating ? "Generating preview" : "Generate draft preview"}
        >
          {generating && <span className="text-white">{Icons.loader}</span>}
          {generating ? "Generating…" : "Generate draft"}
        </button>
        <a
          href="/admin/flashcards/new"
          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          Create manually →
        </a>
      </div>

      {preview && (
        <div className="mt-6">
          <FlashcardPreview
            config={fullConfig}
            draft={preview}
            onChange={setPreview}
            onSave={handleSave}
            onDiscard={handleDiscard}
            onRegenerate={handleGeneratePreview}
            saving={saving}
            regenerating={generating}
            trackName={trackName}
            domainName={domainName}
            systemName={systemName}
            topicName={topicName}
          />
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}
    </Card>
  );
}
