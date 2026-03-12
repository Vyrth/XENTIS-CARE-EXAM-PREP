"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Icons } from "@/components/ui/icons";
import { GenerationConfigPanel } from "./GenerationConfigPanel";
import { HighYieldPreview } from "./preview";
import {
  generateHighYieldDraft,
  saveHighYieldDraft,
  recordGenerationDiscardedAction,
} from "@/app/(app)/actions/ai-factory";
import { resolveConfigTrack } from "@/lib/ai/factory/resolve-track";
import { validateGenerationConfig } from "@/lib/ai/factory/validation";
import type { FieldErrors } from "./GenerationConfigPanel";
import type { GenerationConfig } from "@/lib/ai/factory/types";
import type { AIFactoryPageData } from "@/lib/admin/ai-factory-loaders";
import type { GenerationPreset } from "@/lib/ai/factory/presets";

type HighYieldType = "high_yield_summary" | "common_confusion" | "board_trap" | "compare_contrast_summary";

const HIGH_YIELD_TYPES: { value: HighYieldType; label: string }[] = [
  { value: "high_yield_summary", label: "High-yield summary" },
  { value: "common_confusion", label: "Common confusion" },
  { value: "board_trap", label: "Board trap" },
  { value: "compare_contrast_summary", label: "Compare/contrast" },
];

export interface HighYieldTabProps {
  config: GenerationConfig;
  data: AIFactoryPageData;
  onConfigChange: (config: GenerationConfig) => void;
  pendingGeneratePreset?: GenerationPreset | null;
  onGenerateTriggered?: () => void;
}

export function HighYieldTab({ config, data, onConfigChange, pendingGeneratePreset, onGenerateTriggered }: HighYieldTabProps) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [highYieldType, setHighYieldType] = useState<HighYieldType>("high_yield_summary");

  useEffect(() => {
    if (config.highYieldType) {
      setHighYieldType(config.highYieldType);
    }
  }, [config.highYieldType]);
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null);
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

    const validation = validateGenerationConfig(config, "high_yield_summary", data.tracks);
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
      const result = await generateHighYieldDraft(fullConfig, highYieldType);
      if (result.success && result.draft) {
        setPreview(result.draft as Record<string, unknown>);
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
      const result = await saveHighYieldDraft(fullConfig, preview, highYieldType, auditId ?? undefined);
      if (result.success && result.contentId) {
        router.push(`/admin/high-yield/${result.contentId}`);
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
      <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Generate High-Yield Content</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        Generate summaries, common confusions, board traps, or compare/contrast content. Preview, edit, and save only when ready.
      </p>

      <div className="mb-4">
        <label htmlFor="high-yield-type" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
          Content type
        </label>
        <select
          id="high-yield-type"
          value={highYieldType}
          onChange={(e) => {
            setHighYieldType(e.target.value as HighYieldType);
            setPreview(null);
          }}
          className="w-full max-w-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          aria-label="High-yield content type"
        >
          {HIGH_YIELD_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

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
        showObjective
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
          href="/admin/high-yield/new"
          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          Create manually →
        </a>
      </div>

      {preview && (
        <div className="mt-6">
          <HighYieldPreview
            config={fullConfig}
            draft={preview}
            contentType={highYieldType}
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
