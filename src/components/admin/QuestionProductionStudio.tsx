"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { TrackBadge } from "@/components/admin/TrackBadge";
import { createQuestion, updateQuestion } from "@/app/(app)/actions/questions";
import { validateDraft, validateForPublish, type QuestionFormData, type QuestionOptionInput } from "@/lib/admin/question-validation";
import { QUESTION_TEMPLATES } from "@/data/question-templates";
import { getQuestionRenderer } from "@/components/exam/question-renderers";
import { AIDraftGeneratorPanel } from "@/components/admin/AIDraftGeneratorPanel";
import { GenerateDistractorButton } from "@/components/admin/GenerateDistractorButton";

export interface QuestionProductionStudioProps {
  questionId?: string;
  initialData?: Partial<QuestionFormData>;
  tracks: { id: string; slug: string; name: string }[];
  systems: { id: string; slug: string; name: string; examTrackId?: string }[];
  topics: { id: string; slug: string; name: string; domainId: string; systemIds?: string[] }[];
  subtopics: { id: string; slug: string; name: string; topicId: string }[];
  domains: { id: string; slug: string; name: string }[];
  questionTypes: { id: string; slug: string; name: string }[];
  defaultTrackId?: string;
}

const OPTION_KEYS = ["A", "B", "C", "D", "E", "F"];

export function QuestionProductionStudio({
  questionId,
  initialData,
  tracks,
  systems,
  topics,
  subtopics,
  domains,
  questionTypes,
  defaultTrackId,
}: QuestionProductionStudioProps) {
  const router = useRouter();
  const [trackId, setTrackId] = useState(initialData?.examTrackId ?? defaultTrackId ?? "");
  const [systemId, setSystemId] = useState(initialData?.systemId ?? "");
  const [domainId, setDomainId] = useState(initialData?.domainId ?? "");
  const [topicId, setTopicId] = useState(initialData?.topicId ?? "");
  const [subtopicId, setSubtopicId] = useState(initialData?.subtopicId ?? "");
  const [questionTypeId, setQuestionTypeId] = useState(initialData?.questionTypeId ?? "");
  const [stem, setStem] = useState(initialData?.stem ?? "");
  const [leadIn, setLeadIn] = useState(initialData?.leadIn ?? "");
  const [instructions, setInstructions] = useState(initialData?.instructions ?? "");
  const [options, setOptions] = useState<QuestionOptionInput[]>(
    initialData?.options?.length ? initialData.options : QUESTION_TEMPLATES.single_best_answer.options
  );
  const [rationale, setRationale] = useState(initialData?.rationale ?? "");
  const [difficultyTier, setDifficultyTier] = useState<number | "">(initialData?.difficultyTier ?? "");
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl ?? "");
  const [previewMode, setPreviewMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [saveAndNext, setSaveAndNext] = useState(false);
  const [showAIDraft, setShowAIDraft] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(false);

  const typeSlug = questionTypes.find((t) => t.id === questionTypeId)?.slug ?? "single_best_answer";

  const trackSystemIds = new Set(systems.filter((s) => s.examTrackId === trackId).map((s) => s.id));
  const filteredTopics = trackId
    ? topics.filter((t) => {
        const inTrack = !t.systemIds?.length || t.systemIds.some((sid) => trackSystemIds.has(sid));
        const domainMatch = !domainId || t.domainId === domainId;
        return inTrack && domainMatch;
      })
    : [];
  const filteredSubtopics = topicId ? subtopics.filter((s) => s.topicId === topicId) : [];

  const applyTemplate = useCallback((slug: string) => {
    const tpl = QUESTION_TEMPLATES[slug];
    if (tpl) {
      setLeadIn(tpl.leadIn ?? "");
      setInstructions(tpl.instructions ?? "");
      setOptions(tpl.options.map((o) => ({ ...o })));
      if (!stem) setStem("");
    }
  }, [stem]);

  useEffect(() => {
    if (questionTypeId) {
      const slug = questionTypes.find((t) => t.id === questionTypeId)?.slug;
      if (slug && QUESTION_TEMPLATES[slug]) applyTemplate(slug);
    }
  }, [questionTypeId, questionTypes, applyTemplate]);

  const handleSaveCallback = useCallback(
    async (andNext: boolean) => {
      setSaveAndNext(andNext);
      const data: QuestionFormData = {
        examTrackId: trackId,
        systemId,
        domainId: domainId || undefined,
        topicId: topicId || undefined,
        subtopicId: subtopicId || undefined,
        questionTypeId,
        questionTypeSlug: typeSlug,
        stem,
        leadIn: leadIn || undefined,
        instructions: instructions || undefined,
        options,
        rationale: rationale || undefined,
        difficultyTier: typeof difficultyTier === "number" ? difficultyTier : undefined,
        imageUrl: imageUrl || undefined,
        aiGenerated: aiGenerated || undefined,
      };
      const validation = validateDraft(data);
      if (!validation.success) {
        setErrors(validation.errors);
        return;
      }
      setErrors([]);
      setSaving(true);
      try {
        const result = questionId
          ? await updateQuestion(questionId, data)
          : await createQuestion(data);
        if (result.success && result.questionId) {
          if (andNext) {
            router.push(`/admin/questions/new?trackId=${trackId}`);
          } else {
            router.push(`/admin/questions/${result.questionId}`);
          }
        } else {
          setErrors(result.validationErrors ?? [result.error ?? "Save failed"]);
        }
      } finally {
        setSaving(false);
        setSaveAndNext(false);
      }
    },
    [
      questionId,
      trackId,
      systemId,
      domainId,
      topicId,
      subtopicId,
      questionTypeId,
      typeSlug,
      stem,
      leadIn,
      instructions,
      options,
      rationale,
      difficultyTier,
      imageUrl,
      router,
    ]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
        if (e.ctrlKey || e.metaKey) {
          if (e.key === "s") {
            e.preventDefault();
            handleSaveCallback(false);
          } else if (e.key === "Enter" && e.shiftKey) {
            e.preventDefault();
            handleSaveCallback(true);
          }
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSaveCallback]);


  const addOption = () => {
    const nextKey = OPTION_KEYS[options.length];
    if (nextKey) setOptions([...options, { key: nextKey, text: "", isCorrect: false }]);
  };

  const updateOption = (idx: number, updates: Partial<QuestionOptionInput>) => {
    const next = [...options];
    next[idx] = { ...next[idx], ...updates };
    setOptions(next);
  };

  const removeOption = (idx: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== idx));
  };

  const toggleCorrect = (idx: number) => {
    const opt = options[idx];
    if (typeSlug === "single_best_answer") {
      setOptions(options.map((o, i) => ({ ...o, isCorrect: i === idx })));
    } else {
      updateOption(idx, { isCorrect: !opt.isCorrect });
    }
  };

  const previewQuestion = {
    id: "preview",
    stem,
    type: typeSlug,
    leadIn: leadIn || undefined,
    instructions: instructions || undefined,
    options: options.map((o) => ({ key: o.key, text: o.text, isCorrect: o.isCorrect })),
    imageUrl: imageUrl || undefined,
  };

  const Renderer = getQuestionRenderer(typeSlug);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/questions" className="text-slate-600 dark:text-slate-400 hover:underline">
            ← Questions
          </Link>
          {questionId && (
            <span className="text-slate-500 text-sm">Editing {questionId.slice(0, 8)}…</span>
          )}
          {trackId && (
            <TrackBadge slug={tracks.find((t) => t.id === trackId)?.slug as "lvn" | "rn" | "fnp" | "pmhnp" ?? null} />
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
            onClick={() => handleSaveCallback(true)}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            Save & Create Next
          </button>
          <button
            type="button"
            onClick={() => handleSaveCallback(false)}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Shortcuts: Ctrl+S Save · Ctrl+Shift+Enter Save & Create Next
        {!showAIDraft && (
          <>
            {" · "}
            <button
              type="button"
              onClick={() => setShowAIDraft(true)}
              className="text-indigo-600 hover:underline"
            >
              AI draft
            </button>
          </>
        )}
      </p>

      {showAIDraft && (
        <div className="space-y-4">
          <AIDraftGeneratorPanel
            draftType="question"
            tracks={tracks}
            systems={systems}
            topics={filteredTopics}
            itemTypeSlug={typeSlug}
            onQuestionDraft={(d) => {
              setStem(d.stem);
              if (d.leadIn != null) setLeadIn(d.leadIn);
              if (d.instructions != null) setInstructions(d.instructions);
              if (d.options?.length) setOptions(d.options);
              if (d.rationale != null) setRationale(d.rationale);
              setAiGenerated(true);
              setShowAIDraft(false);
            }}
          />
          <button
            type="button"
            onClick={() => setShowAIDraft(false)}
            className="text-sm text-slate-500 hover:underline"
          >
            Hide AI draft
          </button>
        </div>
      )}

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
        <Card>
          <p className="text-sm text-slate-500 mb-4">Learner exam preview</p>
          {previewQuestion.leadIn && (
            <p className="text-slate-600 dark:text-slate-300 mb-4 italic">{previewQuestion.leadIn}</p>
          )}
          <p className="text-slate-900 dark:text-white mb-4">{previewQuestion.stem}</p>
          {previewQuestion.instructions && (
            <p className="text-sm text-slate-500 mb-4">{previewQuestion.instructions}</p>
          )}
          {previewQuestion.imageUrl && (
            <img src={previewQuestion.imageUrl} alt="" className="max-w-md rounded-lg mb-4" />
          )}
          <Renderer
            question={previewQuestion}
            response={undefined}
            onChange={() => {}}
            disabled
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Card>
              <h3 className="font-medium mb-3">Taxonomy</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Track *</label>
                  <select
                    value={trackId}
                    onChange={(e) => {
                      setTrackId(e.target.value);
                      setSystemId("");
                      setTopicId("");
                      setSubtopicId("");
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                  >
                    <option value="">Select track</option>
                    {tracks.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">System *</label>
                  <select
                    value={systemId}
                    onChange={(e) => setSystemId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                  >
                    <option value="">Select system</option>
                    {systems.filter((s) => !trackId || s.examTrackId === trackId).map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Domain</label>
                  <select
                    value={domainId}
                    onChange={(e) => {
                      setDomainId(e.target.value);
                      setTopicId("");
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                  >
                    <option value="">Any</option>
                    {domains.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Topic</label>
                  <select
                    value={topicId}
                    onChange={(e) => {
                      setTopicId(e.target.value);
                      setSubtopicId("");
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                  >
                    <option value="">Any</option>
                    {filteredTopics.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Subtopic</label>
                  <select
                    value={subtopicId}
                    onChange={(e) => setSubtopicId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                  >
                    <option value="">Any</option>
                    {filteredSubtopics.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Item Type *</label>
                  <select
                    value={questionTypeId}
                    onChange={(e) => setQuestionTypeId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                  >
                    <option value="">Select type</option>
                    {questionTypes.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Difficulty (1-5)</label>
                  <select
                    value={difficultyTier}
                    onChange={(e) => setDifficultyTier(e.target.value ? Number(e.target.value) : "")}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                  >
                    <option value="">—</option>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>
            </Card>

            <Card>
              <h3 className="font-medium mb-3">Content</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Lead-in</label>
                  <input
                    type="text"
                    value={leadIn}
                    onChange={(e) => setLeadIn(e.target.value)}
                    placeholder="Optional scenario intro"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Stem *</label>
                  <textarea
                    value={stem}
                    onChange={(e) => setStem(e.target.value)}
                    placeholder={QUESTION_TEMPLATES[typeSlug]?.stemPlaceholder}
                    rows={4}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Instructions</label>
                  <input
                    type="text"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="e.g. Select all that apply"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Image URL</label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                  />
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <h3 className="font-medium mb-3">Options</h3>
              <div className="space-y-2">
                {options.map((opt, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <span className="font-mono w-6 shrink-0 pt-2">{opt.key}</span>
                    <div className="flex-1 space-y-1">
                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) => updateOption(idx, { text: e.target.value })}
                        placeholder={`Option ${opt.key}`}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                      />
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={opt.distractorRationale ?? ""}
                          onChange={(e) => updateOption(idx, { distractorRationale: e.target.value })}
                          placeholder="Distractor rationale (optional)"
                          className="flex-1 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                        />
                        {!opt.isCorrect && (
                          <GenerateDistractorButton
                            optionText={opt.text}
                            correctOptionText={options.find((o) => o.isCorrect)?.text ?? ""}
                            stem={stem}
                            trackId={trackId}
                            trackSlug={(tracks.find((t) => t.id === trackId)?.slug as "lvn" | "rn" | "fnp" | "pmhnp") ?? "rn"}
                            systemId={systemId || undefined}
                            systemName={systems.find((s) => s.id === systemId)?.name}
                            topicId={topicId || undefined}
                            topicName={topics.find((t) => t.id === topicId)?.name}
                            onGenerated={(r) => updateOption(idx, { distractorRationale: r })}
                          />
                        )}
                      </div>
                    </div>
                    <label className="flex items-center gap-1 pt-2 shrink-0">
                      <input
                        type="checkbox"
                        checked={opt.isCorrect}
                        onChange={() => toggleCorrect(idx)}
                      />
                      <span className="text-xs">Correct</span>
                    </label>
                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(idx)}
                        className="text-red-500 text-xs pt-2"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                {options.length < 6 && (
                  <button
                    type="button"
                    onClick={addOption}
                    className="text-sm text-indigo-600 hover:underline"
                  >
                    + Add option
                  </button>
                )}
              </div>
            </Card>

            <Card>
              <h3 className="font-medium mb-3">Rationale</h3>
              <textarea
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                placeholder="Required for publish. Explain why the correct answer is right."
                rows={5}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
              />
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
