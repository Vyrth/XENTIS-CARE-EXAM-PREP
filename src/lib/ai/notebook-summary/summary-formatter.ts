/**
 * Helper to turn a notebook summary into structured note sections.
 * Reusable for: manual notebook entries, highlighted text, AI explanations, video transcript clips.
 */

import type { NotebookSummaryResponse, NotebookSummarySavePayload } from "./types";

export interface StructuredNoteSection {
  type: string;
  title: string;
  content: string;
}

/** Convert NotebookSummaryResponse to structured sections for display or save */
export function toStructuredNoteSections(
  summary: NotebookSummaryResponse
): StructuredNoteSection[] {
  const sections: StructuredNoteSection[] = [
    { type: "summary", title: "Summary", content: summary.cleanedSummary },
    { type: "takeaways", title: "Key Takeaways", content: summary.keyTakeaways },
    {
      type: "high_yield",
      title: "High-Yield Facts",
      content: summary.highYieldFacts,
    },
    {
      type: "confusion",
      title: "Common Confusion",
      content: summary.commonConfusion,
    },
    { type: "board_tip", title: "Board Tip", content: summary.boardTip },
  ];

  if (summary.mnemonicSuggestion?.trim()) {
    sections.push({
      type: "mnemonic",
      title: "Mnemonic Suggestion",
      content: summary.mnemonicSuggestion,
    });
  }

  return sections;
}

/** Build save-ready payload for ai_saved_outputs.output_data */
export function toSavePayload(
  summary: NotebookSummaryResponse,
  meta: {
    summaryMode: string;
    examTrack: string;
    sourceType?: string;
    sourceId?: string;
    topicId?: string;
    systemId?: string;
  }
): NotebookSummarySavePayload {
  return {
    outputType: "summary",
    cleanedSummary: summary.cleanedSummary,
    keyTakeaways: summary.keyTakeaways,
    highYieldFacts: summary.highYieldFacts,
    commonConfusion: summary.commonConfusion,
    boardTip: summary.boardTip,
    mnemonicSuggestion: summary.mnemonicSuggestion,
    summaryMode: meta.summaryMode as NotebookSummarySavePayload["summaryMode"],
    examTrack: meta.examTrack as NotebookSummarySavePayload["examTrack"],
    sourceType: meta.sourceType,
    sourceId: meta.sourceId,
    topicId: meta.topicId,
    systemId: meta.systemId,
  };
}

/** Format summary as plain text for user_notes.note_text (single concatenated string) */
export function toPlainTextNote(summary: NotebookSummaryResponse): string {
  const sections = toStructuredNoteSections(summary);
  return sections
    .map((s) => `## ${s.title}\n\n${s.content}`)
    .join("\n\n---\n\n");
}
