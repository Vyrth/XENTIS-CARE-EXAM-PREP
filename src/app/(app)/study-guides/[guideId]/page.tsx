"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { HighlightableContent } from "@/components/study/HighlightableContent";
import { AIPopover } from "@/components/study/AIPopover";
import { ExplainHighlightPanel } from "@/components/study/ExplainHighlightPanel";
import { HighYieldFlag } from "@/components/high-yield/HighYieldFlag";
import { useAIPopover } from "@/hooks/useAIPopover";
import { useExplainHighlight } from "@/hooks/useExplainHighlight";
import { useTrack } from "@/hooks/useTrack";
import { useNotebook } from "@/hooks/useNotebook";
import { Icons } from "@/components/ui/icons";
import { MOCK_STUDY_GUIDES } from "@/data/mock/study-guides";
import { getTopicIdForSection } from "@/lib/high-yield/section-mapping";

/** High-yield scores by topic (mock - from ranking service in production) */
const MOCK_HY_SCORES: Record<string, number> = {
  "top-1": 72,
  "top-2": 68,
  "top-3": 65,
  "top-4": 78,
  "top-5": 58,
};

export default function StudyGuideReaderPage() {
  const params = useParams();
  const guideId = params.guideId as string;
  const guide = MOCK_STUDY_GUIDES.find((g) => g.id === guideId) ?? null;
  const [activeSection, setActiveSection] = useState(guide?.sections[0]?.id ?? null);
  const track = useTrack();
  const { open, close, selectedText, position, isOpen } = useAIPopover();
  const { state, explain, reset } = useExplainHighlight(track);
  const { addNote } = useNotebook();

  const runExplain = useCallback(
    (mode: "explain_simple" | "board_focus" | "mnemonic") => {
      if (!selectedText) return;
      const section = guide?.sections.find((s) => s.id === activeSection);
      const topicId = section
        ? getTopicIdForSection(section.title, guide?.systemId ?? "") ?? undefined
        : undefined;
      close();
      explain(selectedText, mode, {
        topicId,
        systemId: guide?.systemId,
        sourceType: "study_guide",
        sourceId: section?.id,
      });
    },
    [selectedText, close, explain, guide, activeSection]
  );

  const handleClosePanel = useCallback(() => {
    reset();
  }, [reset]);

  if (!guide) {
    return (
      <div className="p-6">
        <p className="text-slate-500">Study guide not found.</p>
        <Link href="/study-guides" className="text-indigo-600 mt-4 inline-block">
          Back to Study Guides
        </Link>
      </div>
    );
  }

  const section = guide.sections.find((s) => s.id === activeSection) ?? guide.sections[0];

  const handleHighlight = (text: string, rect: DOMRect) => {
    open(text, rect.left, rect.top);
  };

  const handleSaveToNotebook = (text: string) => {
    addNote(text, section?.id);
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
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
        <aside className="lg:w-56 shrink-0">
          <nav className="sticky top-24 space-y-1">
            {guide.sections.map((s) => {
              const topicId = getTopicIdForSection(s.title, guide.systemId);
              const hyScore = topicId ? MOCK_HY_SCORES[topicId] : 0;
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

        <div className="flex-1 min-w-0">
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="font-heading font-semibold text-slate-900 dark:text-white">
                {section?.title}
              </h2>
              <HighYieldFlag
                score={
                  (() => {
                    const tid = getTopicIdForSection(section?.title ?? "", guide.systemId);
                    return tid ? MOCK_HY_SCORES[tid] ?? 0 : 0;
                  })()
                }
              />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Highlight text to Ask AI or Save to Notebook.
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
      </div>

      <AIPopover
        isOpen={isOpen}
        onClose={close}
        selectedText={selectedText}
        position={position}
        onExplainSimply={() => runExplain("explain_simple")}
        onBoardTip={() => runExplain("board_focus")}
        onMnemonic={() => runExplain("mnemonic")}
      />
      <ExplainHighlightPanel
        state={state}
        selectedText={selectedText}
        onClose={handleClosePanel}
        onRetry={() => selectedText && runExplain("explain_simple")}
      />
    </div>
  );
}
