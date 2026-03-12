"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { TrackBadge } from "@/components/admin/TrackBadge";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { AdminTrackSelect } from "@/components/admin/AdminTrackSelect";
import { HighYieldCard } from "@/components/high-yield/HighYieldCard";
import { CommonConfusionCard } from "@/components/high-yield/CommonConfusionCard";
import { TopTrapsCard } from "@/components/high-yield/TopTrapsCard";
import { Badge } from "@/components/ui/Badge";
import {
  createHighYieldItem,
  updateHighYieldItem,
  type HighYieldItemFormData,
} from "@/app/(app)/actions/high-yield";
import type {
  AdminHighYieldItem,
  SystemOption,
  TopicOption,
  HighYieldContentType,
  ConfusionFrequency,
} from "@/lib/admin/high-yield-studio-loaders";
import type { ExamTrackOption } from "@/components/admin/AdminTrackSelect";
import type { WorkflowStatus } from "@/types/admin";
import type { HighYieldTopic, TopTrap, CommonConfusion } from "@/types/high-yield";
import type { TrackSlug } from "@/data/mock/types";
import { AIDraftGeneratorPanel } from "@/components/admin/AIDraftGeneratorPanel";

const INPUT_CLASS =
  "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm";

const CONTENT_TYPES: { value: HighYieldContentType; label: string }[] = [
  { value: "high_yield_summary", label: "High-Yield Summary" },
  { value: "common_confusion", label: "Common Confusion" },
  { value: "board_trap", label: "Board Trap" },
  { value: "compare_contrast_summary", label: "Compare/Contrast Summary" },
];

const FREQUENCIES: { value: ConfusionFrequency; label: string }[] = [
  { value: "common", label: "Common" },
  { value: "very_common", label: "Very Common" },
  { value: "extremely_common", label: "Extremely Common" },
];

function toPreviewTopic(item: AdminHighYieldItem, track: TrackSlug): HighYieldTopic {
  return {
    topicId: item.topicId ?? item.id,
    topicName: item.title,
    systemId: item.systemId ?? "",
    systemName: "", // Filled by parent
    systemSlug: undefined,
    track,
    score: item.highYieldScore ?? 60,
    whyHighYield: item.whyHighYield ?? "",
    factors: [],
  };
}

function toPreviewTrap(item: AdminHighYieldItem, track: TrackSlug): TopTrap {
  const freq: "common" | "very_common" | "extremely_common" =
    item.trapSeverity && item.trapSeverity >= 4
      ? "extremely_common"
      : item.trapSeverity && item.trapSeverity >= 3
        ? "very_common"
        : "common";
  return {
    id: item.id,
    topicId: item.topicId ?? "",
    topicName: item.title,
    trapDescription: item.trapDescription ?? "",
    correctApproach: item.correctApproach ?? "",
    track,
    frequency: freq as "common" | "very_common" | "extremely_common",
  };
}

function toPreviewConfusion(item: AdminHighYieldItem, track: TrackSlug): CommonConfusion {
  return {
    id: item.id,
    topicId: item.topicId ?? "",
    topicName: item.title,
    conceptA: item.conceptA ?? "",
    conceptB: item.conceptB ?? "",
    keyDifference: item.keyDifference ?? "",
    track,
  };
}

export interface HighYieldProductionStudioProps {
  itemId?: string;
  initialItem?: AdminHighYieldItem | null;
  tracks: ExamTrackOption[];
  systems: SystemOption[];
  topics: TopicOption[];
  defaultTrackId?: string;
}

export function HighYieldProductionStudio({
  itemId,
  initialItem,
  tracks,
  systems,
  topics,
  defaultTrackId,
}: HighYieldProductionStudioProps) {
  const [contentType, setContentType] = useState<HighYieldContentType>(
    initialItem?.contentType ?? "high_yield_summary"
  );
  const [trackId, setTrackId] = useState(
    initialItem?.examTrackId ?? defaultTrackId ?? ""
  );
  const [systemId, setSystemId] = useState(initialItem?.systemId ?? "");
  const [topicId, setTopicId] = useState(initialItem?.topicId ?? "");
  const [title, setTitle] = useState(initialItem?.title ?? "");
  const [explanation, setExplanation] = useState(
    initialItem?.explanation ?? ""
  );
  const [whyHighYield, setWhyHighYield] = useState(
    initialItem?.whyHighYield ?? ""
  );
  const [commonConfusion, setCommonConfusion] = useState(
    initialItem?.commonConfusion ?? ""
  );
  const [suggestedPracticeLink, setSuggestedPracticeLink] = useState(
    initialItem?.suggestedPracticeLink ?? ""
  );
  const [suggestedGuideLink, setSuggestedGuideLink] = useState(
    initialItem?.suggestedGuideLink ?? ""
  );
  const [highYieldScore, setHighYieldScore] = useState<number | "">(
    initialItem?.highYieldScore ?? ""
  );
  const [trapSeverity, setTrapSeverity] = useState<number | "">(
    initialItem?.trapSeverity ?? ""
  );
  const [confusionFrequency, setConfusionFrequency] =
    useState<ConfusionFrequency | "">(
      (initialItem?.confusionFrequency as ConfusionFrequency) ?? ""
    );
  const [trapDescription, setTrapDescription] = useState(
    initialItem?.trapDescription ?? ""
  );
  const [correctApproach, setCorrectApproach] = useState(
    initialItem?.correctApproach ?? ""
  );
  const [conceptA, setConceptA] = useState(initialItem?.conceptA ?? "");
  const [conceptB, setConceptB] = useState(initialItem?.conceptB ?? "");
  const [keyDifference, setKeyDifference] = useState(
    initialItem?.keyDifference ?? ""
  );
  const [status, setStatus] = useState(initialItem?.status ?? "draft");
  const [previewMode, setPreviewMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [showAIDraft, setShowAIDraft] = useState(false);

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

  const trackSlug = (tracks.find((t) => t.id === trackId)?.slug ?? "rn") as TrackSlug;
  const systemName = systems.find((s) => s.id === systemId)?.name ?? "";
  const topicName = topics.find((t) => t.id === topicId)?.name ?? "";

  const previewItem: AdminHighYieldItem = {
    id: itemId ?? "preview",
    contentType,
    examTrackId: trackId,
    systemId: systemId || null,
    topicId: topicId || null,
    title: title || "Untitled",
    explanation: explanation || null,
    whyHighYield: whyHighYield || null,
    commonConfusion: commonConfusion || null,
    suggestedPracticeLink: suggestedPracticeLink || null,
    suggestedGuideLink: suggestedGuideLink || null,
    highYieldScore: highYieldScore === "" ? null : Number(highYieldScore),
    trapSeverity: trapSeverity === "" ? null : Number(trapSeverity),
    confusionFrequency:
      confusionFrequency === ""
        ? null
        : (confusionFrequency as ConfusionFrequency),
    trapDescription: trapDescription || null,
    correctApproach: correctApproach || null,
    conceptA: conceptA || null,
    conceptB: conceptB || null,
    keyDifference: keyDifference || null,
    status,
    displayOrder: 0,
  };

  const handleSave = useCallback(async () => {
    const formData: HighYieldItemFormData = {
      contentType,
      examTrackId: trackId,
      systemId: systemId || null,
      topicId: topicId || null,
      title: title.trim(),
      explanation: explanation.trim() || null,
      whyHighYield: whyHighYield.trim() || null,
      commonConfusion: commonConfusion.trim() || null,
      suggestedPracticeLink: suggestedPracticeLink.trim() || null,
      suggestedGuideLink: suggestedGuideLink.trim() || null,
      highYieldScore: highYieldScore === "" ? null : Number(highYieldScore),
      trapSeverity: trapSeverity === "" ? null : Number(trapSeverity),
      confusionFrequency:
        confusionFrequency === ""
          ? null
          : (confusionFrequency as ConfusionFrequency),
      trapDescription: trapDescription.trim() || null,
      correctApproach: correctApproach.trim() || null,
      conceptA: conceptA.trim() || null,
      conceptB: conceptB.trim() || null,
      keyDifference: keyDifference.trim() || null,
      status,
    };

    setErrors([]);
    setSaving(true);
    try {
      if (itemId) {
        const r = await updateHighYieldItem(itemId, formData);
        if (!r.success) {
          setErrors(r.validationErrors ?? [r.error ?? "Save failed"]);
        }
      } else {
        const r = await createHighYieldItem(formData);
        if (!r.success) {
          setErrors(r.validationErrors ?? [r.error ?? "Save failed"]);
          return;
        }
        if (r.id) window.location.href = `/admin/high-yield/${r.id}`;
      }
    } finally {
      setSaving(false);
    }
  }, [
    itemId,
    contentType,
    trackId,
    systemId,
    topicId,
    title,
    explanation,
    whyHighYield,
    commonConfusion,
    suggestedPracticeLink,
    suggestedGuideLink,
    highYieldScore,
    trapSeverity,
    confusionFrequency,
    trapDescription,
    correctApproach,
    conceptA,
    conceptB,
    keyDifference,
    status,
  ]);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/high-yield"
            className="text-slate-600 dark:text-slate-400 hover:underline"
          >
            ← High-Yield
          </Link>
          {itemId && (
            <span className="text-slate-500 text-sm">
              Editing {itemId.slice(0, 8)}…
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
          {initialItem?.status && (
            <StatusBadge status={initialItem.status as WorkflowStatus} />
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

      {showAIDraft && contentType === "high_yield_summary" && (
        <AIDraftGeneratorPanel
          draftType="high_yield_summary"
          tracks={tracks}
          systems={systems}
          topics={filteredTopics}
          onHighYieldDraft={(d) => {
            setTitle(d.title);
            setExplanation(d.explanation);
            if (d.whyHighYield != null) setWhyHighYield(d.whyHighYield);
            if (d.commonConfusion != null) setCommonConfusion(d.commonConfusion);
            setShowAIDraft(false);
          }}
        />
      )}

      {previewMode ? (
        <div className="space-y-6">
          <p className="text-sm text-slate-500">
            Learner preview — how this will appear on the High-Yield page
          </p>
          {contentType === "high_yield_summary" && (
            <HighYieldCard
              topic={{
                ...toPreviewTopic(previewItem, trackSlug),
                systemName: systemName || "General",
              }}
              practiceHref={suggestedPracticeLink || undefined}
              guideHref={suggestedGuideLink || undefined}
              studyHref={topicId ? `/study-guides?topic=${topicId}` : undefined}
              showWhy={true}
            />
          )}
          {contentType === "board_trap" && (
            <TopTrapsCard
              traps={[toPreviewTrap(previewItem, trackSlug)]}
              track={trackSlug}
              maxItems={1}
            />
          )}
          {contentType === "common_confusion" && (
            <CommonConfusionCard
              confusions={[toPreviewConfusion(previewItem, trackSlug)]}
              track={trackSlug}
              maxItems={1}
            />
          )}
          {contentType === "compare_contrast_summary" && (
            <Card className="border-l-4 border-l-indigo-500">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-heading font-semibold text-slate-900 dark:text-white">
                  {title || "Compare/Contrast"}
                </h3>
                <Badge variant="neutral" size="sm">
                  Compare
                </Badge>
              </div>
              <p className="text-sm text-slate-500">{systemName || topicName}</p>
              {(conceptA || conceptB) && (
                <p className="font-medium text-slate-700 dark:text-slate-300 mt-2">
                  {conceptA} vs {conceptB}
                </p>
              )}
              {keyDifference && (
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                  {keyDifference}
                </p>
              )}
              {explanation && (
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                  {explanation}
                </p>
              )}
              {whyHighYield && (
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">
                  Why high-yield: {whyHighYield}
                </p>
              )}
            </Card>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-slate-900 dark:text-white">
                Content type & metadata
              </h3>
              {contentType === "high_yield_summary" && (
                <button
                  type="button"
                  onClick={() => setShowAIDraft(!showAIDraft)}
                  className="text-sm text-amber-600 hover:underline"
                >
                  {showAIDraft ? "Hide" : "AI"} draft
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Content type
                </label>
                <select
                  value={contentType}
                  onChange={(e) =>
                    setContentType(e.target.value as HighYieldContentType)
                  }
                  className={INPUT_CLASS}
                >
                  {CONTENT_TYPES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
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
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. HFrEF vs HFpEF"
                  className={INPUT_CLASS}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Explanation
                </label>
                <textarea
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  rows={3}
                  className={INPUT_CLASS}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Why high-yield
                </label>
                <textarea
                  value={whyHighYield}
                  onChange={(e) => setWhyHighYield(e.target.value)}
                  rows={2}
                  className={INPUT_CLASS}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Common confusion
                </label>
                <textarea
                  value={commonConfusion}
                  onChange={(e) => setCommonConfusion(e.target.value)}
                  rows={2}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Suggested practice link
                </label>
                <input
                  type="text"
                  value={suggestedPracticeLink}
                  onChange={(e) => setSuggestedPracticeLink(e.target.value)}
                  placeholder="/questions/system/cardiovascular"
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Suggested guide link
                </label>
                <input
                  type="text"
                  value={suggestedGuideLink}
                  onChange={(e) => setSuggestedGuideLink(e.target.value)}
                  placeholder="/study-guides/..."
                  className={INPUT_CLASS}
                />
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
            </div>
          </Card>

          <Card>
            <h3 className="font-medium text-slate-900 dark:text-white mb-4">
              Ranking & type-specific
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(contentType === "high_yield_summary" ||
                contentType === "compare_contrast_summary") && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    High-yield score (0–100)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={highYieldScore}
                    onChange={(e) =>
                      setHighYieldScore(
                        e.target.value === "" ? "" : parseInt(e.target.value, 10)
                      )
                    }
                    className={INPUT_CLASS}
                  />
                </div>
              )}
              {contentType === "board_trap" && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Trap severity (1–5)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={trapSeverity}
                      onChange={(e) =>
                        setTrapSeverity(
                          e.target.value === ""
                            ? ""
                            : parseInt(e.target.value, 10)
                        )
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium mb-1">
                      Trap description
                    </label>
                    <textarea
                      value={trapDescription}
                      onChange={(e) => setTrapDescription(e.target.value)}
                      rows={2}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium mb-1">
                      Correct approach
                    </label>
                    <textarea
                      value={correctApproach}
                      onChange={(e) => setCorrectApproach(e.target.value)}
                      rows={2}
                      className={INPUT_CLASS}
                    />
                  </div>
                </>
              )}
              {contentType === "common_confusion" && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Confusion frequency
                  </label>
                  <select
                    value={confusionFrequency}
                    onChange={(e) =>
                      setConfusionFrequency(
                        e.target.value as ConfusionFrequency | ""
                      )
                    }
                    className={INPUT_CLASS}
                  >
                    <option value="">Select</option>
                    {FREQUENCIES.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {(contentType === "common_confusion" ||
                contentType === "compare_contrast_summary") && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Concept A
                    </label>
                    <input
                      type="text"
                      value={conceptA}
                      onChange={(e) => setConceptA(e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Concept B
                    </label>
                    <input
                      type="text"
                      value={conceptB}
                      onChange={(e) => setConceptB(e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium mb-1">
                      Key difference
                    </label>
                    <textarea
                      value={keyDifference}
                      onChange={(e) => setKeyDifference(e.target.value)}
                      rows={3}
                      className={INPUT_CLASS}
                    />
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
