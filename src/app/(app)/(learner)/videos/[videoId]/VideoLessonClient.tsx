"use client";

import Link from "next/link";
import { useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Icons } from "@/components/ui/icons";
import { HighlightableContent } from "@/components/study/HighlightableContent";
import { AIPopover } from "@/components/study/AIPopover";
import { JadeHighlightPanel } from "@/components/study/JadeHighlightPanel";
import { useAIPopover } from "@/hooks/useAIPopover";
import { useJadeHighlight } from "@/hooks/useJadeHighlight";
import { useTrack } from "@/hooks/useTrack";
import { useNotebook } from "@/hooks/useNotebook";

interface VideoLessonClientProps {
  video: {
    id: string;
    title: string;
    description: string | null;
    videoUrl: string;
    durationMin: number | null;
    systemName: string | null;
    systemSlug: string | null;
    transcript?: string;
  };
  relatedGuides: { id: string; title: string }[];
}

export function VideoLessonClient({ video, relatedGuides }: VideoLessonClientProps) {
  const [showTranscript, setShowTranscript] = useState(false);
  const track = useTrack();
  const { open, close, selectedText, position, isOpen } = useAIPopover();
  const { addNote } = useNotebook();

  const jadeContext = {
    sourceType: "video_transcript" as const,
    sourceId: `video-${video.id}-transcript`,
    systemName: video.systemName ?? undefined,
    concepts: [video.systemName, video.title].filter((c): c is string => !!c),
  };

  const { state: jadeState, run: runJade, reset: resetJade } = useJadeHighlight(
    track ?? "rn",
    jadeContext
  );

  const runAction = useCallback(
    (action: "explain_simple" | "board_focus" | "deep_dive" | "mnemonic" | "compare" | "flashcards" | "summarize") => {
      if (!selectedText) return;
      close();
      runJade(action, selectedText);
    },
    [selectedText, close, runJade]
  );

  const handleHighlight = (text: string, rect: DOMRect) => {
    open(text, rect.left, rect.top);
  };

  const handleSaveToNotebook = (text: string) => {
    addNote(text, `video-${video.id}-transcript`);
  };

  const handleSaveFromPanel = useCallback(
    async (content: string) => {
      addNote(content, `video-${video.id}-transcript`);
      await fetch("/api/ai/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "notebook",
          content,
          source_content_type: "video_transcript",
          source_content_id: video.id,
        }),
      });
    },
    [video.id, addNote]
  );

  const handleSaveFlashcards = useCallback(
    async (flashcards: { front: string; back: string }[]) => {
      await fetch("/api/ai/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "flashcards",
          flashcards,
          source_content_type: "video_transcript",
          source_content_id: video.id,
        }),
      });
    },
    [video.id]
  );

  const showCompare = jadeContext.concepts.length >= 2;

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <Link
        href="/videos"
        className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
      >
        <span className="inline-block rotate-180">{Icons.chevronRight}</span>
        Back to Videos
      </Link>

      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        {video.title}
      </h1>
      <p className="text-slate-600 dark:text-slate-400">
        {video.systemName ?? "General"}
        {video.durationMin != null && ` · ${video.durationMin} min`}
      </p>

      <Card className="aspect-video flex items-center justify-center bg-slate-900 rounded-xl overflow-hidden">
        <div className="w-full h-full flex items-center justify-center">
          {video.videoUrl.startsWith("http") ? (
            <iframe
              src={video.videoUrl}
              title={video.title}
              className="w-full h-full"
              allowFullScreen
            />
          ) : (
            <div className="text-center text-slate-400">
              <span className="inline-block mb-2">{Icons.video}</span>
              <p>Video player placeholder</p>
              <p className="text-sm mt-1">URL: {video.videoUrl}</p>
            </div>
          )}
        </div>
      </Card>

      {video.description && (
        <Card>
          <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-2">
            Description
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm whitespace-pre-wrap">
            {video.description}
          </p>
        </Card>
      )}

      {video.transcript && (
        <Card>
          <button
            type="button"
            onClick={() => setShowTranscript(!showTranscript)}
            className="font-heading font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2"
          >
            Transcript
            <span className="text-slate-500">{showTranscript ? "▼" : "▶"}</span>
          </button>
          {showTranscript && (
            <div className="mt-2">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                Highlight text to ask Jade Tutor, create flashcards, or save to notebook.
              </p>
              <HighlightableContent
                content={video.transcript}
                contentId={`video-${video.id}-transcript`}
                variant="markdown"
                onHighlight={handleHighlight}
                onSaveToNotebook={handleSaveToNotebook}
              />
            </div>
          )}
        </Card>
      )}

      <Card>
        <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
          Related Content
        </h2>
        <div className="space-y-2">
          {relatedGuides.map((g) => (
            <Link
              key={g.id}
              href={`/study-guides/${g.id}`}
              className="block p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              Study Guide: {g.title}
            </Link>
          ))}
          {video.systemSlug && (
            <Link
              href={`/questions/system/${video.systemSlug}`}
              className="block p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              Practice Questions
            </Link>
          )}
        </div>
      </Card>

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
        onClose={resetJade}
        onRetry={() => selectedText && runAction("explain_simple")}
        onSaveToNotebook={handleSaveFromPanel}
        onSaveFlashcards={handleSaveFlashcards}
      />
    </div>
  );
}
