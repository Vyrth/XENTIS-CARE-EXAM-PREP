"use client";

import { useState, useCallback } from "react";

export interface HighlightRange {
  id: string;
  startOffset: number;
  endOffset: number;
  text: string;
  color?: string;
}

export function useHighlight(contentId: string) {
  const [highlights, setHighlights] = useState<HighlightRange[]>([]);

  const addHighlight = useCallback((range: Omit<HighlightRange, "id">) => {
    const id = `hl-${Date.now()}`;
    setHighlights((prev) => [...prev, { ...range, id }]);
    return id;
  }, []);

  const removeHighlight = useCallback((id: string) => {
    setHighlights((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const clearHighlights = useCallback(() => setHighlights([]), []);

  return { highlights, addHighlight, removeHighlight, clearHighlights };
}
