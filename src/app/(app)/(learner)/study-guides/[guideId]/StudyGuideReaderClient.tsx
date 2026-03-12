"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { HighlightableContent } from "@/components/study/HighlightableContent";
import { AIPopover } from "@/components/study/AIPopover";
import { JadeHighlightPanel } from "@/components/study/JadeHighlightPanel";
import { HighYieldFlag } from "@/components/high-yield/HighYieldFlag";
import { useAIPopover } from "@/hooks/useAIPopover";
import { useJadeHighlight } from "@/hooks/useJadeHighlight";
import { useTrack } from "@/hooks/useTrack";
import { useNotebook } from "@/hooks/useNotebook";
import { Icons } from "@/components/ui/icons";
import { getTopicIdForSection } from "@/lib/high-yield/section-mapping";
import type { StudyGuideDetail } from "@/lib/content/loaders";

export function StudyGuideReaderClient({
  guide,
  hyScoreByTopic = new Map<string, number>(),
}: {
  guide: StudyGuideDetail;
  hyScoreByTopic?: Map<string, number>;
}) {
  const [activeSection, setActiveSection] = useState(guide.sections[0]?.id ?? null);
  const track = useTrack();
  const { open, close, selectedText, position, isOpen } = useAIPopover();
  const section = guide.sections.find((s) => s.id === activeSection) ?? guide.sections[0];
  const topicId = section
    ? getTopicIdForSection(section.title, guide.systemId ?? "") ?? undefined
    : undefined;

  const jadeContext = {
    sourceType: "study_guide" as const,
    sourceId: section?.id,
    topicId,
    systemId: guide.systemId ?? undefined,
    systemName: guide.systemName ?? undefined,
    topicName: section?.title,
    concepts: [guide.systemName, section?.title].filter((c): c is string => !!c),
  };

  const { state: jadeState, run: runJade, reset: resetJade } = useJadeHighlight(
    track ?? "rn",
    jadeContext
  );
  const { addNote } = useNotebook();

  const runAction = useCallback(
    (action: "explain_simple" | "board_focus" | "deep_dive" | "mnemonic" | "compare" | "flashcards" | "summarize") => {
      if (!selectedText) return;
      close();
      runJade(action, selectedText);
    },
    [selectedText, close, runJade]
  );

  const handleClosePanel = useCallback(() => {
    resetJade();
  }, [resetJade]);

  const handleHighlight = (text: string, rect: DOMRect) => {
    open(text, rect.left, rect.top);
  };

  const handleSaveToNotebook = (text: string) => {
    addNote(text, section?.id);
  };

  const handleSaveFromPanel = useCallback(
    async (content: string) => {
      addNote(content, section?.id);
      await fetch("/api/ai/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "notebook",
          content,
          source_content_type: "study_guide",
          source_content_id: section?.id,
        }),
      });
    },
    [section?.id, addNote]
  );

  const handleSaveFlashcards = useCallback(
    async (flashcards: { front: string; back: string }[]) => {
      await fetch("/api/ai/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "flashcards",
          flashcards,
          source_content_type: "study_guide",
          source_content_id: section?.id,
        }),
      });
    },
    [section?.id]
  );

  const showCompare = jadeContext.concepts.length >= 2;

  if (guide.sections.length === 0) {
    return (
      <div className="p-6">
        <p className="text-slate-500">This guide has no sections yet.</p>
        <Link href="/study-guides" className="text-indigo-600 mt-4 inline-block">
          Back to Study Guides
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <Link
        href="/study-guides"
        className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-6"
      >
        <span className="inline-block rotate-180">{Icons.chevronRight}</span>
        Back to Study Guides
      </Link>

      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white mb-6">
        {guide.title}
      </h1>

      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="lg:w-56 shrink-0 order-2 lg:order-1">
          <nav className="sticky top-24 space-y-1">
            {guide.sections.map((s) => {
              const tid = getTopicIdForSection(s.title, guide.systemId ?? "");
              const hyScore = tid ? hyScoreByTopic.get(tid) ?? 0 : 0;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveSection(s.id)}
                  className={`flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${
                    activeSection === s.id
                      ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className="truncate">{s.title}</span>
                  <HighYieldFlag score={hyScore} compact className="shrink-0 ml-auto" />
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="flex-1 min-w-0 order-1 lg:order-2">
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="font-heading font-semibold text-slate-900 dark:text-white">
                {section?.title}
              </h2>
              <HighYieldFlag
                score={
                  (() => {
                    const tid = getTopicIdForSection(section?.title ?? "", guide.systemId ?? "");
                    return tid ? hyScoreByTopic.get(tid) ?? 0 : 0;
                  })()
                }
              />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Highlight text to ask Jade Tutor, create flashcards, or save to notebook.
            </p>
            <HighlightableContent
              content={section?.content ?? ""}
              contentId={section?.id ?? ""}
              variant="markdown"
              onHighlight={handleHighlight}
              onSaveToNotebook={handleSaveToNotebook}
            />
          </Card>
        </div>

        <aside className="lg:w-72 shrink-0 order-3">
          <div className="sticky top-24">
            <Card className="border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-950/20">
              <h3 className="font-heading font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                <span>{Icons.sparkles}</span>
                Jade Tutor
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                Highlight text to:
              </p>
              <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1 list-disc list-inside">
                <li>Explain simply</li>
                <li>Get a mnemonic</li>
                <li>Compare concepts</li>
                <li>Create flashcards</li>
                <li>Save to notebook</li>
              </ul>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">
                Select text in the study guide to see actions.
              </p>
            </Card>
          </div>
        </aside>
      </div>

      <AIPopover
        isOpen={isOpen}
        onClose={close}
        selectedText={selectedText}
        position={position}
        onExplainSimply={() => runAction("explain_simple")}
        onBoardTip={() => runAction("board_focus")}
        onDeepDive={() => runAction("deep_dive")}
        onMnemonic={() => runAction("mnemonic")}
        onCompare={showCompare ? () => runAction("compare") : undefined}
        onFlashcards={() => runAction("flashcards")}
        onSummarize={() => runAction("summarize")}
        showCompare={showCompare}
      />
      <JadeHighlightPanel
        state={jadeState}
        selectedText={selectedText}
        onClose={handleClosePanel}
        onRetry={() => selectedText && runAction("explain_simple")}
        onSaveToNotebook={handleSaveFromPanel}
        onSaveFlashcards={handleSaveFlashcards}
      />
    </div>
  );
}
