/**
 * Mnemonic Generator types - request/response for /api/ai/mnemonic
 */

export type ExamTrack = "lvn" | "rn" | "fnp" | "pmhnp";

export type MnemonicStyle =
  | "acronym"
  | "phrase"
  | "story"
  | "visual_hook"
  | "compare_contrast";

export interface MnemonicRequest {
  selectedText: string;
  conceptTitle?: string;
  examTrack: ExamTrack;
  topicId?: string;
  systemId?: string;
  sourceType?: string;
  sourceId?: string;
  mnemonicStyle?: MnemonicStyle;
}

export interface MnemonicResponse {
  conceptSummary: string;
  mnemonic: string;
  whyItWorks: string;
  rapidRecallVersion: string;
  boardTip: string;
}

/** Payload suitable for saving to notebook or flashcard (future use) */
export interface MnemonicSavePayload {
  conceptSummary: string;
  mnemonic: string;
  whyItWorks: string;
  rapidRecallVersion: string;
  boardTip: string;
  conceptTitle?: string;
  mnemonicStyle: MnemonicStyle;
  examTrack: ExamTrack;
  sourceType?: string;
  sourceId?: string;
}
