/**
 * Flashcard Mass Production Plan
 *
 * Targets by track. Generate decks by system and topic.
 * Each flashcard: front_text, back_text; deck has topic_id, system_id, exam_track_id.
 */

export type ExamTrackSlug = "lvn" | "rn" | "fnp" | "pmhnp";

/** Flashcard count targets by track */
export const FLASHCARD_TARGETS: Record<ExamTrackSlug, number> = {
  rn: 4000,
  fnp: 3000,
  pmhnp: 2000,
  lvn: 1600,
};

/** Flashcard styles for generation */
export type FlashcardStyle =
  | "rapid_recall"
  | "definition"
  | "clinical_association"
  | "medication_mechanism"
  | "diagnostic_criteria"
  | "treatment_algorithms";

export const FLASHCARD_STYLES: Record<FlashcardStyle, string> = {
  rapid_recall: "Rapid Recall",
  definition: "Definition",
  clinical_association: "Clinical Association",
  medication_mechanism: "Medication Mechanism",
  diagnostic_criteria: "Diagnostic Criteria",
  treatment_algorithms: "Treatment Algorithms",
};

/** Map style to deck mode (rapid_recall, high_yield_clinical) */
export const STYLE_TO_DECK_MODE: Record<FlashcardStyle, "rapid_recall" | "high_yield_clinical"> = {
  rapid_recall: "rapid_recall",
  definition: "rapid_recall",
  clinical_association: "high_yield_clinical",
  medication_mechanism: "rapid_recall",
  diagnostic_criteria: "rapid_recall",
  treatment_algorithms: "high_yield_clinical",
};

/** Style-specific prompt emphasis */
export const FLASHCARD_STYLE_EMPHASIS: Record<FlashcardStyle, string> = {
  rapid_recall: "Terminology, key facts, normal ranges. Front = term/question, back = concise answer.",
  definition: "Definitions of medical/nursing terms. Front = term, back = clear definition.",
  clinical_association: "Clinical scenarios, what to do, priorities. Front = scenario, back = correct approach.",
  medication_mechanism: "Drug mechanisms, classes, key side effects. Front = drug/concept, back = mechanism or key info.",
  diagnostic_criteria: "DSM/diagnostic criteria, lab cutoffs. Front = condition, back = criteria or key findings.",
  treatment_algorithms: "First-line treatment, stepwise management. Front = condition, back = treatment approach.",
};

/** Batch size: flashcards per job */
export const FLASHCARD_BATCH_SIZE = 500;
