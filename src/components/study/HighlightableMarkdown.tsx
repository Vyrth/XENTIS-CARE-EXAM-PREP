"use client";

import { useCallback, useState } from "react";

type HighlightableMarkdownProps = {
  content: string;
  contentId: string;
  onHighlight?: (text: string, rect: DOMRect) => void;
  onSaveToNotebook?: (text: string) => void;
  className?: string;
};

// Simple markdown-like rendering (bold, headers, lists)
function renderSimpleMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n## (.+)/g, "</p><h3 class='font-heading font-semibold mt-4 mb-2'>$1</h3><p>")
    .replace(/\n- (.+)/g, "</p><li class='ml-4'>$1</li><p>")
    .replace(/\n/g, "<br/>");
}

export function HighlightableMarkdown({
  content,
  onHighlight,
  onSaveToNotebook,
  className = "",
}: HighlightableMarkdownProps) {
  const [selection, setSelection] = useState<string | null>(null);

  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    const text = sel?.toString().trim();
    if (!text) {
      setSelection(null);
      return;
    }
    setSelection(text);
  }, []);

  const handleAskAI = useCallback(() => {
    if (selection && onHighlight) {
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

  const html = renderSimpleMarkdown(content);

  return (
    <div className={`relative ${className}`}>
      <div
        onMouseUp={handleMouseUp}
        className="select-text text-slate-700 dark:text-slate-300 leading-relaxed [&_h3]:font-heading [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_li]:ml-4"
        dangerouslySetInnerHTML={{ __html: html }}
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
