/**
 * Jade Tutor - Strict Response Schemas for Learner Output
 *
 * All AI outputs must conform to these schemas for reliable UI rendering.
 * Never return vague "I'm not certain" unless truly unavoidable.
 */

/** Single practice question for learner display */
export interface LearnerQuestion {
  stem: string;
  options: { key: string; text: string; isCorrect: boolean }[];
  rationale: string;
  correctKey: string;
}

/** Question set response */
export interface QuestionSetResponse {
  questions: LearnerQuestion[];
  topic?: string;
  track?: string;
}

/** Flashcard for learner display */
export interface LearnerFlashcard {
  front: string;
  back: string;
}

/** Flashcard set response */
export interface FlashcardSetResponse {
  flashcards: LearnerFlashcard[];
  topic?: string;
}

/** Explanation response */
export interface ExplanationResponse {
  explanation: string;
  boardTip?: string;
  keyTakeaway?: string;
}

/** Mnemonic response */
export interface MnemonicResponse {
  mnemonic: string;
  explanation?: string;
}

/** Remediation plan response */
export interface RemediationResponse {
  assessment: string;
  recommendations: string[];
  nextSteps: string[];
}
