"use client";

import { HighlightableMarkdown } from "@/components/study/HighlightableMarkdown";
import { HighlightableText } from "@/components/study/HighlightableText";

export type HighlightableContentVariant = "markdown" | "html";

export interface HighlightableContentProps {
  content: string;
  contentId: string;
  variant: HighlightableContentVariant;
  onHighlight?: (text: string, rect: DOMRect) => void;
  onSaveToNotebook?: (text: string) => void;
  className?: string;
}

/**
 * Reusable wrapper for highlightable content (study guides, rationales, transcripts, notebook).
 * Renders HighlightableMarkdown or HighlightableText based on variant.
 */
export function HighlightableContent({
  content,
  contentId,
  variant,
  onHighlight,
  onSaveToNotebook,
  className = "",
}: HighlightableContentProps) {
  if (variant === "markdown") {
    return (
      <HighlightableMarkdown
        content={content}
        contentId={contentId}
        onHighlight={onHighlight}
        onSaveToNotebook={onSaveToNotebook}
        className={className}
      />
    );
  }

  return (
    <HighlightableText
      content={content}
      contentId={contentId}
      onHighlight={onHighlight}
      onSaveToNotebook={onSaveToNotebook}
      className={className}
    />
  );
}
