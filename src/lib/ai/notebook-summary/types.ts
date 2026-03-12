/**
 * Notebook Summary types - request/response for /api/ai/notebook-summary
 */

export type ExamTrack = "lvn" | "rn" | "fnp" | "pmhnp";

export type SummaryMode =
  | "clean_summary"
  | "high_yield"
  | "study_outline"
  | "plain_language"
  | "board_focus";

export interface NotebookSummaryRequest {
  noteText: string;
  examTrack: ExamTrack;
  topicId?: string;
  systemId?: string;
  sourceType?: string;
  sourceId?: string;
  summaryMode?: SummaryMode;
}

export interface NotebookSummaryResponse {
  cleanedSummary: string;
  keyTakeaways: string;
  highYieldFacts: string;
  commonConfusion: string;
  boardTip: string;
  mnemonicSuggestion?: string;
}

/** Save-ready payload for user_notes or ai_saved_outputs */
export interface NotebookSummarySavePayload {
  outputType: "summary";
  cleanedSummary: string;
  keyTakeaways: string;
  highYieldFacts: string;
  commonConfusion: string;
  boardTip: string;
  mnemonicSuggestion?: string;
  summaryMode: SummaryMode;
  examTrack: ExamTrack;
  sourceType?: string;
  sourceId?: string;
  topicId?: string;
  systemId?: string;
}
