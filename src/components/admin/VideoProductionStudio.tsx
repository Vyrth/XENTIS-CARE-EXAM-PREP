"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { TrackBadge } from "@/components/admin/TrackBadge";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { AdminTrackSelect } from "@/components/admin/AdminTrackSelect";
import { HighlightableContent } from "@/components/study/HighlightableContent";
import {
  createVideo,
  updateVideo,
  saveTranscriptSections,
  saveVideoQuizLinks,
} from "@/app/(app)/actions/videos";
import type {
  AdminVideoForEdit,
  TranscriptSection,
  SystemOption,
  TopicOption,
  QuestionOption,
} from "@/lib/admin/video-studio-loaders";
import type { ExamTrackOption } from "@/components/admin/AdminTrackSelect";
import type { WorkflowStatus } from "@/types/admin";
import { Icons } from "@/components/ui/icons";

const INPUT_CLASS =
  "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm";

function buildFullTranscript(sections: TranscriptSection[]): string {
  return sections.map((s) => s.text.trim()).filter(Boolean).join("\n\n");
}

export interface VideoProductionStudioProps {
  videoId?: string;
  initialVideo?: AdminVideoForEdit | null;
  tracks: ExamTrackOption[];
  systems: SystemOption[];
  topics: TopicOption[];
  questions: QuestionOption[];
  defaultTrackId?: string;
}

export function VideoProductionStudio({
  videoId,
  initialVideo,
  tracks,
  systems,
  topics,
  questions,
  defaultTrackId,
}: VideoProductionStudioProps) {
  const [trackId, setTrackId] = useState(
    initialVideo?.examTrackId ?? defaultTrackId ?? ""
  );
  const [systemId, setSystemId] = useState(initialVideo?.systemId ?? "");
  const [topicId, setTopicId] = useState(initialVideo?.topicId ?? "");
  const [slug, setSlug] = useState(initialVideo?.slug ?? "");
  const [title, setTitle] = useState(initialVideo?.title ?? "");
  const [description, setDescription] = useState(
    initialVideo?.description ?? ""
  );
  const [videoUrl, setVideoUrl] = useState(initialVideo?.videoUrl ?? "");
  const [durationSeconds, setDurationSeconds] = useState<number | "">(
    initialVideo?.durationSeconds ?? ""
  );
  const [thumbnailUrl, setThumbnailUrl] = useState(
    initialVideo?.thumbnailUrl ?? ""
  );
  const [status, setStatus] = useState(initialVideo?.status ?? "draft");
  const [transcriptSections, setTranscriptSections] = useState<
    TranscriptSection[]
  >(initialVideo?.transcriptSections ?? []);
  const [quizQuestionIds, setQuizQuestionIds] = useState<string[]>(
    initialVideo?.quizQuestionIds ?? []
  );
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [previewMode, setPreviewMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [summaryLoading, setSummaryLoading] = useState<number | null>(null);
  const [flashcardLoading, setFlashcardLoading] = useState<number | null>(null);
  const router = useRouter();

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

  const fullTranscript = buildFullTranscript(transcriptSections);
  const activeSection = transcriptSections[activeSectionIdx];

  const blockPublishReasons: string[] = [];
  if (!trackId) blockPublishReasons.push("Assign a track");
  if (!videoUrl?.trim()) blockPublishReasons.push("Video URL required");
  if (!title?.trim()) blockPublishReasons.push("Title required");
  if (status === "approved" && !fullTranscript.trim()) {
    blockPublishReasons.push("Transcript required for approved videos");
  }

  const updateSection = useCallback(
    (idx: number, updates: Partial<TranscriptSection>) => {
      setTranscriptSections((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], ...updates };
        return next;
      });
    },
    []
  );

  const addSection = useCallback(() => {
    setTranscriptSections((p) => [
      ...p,
      {
        id: "",
        text: "",
        displayOrder: p.length,
        isRetrievalEligible: true,
      },
    ]);
    setActiveSectionIdx(transcriptSections.length);
  }, [transcriptSections.length]);

  const removeSection = useCallback(
    (idx: number) => {
      setTranscriptSections((p) => p.filter((_, i) => i !== idx));
      setActiveSectionIdx(Math.max(0, Math.min(activeSectionIdx, transcriptSections.length - 2)));
    },
    [activeSectionIdx, transcriptSections.length]
  );

  const moveSection = useCallback(
    (idx: number, dir: "up" | "down") => {
      const next = idx + (dir === "up" ? -1 : 1);
      if (next < 0 || next >= transcriptSections.length) return;
      setTranscriptSections((p) => {
        const arr = [...p];
        [arr[idx], arr[next]] = [arr[next], arr[idx]];
        return arr.map((s, i) => ({ ...s, displayOrder: i }));
      });
      setActiveSectionIdx(next);
    },
    [transcriptSections.length]
  );

  const handleGenerateSummary = useCallback(
    async (sectionIndex: number) => {
      if (!videoId) {
        alert("Save the video first to generate summary chunks.");
        return;
      }
      const sec = transcriptSections[sectionIndex];
      if (!sec?.text?.trim()) return;
      setSummaryLoading(sectionIndex);
      try {
        const res = await fetch("/api/admin/ai-chunks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contentType: "video_transcript",
            contentId: videoId,
            chunkIndex: sectionIndex,
            chunkText: sec.text.slice(0, 4000),
            metadata: {
              system_id: systemId || undefined,
              topic_id: topicId || undefined,
              exam_track_id: trackId || undefined,
              status: "approved",
            },
          }),
        });
        const data = await res.json();
        if (data.success) {
          alert("Summary chunk saved for Jade Tutor retrieval.");
        } else {
          alert(data.error ?? "Failed to save chunk.");
        }
      } catch (e) {
        alert(String(e));
      } finally {
        setSummaryLoading(null);
      }
    },
    [transcriptSections, videoId, trackId, systemId, topicId]
  );

  const handleGenerateFlashcards = useCallback(
    async (sectionIndex: number) => {
      const sec = transcriptSections[sectionIndex];
      if (!sec?.text?.trim()) return;
      setFlashcardLoading(sectionIndex);
      try {
        const res = await fetch("/api/ai/generate-flashcards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceText: sec.text.slice(0, 10000),
            examTrack: tracks.find((t) => t.id === trackId)?.slug ?? "rn",
            topicId: topicId || undefined,
            systemId: systemId || undefined,
            sourceType: "video_transcript",
            sourceId: videoId,
            numberOfCards: 5,
          }),
        });
        const data = await res.json();
        if (data.success && data.data?.flashcards?.length) {
          const cards = data.data.flashcards;
          await fetch("/api/ai/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "flashcards",
              flashcards: cards.map((c: { front_text: string; back_text: string }) => ({
                front: c.front_text,
                back: c.back_text,
              })),
              source_content_type: "video_transcript",
              source_content_id: videoId,
            }),
          });
          alert(`Generated and saved ${cards.length} flashcards.`);
        } else {
          alert(data.error ?? "Failed to generate flashcards.");
        }
      } catch (e) {
        alert(String(e));
      } finally {
        setFlashcardLoading(null);
      }
    },
    [transcriptSections, trackId, systemId, topicId, videoId, tracks]
  );

  const handleSave = useCallback(async (andNext = false) => {
    const formData = {
      examTrackId: trackId,
      systemId: systemId || null,
      topicId: topicId || null,
      slug: slug.trim() || title.toLowerCase().replace(/\s+/g, "-"),
      title: title.trim(),
      description: description.trim() || null,
      videoUrl: videoUrl.trim(),
      durationSeconds: durationSeconds === "" ? null : Number(durationSeconds),
      thumbnailUrl: thumbnailUrl.trim() || null,
      status,
    };

    setErrors([]);
    setSaving(true);
    try {
      let vId = videoId;
      if (videoId) {
        const r = await updateVideo(videoId, formData);
        if (!r.success) {
          setErrors(r.validationErrors ?? [r.error ?? "Save failed"]);
          return;
        }
      } else {
        const r = await createVideo(formData);
        if (!r.success) {
          setErrors(r.validationErrors ?? [r.error ?? "Save failed"]);
          return;
        }
        vId = r.videoId;
      }

      if (!vId) return;

      const sectionInputs = transcriptSections.map((s, i) => ({
        id: s.id || undefined,
        text: s.text,
        displayOrder: i,
        startTimeSeconds: s.startTimeSeconds,
        endTimeSeconds: s.endTimeSeconds,
        isRetrievalEligible: s.isRetrievalEligible ?? true,
      }));

      const r2 = await saveTranscriptSections(
        vId,
        sectionInputs,
        fullTranscript
      );
      if (!r2.success) {
        setErrors([r2.error ?? "Failed to save transcript"]);
        return;
      }

      const r3 = await saveVideoQuizLinks(vId, quizQuestionIds);
      if (!r3.success) {
        setErrors([r3.error ?? "Failed to save quiz links"]);
        return;
      }

      if (!videoId) {
        if (andNext) {
          router.push(`/admin/videos/new?trackId=${trackId}`);
        } else {
          router.push(`/admin/videos/${vId}`);
        }
      }
    } finally {
      setSaving(false);
    }
  }, [
    router,
    videoId,
    trackId,
    systemId,
    topicId,
    slug,
    title,
    description,
    videoUrl,
    durationSeconds,
    thumbnailUrl,
    status,
    transcriptSections,
    fullTranscript,
    quizQuestionIds,
  ]);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/videos"
            className="text-slate-600 dark:text-slate-400 hover:underline"
          >
            ← Videos
          </Link>
          {videoId && (
            <span className="text-slate-500 text-sm">
              Editing {videoId.slice(0, 8)}…
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
          {initialVideo?.status && (
            <StatusBadge status={initialVideo.status as WorkflowStatus} />
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
          {!videoId && (
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={saving}
              className="px-4 py-2 rounded-lg border border-indigo-600 text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/20 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save & Create Next"}
            </button>
          )}
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {blockPublishReasons.length > 0 && status === "approved" && (
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Publish blocked: {blockPublishReasons.join(", ")}
          </p>
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
        <div className="max-w-4xl mx-auto space-y-6">
          <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
            {title || "Untitled Video"}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {systems.find((s) => s.id === systemId)?.name ?? "General"}
            {durationSeconds !== "" && typeof durationSeconds === "number" && (
              <> · {Math.round(durationSeconds / 60)} min</>
            )}
          </p>

          <Card className="aspect-video flex items-center justify-center bg-slate-900 rounded-xl overflow-hidden">
            {videoUrl.startsWith("http") ? (
              <iframe
                src={videoUrl}
                title={title}
                className="w-full h-full"
                allowFullScreen
              />
            ) : (
              <div className="text-center text-slate-400">
                <span className="inline-block mb-2">{Icons.video}</span>
                <p>Video player placeholder</p>
                <p className="text-sm mt-1">URL: {videoUrl || "(none)"}</p>
              </div>
            )}
          </Card>

          {description && (
            <Card>
              <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-2">
                Description
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm whitespace-pre-wrap">
                {description}
              </p>
            </Card>
          )}

          {fullTranscript && (
            <Card>
              <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
                Transcript
              </h2>
              <HighlightableContent
                content={fullTranscript}
                contentId={`video-${videoId ?? "preview"}-transcript`}
                variant="markdown"
              />
            </Card>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <h3 className="font-medium text-slate-900 dark:text-white mb-4">
              Video metadata
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
                <label className="block text-sm font-medium mb-1">Slug</label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="url-slug"
                  className={INPUT_CLASS}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Video title"
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
              <div>
                <label className="block text-sm font-medium mb-1">
                  Video URL *
                </label>
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://..."
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Duration (seconds)
                </label>
                <input
                  type="number"
                  value={durationSeconds}
                  onChange={(e) =>
                    setDurationSeconds(
                      e.target.value === "" ? "" : parseInt(e.target.value, 10)
                    )
                  }
                  placeholder="720"
                  className={INPUT_CLASS}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Thumbnail URL
                </label>
                <input
                  type="url"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="https://..."
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-slate-900 dark:text-white">
                Transcript sections ({transcriptSections.length})
              </h3>
              <button
                type="button"
                onClick={addSection}
                className="text-sm text-indigo-600 hover:underline"
              >
                + Add section
              </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
              <aside className="lg:w-48 shrink-0">
                <nav className="space-y-1 max-h-64 overflow-y-auto">
                  {transcriptSections.map((s, i) => (
                    <div
                      key={s.id || i}
                      className="flex items-center gap-1 group"
                    >
                      <button
                        type="button"
                        onClick={() => setActiveSectionIdx(i)}
                        className={`flex-1 text-left px-2 py-1.5 rounded text-sm truncate ${
                          activeSectionIdx === i
                            ? "bg-indigo-100 dark:bg-indigo-900/50 font-medium"
                            : "hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                      >
                        {s.text.slice(0, 25) || `Section ${i + 1}`}
                      </button>
                      <div className="flex items-center opacity-0 group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => moveSection(i, "up")}
                          disabled={i === 0}
                          className="p-1 text-slate-500 disabled:opacity-30"
                        >
                          {Icons.chevronUp}
                        </button>
                        <button
                          type="button"
                          onClick={() => moveSection(i, "down")}
                          disabled={i === transcriptSections.length - 1}
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
                {activeSection && (
                  <TranscriptSectionEditor
                    section={activeSection}
                    onUpdate={(u) => updateSection(activeSectionIdx, u)}
                    onRemove={() => removeSection(activeSectionIdx)}
                    onGenerateSummary={() => handleGenerateSummary(activeSectionIdx)}
                    onGenerateFlashcards={() => handleGenerateFlashcards(activeSectionIdx)}
                    summaryLoading={summaryLoading === activeSectionIdx}
                    flashcardLoading={flashcardLoading === activeSectionIdx}
                    hasVideoId={!!videoId}
                  />
                )}
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="font-medium text-slate-900 dark:text-white mb-4">
              Associated quiz questions
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Link questions for post-video assessment.
            </p>
            <select
              multiple
              value={quizQuestionIds}
              onChange={(e) => {
                const selected = Array.from(
                  e.target.selectedOptions,
                  (o) => o.value
                );
                setQuizQuestionIds(selected);
              }}
              className={`${INPUT_CLASS} min-h-[120px]`}
            >
              {questions.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.stem} {q.status !== "approved" && `(${q.status})`}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mt-1">
              Ctrl/Cmd+click to select multiple
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}

function TranscriptSectionEditor({
  section,
  onUpdate,
  onRemove,
  onGenerateSummary,
  onGenerateFlashcards,
  summaryLoading,
  flashcardLoading,
  hasVideoId,
}: {
  section: TranscriptSection;
  onUpdate: (u: Partial<TranscriptSection>) => void;
  onRemove: () => void;
  onGenerateSummary: () => void;
  onGenerateFlashcards: () => void;
  summaryLoading: boolean;
  flashcardLoading: boolean;
  hasVideoId: boolean;
}) {
  const INPUT = INPUT_CLASS;

  return (
    <div className="space-y-4 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-slate-900 dark:text-white">
          Transcript section
        </h4>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onGenerateSummary}
            disabled={summaryLoading || !hasVideoId}
            className="text-xs px-2 py-1 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 disabled:opacity-50"
          >
            {summaryLoading ? "Saving…" : "Jade summary chunk"}
          </button>
          <button
            type="button"
            onClick={onGenerateFlashcards}
            disabled={flashcardLoading}
            className="text-xs px-2 py-1 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-900/50 disabled:opacity-50"
          >
            {flashcardLoading ? "Generating…" : "Generate flashcards"}
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
          Section text *
        </label>
        <textarea
          value={section.text}
          onChange={(e) => onUpdate({ text: e.target.value })}
          rows={6}
          placeholder="Transcript content..."
          className={INPUT}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Start (seconds)
          </label>
          <input
            type="number"
            value={section.startTimeSeconds ?? ""}
            onChange={(e) =>
              onUpdate({
                startTimeSeconds:
                  e.target.value === ""
                    ? undefined
                    : parseInt(e.target.value, 10),
              })
            }
            className={INPUT}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            End (seconds)
          </label>
          <input
            type="number"
            value={section.endTimeSeconds ?? ""}
            onChange={(e) =>
              onUpdate({
                endTimeSeconds:
                  e.target.value === ""
                    ? undefined
                    : parseInt(e.target.value, 10),
              })
            }
            className={INPUT}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={section.isRetrievalEligible ?? true}
          onChange={(e) =>
            onUpdate({ isRetrievalEligible: e.target.checked })
          }
          className="rounded"
        />
        <span className="text-sm">AI-retrieval eligible (Jade Tutor)</span>
      </label>
    </div>
  );
}
