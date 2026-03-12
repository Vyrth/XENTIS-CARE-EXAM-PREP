"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ExamCompositionPreview } from "./ExamCompositionPreview";
import {
  updateSystemExam,
  addQuestionsToSystemExamPool,
} from "@/app/(app)/actions/exam-assembly";
import type { AssemblyRules } from "@/lib/admin/exam-assembly-pool";
import type { CompositionStats, BlueprintWarning } from "@/lib/admin/exam-assembly-pool";
import type { SystemExamForAssembly } from "@/lib/admin/exam-assembly-loaders";
import { Icons } from "@/components/ui/icons";

const INPUT_CLASS =
  "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm";

export interface SystemExamEditorProps {
  exam: SystemExamForAssembly;
  tracks: { id: string; slug: string; name: string }[];
  blueprintWeights: { systemId: string; systemName: string; weightPct: number }[];
  initialComposition: CompositionStats;
  initialWarnings: BlueprintWarning[];
}

export function SystemExamEditor({
  exam,
  tracks,
  blueprintWeights,
  initialComposition,
  initialWarnings,
}: SystemExamEditorProps) {
  const [name, setName] = useState(exam.name);
  const [description, setDescription] = useState(exam.description ?? "");
  const [questionCount, setQuestionCount] = useState(exam.questionCount);
  const [durationMinutes, setDurationMinutes] = useState(exam.durationMinutes);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [composition, setComposition] = useState(initialComposition);
  const [warnings, setWarnings] = useState(initialWarnings);
  const [questionIdsToAdd, setQuestionIdsToAdd] = useState("");
  const [addingQuestions, setAddingQuestions] = useState(false);

  const handleSave = useCallback(async () => {
    setErrors([]);
    setSaving(true);
    try {
      const r = await updateSystemExam(exam.id, {
        name,
        description: description || null,
        questionCount,
        durationMinutes,
      });
      if (!r.success) {
        setErrors([r.error ?? "Save failed"]);
      }
    } finally {
      setSaving(false);
    }
  }, [exam.id, name, description, questionCount, durationMinutes]);

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
      const r = await addQuestionsToSystemExamPool(exam.id, ids, exam.examTrackId);
      if (!r.success) {
        setErrors([r.error ?? "Failed to add questions"]);
        return;
      }
      setQuestionIdsToAdd("");
      window.location.reload();
    } finally {
      setAddingQuestions(false);
    }
  }, [exam.id, exam.examTrackId, questionIdsToAdd]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <Card>
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4">System Exam Settings</h2>
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
                System
              </label>
              <p className="text-slate-600 dark:text-slate-400 text-sm">{exam.systemName}</p>
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
                  Question Count (min 50)
                </label>
                <input
                  type="number"
                  min={50}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(parseInt(e.target.value, 10) || 50)}
                  className={INPUT_CLASS}
                />
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

        <Card>
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4">
            Manual Pool ({exam.poolCount} questions)
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Add questions by ID. Questions must be approved, belong to this track, and match the system ({exam.systemName}).
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
            href={`/admin/questions?trackId=${exam.examTrackId}&systemSlug=${exam.systemSlug}`}
            className="inline-flex items-center gap-1 text-indigo-600 hover:underline text-sm mt-2"
          >
            Browse questions for {exam.systemName}
            {Icons.chevronRight}
          </Link>
        </Card>
      </div>

      <div>
        {errors.length > 0 && (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 text-sm mb-4">
            {errors.map((e, i) => (
              <p key={i}>{e}</p>
            ))}
          </div>
        )}
        <ExamCompositionPreview
          composition={composition}
          warnings={warnings}
          expectedTotal={questionCount}
        />
      </div>
    </div>
  );
}
