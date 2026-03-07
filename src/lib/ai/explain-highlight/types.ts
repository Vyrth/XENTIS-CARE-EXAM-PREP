/**
 * Explain Highlight types - request/response for /api/ai/explain-highlight
 */

export type ExamTrack = "lvn" | "rn" | "fnp" | "pmhnp";

export type ExplainMode =
  | "explain_simple"
  | "board_focus"
  | "deep_dive"
  | "mnemonic";

export interface ExplainHighlightRequest {
  selectedText: string;
  examTrack: ExamTrack;
  topicId?: string;
  systemId?: string;
  sourceType?: string;
  sourceId?: string;
  mode?: ExplainMode;
}

export interface ExplainHighlightResponse {
  simpleExplanation: string;
  boardTip: string;
  memoryTrick: string;
  suggestedNextStep: string;
}
