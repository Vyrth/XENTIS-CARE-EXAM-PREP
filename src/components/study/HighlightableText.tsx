"use client";

import { useRef, useCallback, useState } from "react";

type HighlightableTextProps = {
  content: string;
  contentId: string;
  onHighlight?: (text: string, rect: DOMRect) => void;
  onSaveToNotebook?: (text: string) => void;
  className?: string;
};

export function HighlightableText({
  content,
  contentId,
  onHighlight,
  onSaveToNotebook,
  className = "",
}: HighlightableTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<string | null>(null);

  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    const text = sel?.toString().trim();
    if (!text) {
      setSelection(null);
      return;
    }
    setSelection(text);
    if (onHighlight && containerRef.current) {
      const range = sel?.getRangeAt(0);
      const rect = range?.getBoundingClientRect();
      if (rect) onHighlight(text, rect);
    }
  }, [onHighlight]);

  const handleAskAI = useCallback(() => {
    if (selection && onHighlight && containerRef.current) {
      const sel = window.getSelection();
      const range = sel?.getRangeAt(0);
      const rect = range?.getBoundingClientRect();
      if (rect) onHighlight(selection, rect);
    }
  }, [selection, onHighlight]);

  const handleSaveToNotebook = useCallback(() => {
    if (selection && onSaveToNotebook) {
      onSaveToNotebook(selection);
      setSelection(null);
      window.getSelection()?.removeAllRanges();
    }
  }, [selection, onSaveToNotebook]);

  return (
    <div className={`relative ${className}`}>
      <div
        ref={containerRef}
        onMouseUp={handleMouseUp}
        className="select-text prose prose-slate dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: content }}
      />
      {selection && (
        <div className="fixed z-50 flex gap-1 p-1 bg-slate-800 rounded-lg shadow-lg">
          <button
            type="button"
            onClick={handleAskAI}
            className="px-2 py-1 text-sm text-white hover:bg-slate-700 rounded"
          >
            Ask AI
          </button>
          <button
            type="button"
            onClick={handleSaveToNotebook}
            className="px-2 py-1 text-sm text-white hover:bg-slate-700 rounded"
          >
            Save to Notebook
          </button>
        </div>
      )}
    </div>
  );
}
