"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { TrackBadge } from "@/components/admin/TrackBadge";
import { ExamCompositionPreview } from "./ExamCompositionPreview";
import {
  updateExamTemplate,
  addQuestionsToTemplatePool,
  getTemplatePoolComposition,
  type SaveExamTemplateResult,
} from "@/app/(app)/actions/exam-assembly";
import type { AssemblyRules } from "@/lib/admin/exam-assembly-pool";
import type { CompositionStats, BlueprintWarning } from "@/lib/admin/exam-assembly-pool";
import type { ExamTemplateForAssembly } from "@/lib/admin/exam-assembly-loaders";
import type { SystemOption } from "@/lib/admin/exam-assembly-loaders";
import { Icons } from "@/components/ui/icons";

const INPUT_CLASS =
  "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm";

export interface ExamAssemblyStudioProps {
  template: ExamTemplateForAssembly;
  tracks: { id: string; slug: string; name: string }[];
  systems: SystemOption[];
  blueprintWeights: { systemId: string; systemName: string; weightPct: number }[];
  initialComposition: CompositionStats;
  initialWarnings: BlueprintWarning[];
}

export function ExamAssemblyStudio({
  template,
  tracks,
  systems,
  blueprintWeights,
  initialComposition,
  initialWarnings,
}: ExamAssemblyStudioProps) {
  const [name, setName] = useState(template.name);
  const [slug, setSlug] = useState(template.slug);
  const [description, setDescription] = useState(template.description ?? "");
  const [questionCount, setQuestionCount] = useState(template.questionCount);
  const [durationMinutes, setDurationMinutes] = useState(template.durationMinutes);
  const [assemblyMode, setAssemblyMode] = useState<"manual" | "rule_based" | "hybrid">(
    template.assemblyMode
  );
  const [assemblyRules, setAssemblyRules] = useState<AssemblyRules>(template.assemblyRules ?? {});
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [composition, setComposition] = useState(initialComposition);
  const [warnings, setWarnings] = useState(initialWarnings);
  const [questionIdsToAdd, setQuestionIdsToAdd] = useState("");
  const [addingQuestions, setAddingQuestions] = useState(false);

  const trackSlug = tracks.find((t) => t.id === template.examTrackId)?.slug ?? "rn";
  const isPrePractice = template.slug === "pre_practice";

  const handleSave = useCallback(async () => {
    setErrors([]);
    setSaving(true);
    try {
      const r: SaveExamTemplateResult = await updateExamTemplate(template.id, {
        name,
        slug,
        description: description || null,
        questionCount,
        durationMinutes,
        assemblyMode,
        assemblyRules,
      });
      if (!r.success) {
        setErrors(r.validationErrors ?? [r.error ?? "Save failed"]);
      }
    } finally {
      setSaving(false);
    }
  }, [
    template.id,
    name,
    slug,
    description,
    questionCount,
    durationMinutes,
    assemblyMode,
    assemblyRules,
  ]);

  const handleAddQuestions = useCallback(async () => {
    const ids = questionIdsToAdd
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (ids.length === 0) {
      setErrors(["Enter at least one question ID"]);
      return;
    }
    setErrors([]);
    setAddingQuestions(true);
    try {
      const r = await addQuestionsToTemplatePool(template.id, ids, template.examTrackId);
      if (!r.success) {
        setErrors([r.error ?? "Failed to add questions"]);
        return;
      }
      setQuestionIdsToAdd("");
      const { composition: comp, warnings: w } = await getTemplatePoolComposition(
        template.id,
        template.examTrackId
      );
      setComposition(comp);
      setWarnings(w);
      window.location.reload();
    } finally {
      setAddingQuestions(false);
    }
  }, [template.id, template.examTrackId, questionIdsToAdd, assemblyRules, questionCount]);

  const handleRefreshComposition = useCallback(async () => {
    const { composition: comp, warnings: w } = await getTemplatePoolComposition(
      template.id,
      template.examTrackId
    );
    setComposition(comp);
    setWarnings(w);
  }, [template.id, template.examTrackId]);

  const updateRuleBySystem = (systemId: string, min?: number, max?: number) => {
    const bySystem = [...(assemblyRules.bySystem ?? [])];
    const idx = bySystem.findIndex((r) => r.systemId === systemId);
    if (idx >= 0) {
      bySystem[idx] = { ...bySystem[idx], min, max };
    } else {
      bySystem.push({ systemId, min, max });
    }
    setAssemblyRules({ ...assemblyRules, bySystem });
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/exams"
            className="text-slate-600 dark:text-slate-400 hover:underline"
          >
            ← Exams
          </Link>
          <TrackBadge slug={trackSlug as "lvn" | "rn" | "fnp" | "pmhnp"} />
          <span className="text-slate-500 text-sm">{template.name}</span>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 text-sm">
          {errors.map((e, i) => (
            <p key={i}>{e}</p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Exam Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Slug
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className={INPUT_CLASS}
                  placeholder="pre_practice"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={INPUT_CLASS}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Question Count
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={300}
                    value={questionCount}
                    onChange={(e) => setQuestionCount(parseInt(e.target.value, 10) || 0)}
                    className={INPUT_CLASS}
                  />
                  {isPrePractice && questionCount !== 150 && (
                    <p className="text-amber-600 text-xs mt-1">
                      Pre-practice typically uses 150 questions
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Duration (min)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 0)}
                    className={INPUT_CLASS}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Assembly Mode
                </label>
                <select
                  value={assemblyMode}
                  onChange={(e) =>
                    setAssemblyMode(e.target.value as "manual" | "rule_based" | "hybrid")
                  }
                  className={INPUT_CLASS}
                >
                  <option value="manual">Manual (pool only)</option>
                  <option value="rule_based">Rule-based</option>
                  <option value="hybrid">Hybrid (rules + pool)</option>
                </select>
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save Settings"}
              </button>
            </div>
          </Card>

          {(assemblyMode === "rule_based" || assemblyMode === "hybrid") && blueprintWeights.length > 0 && (
            <Card>
              <h2 className="font-semibold text-slate-900 dark:text-white mb-4">
                Rule-Based Allocation (by System)
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Total Target
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={300}
                    value={assemblyRules.totalCount ?? questionCount}
                    onChange={(e) =>
                      setAssemblyRules({
                        ...assemblyRules,
                        totalCount: parseInt(e.target.value, 10) || undefined,
                      })
                    }
                    className={INPUT_CLASS}
                  />
                </div>
                {blueprintWeights.map((b) => {
                  const rule = assemblyRules.bySystem?.find((r) => r.systemId === b.systemId);
                  return (
                    <div key={b.systemId} className="flex items-center gap-4">
                      <span className="w-40 truncate text-sm text-slate-600 dark:text-slate-400">
                        {b.systemName} ({b.weightPct}%)
                      </span>
                      <input
                        type="number"
                        min={0}
                        placeholder="Min"
                        value={rule?.min ?? ""}
                        onChange={(e) =>
                          updateRuleBySystem(
                            b.systemId,
                            parseInt(e.target.value, 10) || undefined,
                            rule?.max
                          )
                        }
                        className="w-20 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 text-sm"
                      />
                      <input
                        type="number"
                        min={0}
                        placeholder="Max"
                        value={rule?.max ?? ""}
                        onChange={(e) =>
                          updateRuleBySystem(
                            b.systemId,
                            rule?.min,
                            parseInt(e.target.value, 10) || undefined
                          )
                        }
                        className="w-20 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 text-sm"
                      />
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {(assemblyMode === "manual" || assemblyMode === "hybrid") && (
            <Card>
              <h2 className="font-semibold text-slate-900 dark:text-white mb-4">
                Manual Pool ({template.poolCount} questions)
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Add questions by ID (comma or space separated). Questions must be approved and belong to this track.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={questionIdsToAdd}
                  onChange={(e) => setQuestionIdsToAdd(e.target.value)}
                  placeholder="Paste question IDs…"
                  className={INPUT_CLASS}
                />
                <button
                  type="button"
                  onClick={handleAddQuestions}
                  disabled={addingQuestions}
                  className="px-4 py-2 rounded-lg bg-slate-700 text-white font-medium hover:bg-slate-800 disabled:opacity-50 shrink-0"
                >
                  {addingQuestions ? "Adding…" : "Add"}
                </button>
              </div>
              <Link
                href={`/admin/questions?trackId=${template.examTrackId}`}
                className="inline-flex items-center gap-1 text-indigo-600 hover:underline text-sm mt-2"
              >
                Browse questions for this track
                {Icons.chevronRight}
              </Link>
            </Card>
          )}
        </div>

        <div>
          <ExamCompositionPreview
            composition={composition}
            warnings={warnings}
            expectedTotal={questionCount}
            isPrePractice={isPrePractice}
          />
          <button
            type="button"
            onClick={handleRefreshComposition}
            className="mt-4 text-sm text-slate-600 dark:text-slate-400 hover:underline"
          >
            Refresh composition
          </button>
        </div>
      </div>
    </div>
  );
}
