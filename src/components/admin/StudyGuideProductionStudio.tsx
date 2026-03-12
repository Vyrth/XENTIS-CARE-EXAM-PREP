"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { TrackBadge } from "@/components/admin/TrackBadge";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { AdminTrackSelect } from "@/components/admin/AdminTrackSelect";
import { HighlightableContent } from "@/components/study/HighlightableContent";
import { HighYieldFlag } from "@/components/high-yield/HighYieldFlag";
import {
  createStudyGuide,
  updateStudyGuide,
  saveStudyGuideSections,
  reorderStudyGuideSections,
  deleteStudyGuideSection,
  type StudyGuideFormData,
  type StudyGuideSectionInput,
} from "@/app/(app)/actions/study-guides";
import type {
  AdminStudyGuideForEdit,
  AdminStudyGuideSection,
  SectionMetadata,
  SystemOption,
  TopicOption,
} from "@/lib/admin/study-guide-studio-loaders";
import type { ExamTrackOption } from "@/components/admin/AdminTrackSelect";
import type { WorkflowStatus } from "@/types/admin";
import { Icons } from "@/components/ui/icons";
import { AIDraftGeneratorPanel } from "@/components/admin/AIDraftGeneratorPanel";
import { GenerateMnemonicButton } from "@/components/admin/GenerateMnemonicButton";

const INPUT_CLASS =
  "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm";

function buildSectionContent(s: AdminStudyGuideSection): string {
  const m = s.sectionMetadata;
  const parts: string[] = [];
  if (s.contentMarkdown?.trim()) parts.push(s.contentMarkdown.trim());
  if (m.plainExplanation?.trim()) parts.push(m.plainExplanation.trim());
  if (m.boardExplanation?.trim()) parts.push(`\n**Board focus:**\n${m.boardExplanation.trim()}`);
  if (m.keyTakeaways?.length) {
    parts.push("\n**Key takeaways:**\n" + m.keyTakeaways.map((t) => `- ${t}`).join("\n"));
  }
  if (m.commonTraps?.length) {
    parts.push("\n**Common traps:**\n" + m.commonTraps.map((t) => `- ${t}`).join("\n"));
  }
  if (m.mnemonics?.length) {
    parts.push("\n**Mnemonics:**\n" + m.mnemonics.map((m) => `- ${m}`).join("\n"));
  }
  if (m.comparisonTable?.headers?.length && m.comparisonTable?.rows?.length) {
    const h = m.comparisonTable.headers.join(" | ");
    const sep = m.comparisonTable.headers.map(() => "---").join(" | ");
    const rows = m.comparisonTable.rows.map((r) => r.join(" | ")).join("\n");
    parts.push(`\n| ${h} |\n| ${sep} |\n${rows}`);
  }
  return parts.join("\n\n") || "(No content)";
}

function estimateReadMinutes(s: AdminStudyGuideSection): number {
  const m = s.sectionMetadata?.estimatedReadMinutes;
  if (typeof m === "number" && m > 0) return m;
  const content = buildSectionContent(s);
  const words = content.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export interface StudyGuideProductionStudioProps {
  guideId?: string;
  initialGuide?: AdminStudyGuideForEdit | null;
  tracks: ExamTrackOption[];
  systems: SystemOption[];
  topics: TopicOption[];
  defaultTrackId?: string;
}

export function StudyGuideProductionStudio({
  guideId,
  initialGuide,
  tracks,
  systems,
  topics,
  defaultTrackId,
}: StudyGuideProductionStudioProps) {
  const [trackId, setTrackId] = useState(
    initialGuide?.examTrackId ?? defaultTrackId ?? ""
  );
  const [systemId, setSystemId] = useState(initialGuide?.systemId ?? "");
  const [topicId, setTopicId] = useState(initialGuide?.topicId ?? "");
  const [slug, setSlug] = useState(initialGuide?.slug ?? "");
  const [title, setTitle] = useState(initialGuide?.title ?? "");
  const [description, setDescription] = useState(
    initialGuide?.description ?? ""
  );
  const [sections, setSections] = useState<AdminStudyGuideSection[]>(() => {
    const init = initialGuide?.sections ?? [];
    if (init.length > 0) return init;
    return [
      {
        id: "",
        slug: "section-1",
        title: "Introduction",
        contentMarkdown: null,
        contentHtml: null,
        displayOrder: 0,
        sectionMetadata: { isHighlightable: true },
      },
    ];
  });
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [previewMode, setPreviewMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [flashcardLoading, setFlashcardLoading] = useState<string | null>(null);
  const [chunkLoading, setChunkLoading] = useState<string | null>(null);
  const [showAIDraft, setShowAIDraft] = useState(false);
  const router = useRouter();

  const filteredSystems = systems.filter(
    (s) => !trackId || s.examTrackId === trackId
  );
  const filteredTopics = topics.filter((t) => {
    if (!trackId) return true;
    const sysIds = new Set(systems.filter((s) => s.examTrackId === trackId).map((s) => s.id));
    return !t.systemIds?.length || t.systemIds.some((sid) => sysIds.has(sid));
  });

  const activeSection = sections[activeSectionIdx];
  const totalReadMinutes = sections.reduce(
    (sum, s) => sum + estimateReadMinutes(s),
    0
  );

  const updateSection = useCallback(
    (idx: number, updates: Partial<AdminStudyGuideSection>) => {
      setSections((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], ...updates };
        return next;
      });
    },
    []
  );

  const updateSectionMetadata = useCallback(
    (idx: number, updates: Partial<SectionMetadata>) => {
      setSections((prev) => {
        const next = [...prev];
        const meta = next[idx]?.sectionMetadata ?? {};
        next[idx] = {
          ...next[idx],
          sectionMetadata: { ...meta, ...updates },
        };
        return next;
      });
    },
    []
  );

  const addSection = useCallback(() => {
    const newSec: AdminStudyGuideSection = {
      id: "",
      slug: `section-${sections.length + 1}`,
      title: "New Section",
      contentMarkdown: null,
      contentHtml: null,
      displayOrder: sections.length,
      sectionMetadata: { isHighlightable: true },
    };
    setSections((p) => [...p, newSec]);
    setActiveSectionIdx(sections.length);
  }, [sections.length]);

  const removeSection = useCallback(
    (idx: number) => {
      if (sections.length <= 1) return;
      setSections((p) => p.filter((_, i) => i !== idx));
      setActiveSectionIdx(Math.max(0, Math.min(activeSectionIdx, sections.length - 2)));
    },
    [sections.length, activeSectionIdx]
  );

  const moveSection = useCallback(
    (idx: number, dir: "up" | "down") => {
      const next = idx + (dir === "up" ? -1 : 1);
      if (next < 0 || next >= sections.length) return;
      setSections((p) => {
        const arr = [...p];
        [arr[idx], arr[next]] = [arr[next], arr[idx]];
        return arr.map((s, i) => ({ ...s, displayOrder: i }));
      });
      setActiveSectionIdx(next);
    },
    [sections.length]
  );

  const handleSave = useCallback(async (andNext = false) => {
    const formData: StudyGuideFormData = {
      examTrackId: trackId,
      systemId: systemId || null,
      topicId: topicId || null,
      slug: slug.trim() || title.toLowerCase().replace(/\s+/g, "-"),
      title: title.trim(),
      description: description.trim() || null,
    };

    setErrors([]);
    setSaving(true);
    try {
      let gId = guideId;
      if (guideId) {
        const r = await updateStudyGuide(guideId, formData);
        if (!r.success) {
          setErrors(r.validationErrors ?? [r.error ?? "Save failed"]);
          return;
        }
      } else {
        const r = await createStudyGuide(formData);
        if (!r.success) {
          setErrors(r.validationErrors ?? [r.error ?? "Save failed"]);
          return;
        }
        gId = r.guideId;
      }

      if (!gId) return;

      const sectionInputs: StudyGuideSectionInput[] = sections.map((s, i) => ({
        id: s.id || undefined,
        slug: s.slug || `section-${i + 1}`,
        title: s.title,
        contentMarkdown:
          s.contentMarkdown?.trim() ||
          s.sectionMetadata?.plainExplanation?.trim() ||
          null,
        sectionMetadata: s.sectionMetadata ?? {},
        displayOrder: i,
      }));

      const r2 = await saveStudyGuideSections(gId, sectionInputs);
      if (!r2.success) {
        setErrors([r2.error ?? "Failed to save sections"]);
        return;
      }
      if (!guideId) {
        if (andNext) {
          router.push(`/admin/study-guides/new?trackId=${trackId}`);
        } else {
          router.push(`/admin/study-guides/${gId}`);
        }
      }
    } finally {
      setSaving(false);
    }
  }, [
    router,
    guideId,
    trackId,
    systemId,
    topicId,
    slug,
    title,
    description,
    sections,
  ]);

  const handleGenerateFlashcards = useCallback(
    async (sectionId: string) => {
      const sec = sections.find((s) => s.id === sectionId);
      if (!sec) return;
      const text = buildSectionContent(sec);
      if (!text.trim()) return;
      setFlashcardLoading(sectionId);
      try {
        const res = await fetch("/api/ai/generate-flashcards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceText: text.slice(0, 10000),
            examTrack: tracks.find((t) => t.id === trackId)?.slug ?? "rn",
            topicId: topicId || undefined,
            systemId: systemId || undefined,
            sourceType: "study_guide",
            sourceId: sectionId,
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
              flashcards: cards.map((c: { front: string; back: string }) => ({
                front: c.front,
                back: c.back,
              })),
              source_content_type: "study_guide",
              source_content_id: sectionId,
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
    [sections, trackId, systemId, topicId, tracks]
  );

  const handleGenerateChunk = useCallback(
    async (sectionId: string) => {
      const sec = sections.find((s) => s.id === sectionId);
      if (!sec) return;
      const text = buildSectionContent(sec);
      if (!text.trim()) return;
      setChunkLoading(sectionId);
      try {
        const res = await fetch("/api/admin/ai-chunks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contentType: "study_section",
            contentId: sectionId,
            chunkText: text.slice(0, 4000),
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
        setChunkLoading(null);
      }
    },
    [sections, trackId, systemId, topicId]
  );

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/study-guides"
            className="text-slate-600 dark:text-slate-400 hover:underline"
          >
            ← Study Guides
          </Link>
          {guideId && (
            <span className="text-slate-500 text-sm">
              Editing {guideId.slice(0, 8)}…
            </span>
          )}
          {trackId && (
            <TrackBadge
              slug={
                tracks.find((t) => t.id === trackId)?.slug as
                  | "lvn"
                  | "rn"
                  | "fnp"
                  | "pmhnp"
                  ?? null
              }
            />
          )}
          {initialGuide?.status && (
            <StatusBadge status={initialGuide.status as WorkflowStatus} />
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
          {!guideId && (
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

      <p className="text-xs text-slate-500">
        Estimated read time: ~{totalReadMinutes} min total
      </p>

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
        <div className="max-w-4xl mx-auto">
          <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white mb-6">
            {title || "Untitled Guide"}
          </h1>
          <div className="flex flex-col lg:flex-row gap-8">
            <aside className="lg:w-56 shrink-0">
              <nav className="sticky top-24 space-y-1">
                {sections.map((s, i) => (
                  <button
                    key={s.id || i}
                    type="button"
                    onClick={() => setActiveSectionIdx(i)}
                    className={`flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${
                      activeSectionIdx === i
                        ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span className="truncate">{s.title}</span>
                    {(s.sectionMetadata?.highYield ?? false) && (
                      <HighYieldFlag score={80} compact className="shrink-0 ml-auto" />
                    )}
                  </button>
                ))}
              </nav>
            </aside>
            <div className="flex-1 min-w-0">
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="font-heading font-semibold text-slate-900 dark:text-white">
                    {activeSection?.title}
                  </h2>
                  {(activeSection?.sectionMetadata?.highYield ?? false) && (
                    <HighYieldFlag score={80} />
                  )}
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  ~{activeSection ? estimateReadMinutes(activeSection) : 0} min read
                  {activeSection?.sectionMetadata?.isHighlightable !== false &&
                    " · Highlightable"}
                </p>
                <HighlightableContent
                  content={activeSection ? buildSectionContent(activeSection) : ""}
                  contentId={activeSection?.id ?? "preview"}
                  variant="markdown"
                />
              </Card>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <h3 className="font-medium text-slate-900 dark:text-white mb-4">
              Guide metadata
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
                  placeholder="Guide title"
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
            </div>
          </Card>

          {showAIDraft && (
            <AIDraftGeneratorPanel
              draftType="study_section"
              tracks={tracks}
              systems={systems}
              topics={filteredTopics}
              onStudySectionDraft={(d) => {
                setSections((prev) => {
                  const next = [
                    ...prev,
                    {
                      id: "",
                      slug: `section-${prev.length + 1}`,
                      title: d.title,
                      contentMarkdown: d.contentMarkdown,
                      contentHtml: null,
                      displayOrder: prev.length,
                      sectionMetadata: {
                        keyTakeaways: d.keyTakeaways,
                        mnemonics: d.mnemonics,
                        isHighlightable: true,
                      },
                    },
                  ];
                  setActiveSectionIdx(next.length - 1);
                  return next;
                });
                setShowAIDraft(false);
              }}
            />
          )}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-slate-900 dark:text-white">
                Sections ({sections.length})
              </h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAIDraft(!showAIDraft)}
                  className="text-sm text-amber-600 hover:underline"
                >
                  {showAIDraft ? "Hide" : "AI"} draft
                </button>
                <button
                  type="button"
                  onClick={addSection}
                  className="text-sm text-indigo-600 hover:underline"
                >
                  + Add section
                </button>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
              <aside className="lg:w-48 shrink-0">
                <nav className="space-y-1">
                  {sections.map((s, i) => (
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
                        {s.title || "Untitled"}
                      </button>
                      <div className="flex items-center opacity-0 group-hover:opacity-100 transition">
                        <button
                          type="button"
                          onClick={() => moveSection(i, "up")}
                          disabled={i === 0}
                          className="p-1 text-slate-500 hover:text-slate-700 disabled:opacity-30"
                          aria-label="Move up"
                        >
                          {Icons.chevronUp}
                        </button>
                        <button
                          type="button"
                          onClick={() => moveSection(i, "down")}
                          disabled={i === sections.length - 1}
                          className="p-1 text-slate-500 hover:text-slate-700 disabled:opacity-30"
                          aria-label="Move down"
                        >
                          {Icons.chevronDown}
                        </button>
                      </div>
                    </div>
                  ))}
                </nav>
              </aside>

              <div className="flex-1 min-w-0 space-y-4">
                {activeSection && (
                  <SectionEditor
                    section={activeSection}
                    trackId={trackId}
                    trackSlug={(tracks.find((t) => t.id === trackId)?.slug ?? "rn") as "lvn" | "rn" | "fnp" | "pmhnp"}
                    systemId={systemId || undefined}
                    systemName={systems.find((s) => s.id === systemId)?.name}
                    topicId={topicId || undefined}
                    topicName={topics.find((t) => t.id === topicId)?.name}
                    onUpdate={(u) => updateSection(activeSectionIdx, u)}
                    onUpdateMetadata={(u) =>
                      updateSectionMetadata(activeSectionIdx, u)
                    }
                    onRemove={() => removeSection(activeSectionIdx)}
                    onGenerateFlashcards={() =>
                      activeSection.id &&
                      handleGenerateFlashcards(activeSection.id)
                    }
                    onGenerateChunk={() =>
                      activeSection.id && handleGenerateChunk(activeSection.id)
                    }
                    flashcardLoading={
                      flashcardLoading === activeSection.id
                    }
                    chunkLoading={chunkLoading === activeSection.id}
                    estimatedMinutes={estimateReadMinutes(activeSection)}
                  />
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function SectionEditor({
  section,
  trackId,
  trackSlug,
  systemId,
  systemName,
  topicId,
  topicName,
  onUpdate,
  onUpdateMetadata,
  onRemove,
  onGenerateFlashcards,
  onGenerateChunk,
  flashcardLoading,
  chunkLoading,
  estimatedMinutes,
}: {
  section: AdminStudyGuideSection;
  trackId: string;
  trackSlug: "lvn" | "rn" | "fnp" | "pmhnp";
  systemId?: string;
  systemName?: string;
  topicId?: string;
  topicName?: string;
  onUpdate: (u: Partial<AdminStudyGuideSection>) => void;
  onUpdateMetadata: (u: Partial<SectionMetadata>) => void;
  onRemove: () => void;
  onGenerateFlashcards: () => void;
  onGenerateChunk: () => void;
  flashcardLoading: boolean;
  chunkLoading: boolean;
  estimatedMinutes: number;
}) {
  const m = section.sectionMetadata ?? {};
  const INPUT = INPUT_CLASS;

  const addArrayItem = (
    key: "keyTakeaways" | "commonTraps" | "mnemonics",
    value: string
  ) => {
    const arr = m[key] ?? [];
    onUpdateMetadata({ [key]: [...arr, value] });
  };
  const updateArrayItem = (
    key: "keyTakeaways" | "commonTraps" | "mnemonics",
    idx: number,
    value: string
  ) => {
    const arr = [...(m[key] ?? [])];
    arr[idx] = value;
    onUpdateMetadata({ [key]: arr });
  };
  const removeArrayItem = (
    key: "keyTakeaways" | "commonTraps" | "mnemonics",
    idx: number
  ) => {
    const arr = (m[key] ?? []).filter((_, i) => i !== idx);
    onUpdateMetadata({ [key]: arr });
  };

  return (
    <div className="space-y-4 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-slate-900 dark:text-white">
          Section: {section.title || "Untitled"}
        </h4>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onGenerateFlashcards}
            disabled={flashcardLoading || !section.id}
            className="text-xs px-2 py-1 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-900/50 disabled:opacity-50"
          >
            {flashcardLoading ? "Generating…" : "Generate flashcards"}
          </button>
          <button
            type="button"
            onClick={onGenerateChunk}
            disabled={chunkLoading || !section.id}
            className="text-xs px-2 py-1 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 disabled:opacity-50"
          >
            {chunkLoading ? "Saving…" : "Jade summary chunk"}
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
          Section title *
        </label>
        <input
          type="text"
          value={section.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          className={INPUT}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Plain-language explanation
        </label>
        <textarea
          value={m.plainExplanation ?? ""}
          onChange={(e) => onUpdateMetadata({ plainExplanation: e.target.value })}
          rows={4}
          placeholder="Explain in simple terms…"
          className={INPUT}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Board-focused explanation
        </label>
        <textarea
          value={m.boardExplanation ?? ""}
          onChange={(e) =>
            onUpdateMetadata({ boardExplanation: e.target.value })
          }
          rows={4}
          placeholder="How this appears on the exam…"
          className={INPUT}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Key takeaways
        </label>
        {(m.keyTakeaways ?? []).map((t, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input
              type="text"
              value={t}
              onChange={(e) => updateArrayItem("keyTakeaways", i, e.target.value)}
              className={INPUT}
            />
            <button
              type="button"
              onClick={() => removeArrayItem("keyTakeaways", i)}
              className="text-red-500 shrink-0"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => addArrayItem("keyTakeaways", "")}
          className="text-xs text-indigo-600 hover:underline"
        >
          + Add
        </button>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Common traps
        </label>
        {(m.commonTraps ?? []).map((t, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input
              type="text"
              value={t}
              onChange={(e) => updateArrayItem("commonTraps", i, e.target.value)}
              className={INPUT}
            />
            <button
              type="button"
              onClick={() => removeArrayItem("commonTraps", i)}
              className="text-red-500 shrink-0"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => addArrayItem("commonTraps", "")}
          className="text-xs text-indigo-600 hover:underline"
        >
          + Add
        </button>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Mnemonics{" "}
          <GenerateMnemonicButton
            conceptOrText={
              (section.contentMarkdown ?? m.plainExplanation ?? section.title ?? "").slice(0, 500)
            }
            trackId={trackId}
            trackSlug={trackSlug}
            systemId={systemId}
            systemName={systemName}
            topicId={topicId}
            topicName={topicName}
            onGenerated={(mnemonic) => addArrayItem("mnemonics", mnemonic)}
          />
        </label>
        {(m.mnemonics ?? []).map((t, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input
              type="text"
              value={t}
              onChange={(e) => updateArrayItem("mnemonics", i, e.target.value)}
              className={INPUT}
            />
            <button
              type="button"
              onClick={() => removeArrayItem("mnemonics", i)}
              className="text-red-500 shrink-0"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => addArrayItem("mnemonics", "")}
          className="text-xs text-indigo-600 hover:underline"
        >
          + Add
        </button>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Comparison table (optional)
        </label>
        <p className="text-xs text-slate-400 mb-1">
          Headers comma-separated, one row per line, cells comma-separated
        </p>
        <textarea
          value={
            m.comparisonTable
              ? [
                  (m.comparisonTable.headers ?? []).join(", "),
                  ...(m.comparisonTable.rows ?? []).map((r) =>
                    (Array.isArray(r) ? r : [r]).join(", ")
                  ),
                ].join("\n")
              : ""
          }
          onChange={(e) => {
            const lines = e.target.value.split("\n").filter(Boolean);
            if (lines.length === 0) {
              onUpdateMetadata({ comparisonTable: undefined });
              return;
            }
            const headers = lines[0].split(",").map((s) => s.trim());
            const rows = lines.slice(1).map((line) =>
              line.split(",").map((s) => s.trim())
            );
            onUpdateMetadata({ comparisonTable: { headers, rows } });
          }}
          rows={4}
          placeholder="Col A, Col B, Col C&#10;val1, val2, val3"
          className={INPUT}
        />
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={m.highYield ?? false}
            onChange={(e) => onUpdateMetadata({ highYield: e.target.checked })}
            className="rounded"
          />
          <span className="text-sm">High-yield</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={m.isHighlightable !== false}
            onChange={(e) =>
              onUpdateMetadata({ isHighlightable: e.target.checked })
            }
            className="rounded"
          />
          <span className="text-sm">Highlightable</span>
        </label>
        <div className="flex items-center gap-2">
          <label className="text-sm">Est. read (min):</label>
          <input
            type="number"
            min={1}
            max={60}
            value={m.estimatedReadMinutes ?? estimatedMinutes}
            onChange={(e) =>
              onUpdateMetadata({
                estimatedReadMinutes: parseInt(e.target.value, 10) || undefined,
              })
            }
            className="w-16 px-2 py-1 rounded border"
          />
        </div>
      </div>
    </div>
  );
}
