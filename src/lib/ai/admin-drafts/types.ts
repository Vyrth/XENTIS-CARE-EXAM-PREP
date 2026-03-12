/**
 * Admin AI draft generation - types for all content generators.
 * All output is draft-only, never auto-published.
 */

export type ExamTrack = "lvn" | "rn" | "fnp" | "pmhnp";

export type AdminDraftType =
  | "question"
  | "distractor_rationale"
  | "study_section"
  | "flashcard"
  | "mnemonic"
  | "high_yield_summary";

export interface AdminDraftParams {
  track: ExamTrack;
  trackId: string;
  systemId?: string;
  systemName?: string;
  topicId?: string;
  topicName?: string;
  objective?: string;
  targetDifficulty?: 1 | 2 | 3 | 4 | 5;
  itemType?: string;
}

/** Question draft output */
export interface QuestionDraftOutput {
  stem: string;
  leadIn?: string;
  instructions?: string;
  options: { key: string; text: string; isCorrect: boolean; distractorRationale?: string }[];
  rationale?: string;
}

/** Distractor rationale draft - for a single wrong option */
export interface DistractorRationaleDraftOutput {
  distractorRationale: string;
}

/** Study guide section draft */
export interface StudySectionDraftOutput {
  title: string;
  contentMarkdown: string;
  keyTakeaways?: string[];
  mnemonics?: string[];
}

/** Flashcard draft */
export interface FlashcardDraftOutput {
  frontText: string;
  backText: string;
  hint?: string;
  memoryTrick?: string;
}

/** Mnemonic draft */
export interface MnemonicDraftOutput {
  conceptSummary: string;
  mnemonic: string;
  whyItWorks: string;
  rapidRecallVersion: string;
  boardTip: string;
}

/** High-yield summary draft */
export interface HighYieldSummaryDraftOutput {
  title: string;
  explanation: string;
  whyHighYield?: string;
  commonConfusion?: string;
}

export type AdminDraftOutput =
  | { type: "question"; data: QuestionDraftOutput }
  | { type: "distractor_rationale"; data: DistractorRationaleDraftOutput }
  | { type: "study_section"; data: StudySectionDraftOutput }
  | { type: "flashcard"; data: FlashcardDraftOutput }
  | { type: "mnemonic"; data: MnemonicDraftOutput }
  | { type: "high_yield_summary"; data: HighYieldSummaryDraftOutput };

export interface AdminDraftResult<T = AdminDraftOutput> {
  success: boolean;
  output?: T;
  error?: string;
  auditId?: string;
  promptTokens?: number;
  completionTokens?: number;
}
