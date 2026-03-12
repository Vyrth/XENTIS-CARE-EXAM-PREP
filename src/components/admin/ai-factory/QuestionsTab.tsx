"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Icons } from "@/components/ui/icons";
import { GenerationConfigPanel } from "./GenerationConfigPanel";
import { QuestionPreview, type QuestionDraft } from "./preview";
import { generateQuestionDraft, saveQuestionDraft, recordGenerationDiscardedAction } from "@/app/(app)/actions/ai-factory";
import { resolveConfigTrack } from "@/lib/ai/factory/resolve-track";
import { validateGenerationConfig } from "@/lib/ai/factory/validation";
import type { FieldErrors } from "./GenerationConfigPanel";
import type { GenerationConfig } from "@/lib/ai/factory/types";
import type { AIFactoryPageData } from "@/lib/admin/ai-factory-loaders";
import type { GenerationPreset } from "@/lib/ai/factory/presets";

/** Item types supported for AI question generation */
const AI_GENERATABLE_QUESTION_TYPES = new Set([
  "single_best_answer",
  "multiple_response",
  "select_n",
  "image_based",
  "chart_table_exhibit",
  "ordered_response",
  "hotspot",
  "case_study",
  "dosage_calc",
]);

export interface QuestionsTabProps {
  config: GenerationConfig;
  data: AIFactoryPageData;
  onConfigChange: (config: GenerationConfig) => void;
  pendingGeneratePreset?: GenerationPreset | null;
  onGenerateTriggered?: () => void;
}

export function QuestionsTab({ config, data, onConfigChange, pendingGeneratePreset, onGenerateTriggered }: QuestionsTabProps) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [preview, setPreview] = useState<QuestionDraft | null>(null);
  const [auditId, setAuditId] = useState<string | null>(null);

  const generatableTypes = useMemo(
    () => data.questionTypes.filter((qt) => AI_GENERATABLE_QUESTION_TYPES.has(qt.slug)),
    [data.questionTypes]
  );

  const questionTypeId = generatableTypes.find((qt) => qt.slug === (config.itemTypeSlug ?? "single_best_answer"))?.id
    ?? generatableTypes[0]?.id
    ?? data.questionTypes.find((qt) => qt.slug === "single_best_answer")?.id
    ?? data.questionTypes[0]?.id;

  const resolvedConfig = useMemo(
    () => resolveConfigTrack(config, data.tracks),
    [config, data.tracks]
  );
  const fullConfig = useMemo(() => {
    if (resolvedConfig) return resolvedConfig;
    const slug = (config.trackSlug || data.tracks.find((t) => t.id === config.trackId)?.slug) ?? "rn";
    return {
      ...config,
      trackSlug: slug.toLowerCase() as "lvn" | "rn" | "fnp" | "pmhnp",
    };
  }, [config, data.tracks, resolvedConfig]);

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.log("[AIFactory Questions] selected UI:", config.trackId || "(empty)", "resolved:", resolvedConfig?.trackId ?? "null");
    }
  }, [config.trackId, resolvedConfig?.trackId]);

  const trackName = data.tracks.find((t) => t.id === config.trackId)?.name;
  const domainName = config.domainId ? data.domains.find((d) => d.id === config.domainId)?.name : undefined;
  const systemName = config.systemName;
  const topicName = config.topicName;

  const handleGeneratePreview = async () => {
    setError(null);
    setFieldErrors({});

    const validation = validateGenerationConfig(config, "question", data.tracks);
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

    if (!questionTypeId) {
      setFieldErrors({ itemTypeSlug: "Question type is required" });
      setError("Question type is required");
      return;
    }
    if (!resolvedConfig) {
      setFieldErrors({
        trackId: config.trackId?.trim()
          ? "Selected track could not be resolved"
          : "Select a track",
      });
      setError(
        config.trackId?.trim()
          ? "Selected track could not be resolved. Ensure the track exists in exam_tracks."
          : "Select a track"
      );
      return;
    }

    setPreview(null);
    setGenerating(true);
    try {
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.log("[AIFactory Questions] outgoing payload:", {
          trackId: fullConfig.trackId,
          trackSlug: fullConfig.trackSlug,
          systemId: fullConfig.systemId,
          topicId: fullConfig.topicId,
        });
      }
      const result = await generateQuestionDraft(fullConfig, questionTypeId);
      if (result.success && result.draft) {
        setPreview(result.draft);
        setAuditId(result.auditId ?? null);
      } else {
        setError(result.error ?? "Generation failed");
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!preview || !resolvedConfig || !questionTypeId) return;
    setError(null);
    setSaving(true);
    try {
      const result = await saveQuestionDraft(fullConfig, preview, questionTypeId, auditId ?? undefined);
      if (result.success && result.contentId) {
        router.push(`/admin/questions/${result.contentId}`);
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

  const handleRegenerate = () => {
    handleGeneratePreview();
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
      <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Generate Question</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        Generate a board-style question. Preview, edit, and save only when ready. Nothing is persisted until you click Save.
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
        showItemType
        questionTypes={generatableTypes.length > 0 ? generatableTypes : data.questionTypes}
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleGeneratePreview}
          disabled={generating || !resolvedConfig}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
          aria-busy={generating}
          aria-label={generating ? "Generating question" : "Generate draft preview"}
        >
          {generating && <span className="text-white">{Icons.loader}</span>}
          {generating ? "Generating…" : "Generate draft"}
        </button>
        {resolvedConfig && (
          <a
            href={`/admin/questions/new?trackId=${resolvedConfig.trackId}`}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Create manually →
          </a>
        )}
      </div>

      {preview && (
        <div className="mt-6">
          <QuestionPreview
            config={fullConfig}
            draft={preview}
            onChange={setPreview}
            onSave={handleSave}
            onDiscard={handleDiscard}
            onRegenerate={handleRegenerate}
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
