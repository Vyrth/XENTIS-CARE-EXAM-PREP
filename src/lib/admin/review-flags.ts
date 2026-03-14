/**
 * Review Flags - exception-only routing for AI Factory.
 *
 * Only route to review queue when one or more flags are raised.
 * If no flags, content skips manual queue and auto-publishes.
 */

export interface ReviewFlags {
  requires_editorial_review: boolean;
  requires_sme_review: boolean;
  requires_legal_review: boolean;
  requires_qa_review: boolean;
}

export function emptyReviewFlags(): ReviewFlags {
  return {
    requires_editorial_review: false,
    requires_sme_review: false,
    requires_legal_review: false,
    requires_qa_review: false,
  };
}

export function hasAnyReviewFlag(flags: ReviewFlags): boolean {
  return (
    flags.requires_editorial_review ||
    flags.requires_sme_review ||
    flags.requires_legal_review ||
    flags.requires_qa_review
  );
}

export interface ComputeReviewFlagsInput {
  /** Schema/validation errors */
  validationErrors?: string[];
  validationStatus?: string;
  /** Missing rationale */
  hasRationale?: boolean;
  /** Evidence/source mapping failed */
  evidenceMappingOk?: boolean;
  /** AI medical validation */
  aiValidationPassed?: boolean;
  aiValidationConfidence?: number;
  /** Duplicate (reject before save - not used for flags) */
  isDuplicate?: boolean;
  /** Board style mismatch - from quality check */
  boardStyleMismatch?: boolean;
}

const CONFIDENCE_THRESHOLD = 0.85;

/**
 * Compute per-lane review flags from validation results.
 * Route to review only when any flag is true.
 */
export function computeReviewFlags(input: ComputeReviewFlagsInput): ReviewFlags {
  const flags = emptyReviewFlags();

  if (input.validationErrors?.length || input.validationStatus === "schema_invalid" || input.validationStatus === "validation_failed") {
    flags.requires_editorial_review = true;
  }
  if (!input.hasRationale) {
    flags.requires_editorial_review = true;
  }
  if (input.boardStyleMismatch) {
    flags.requires_editorial_review = true;
  }

  if (input.evidenceMappingOk === false) {
    flags.requires_legal_review = true;
  }

  const lowConfidence = (input.aiValidationConfidence ?? 0) < CONFIDENCE_THRESHOLD;
  if (input.aiValidationPassed === false || lowConfidence) {
    flags.requires_sme_review = true;
  }

  return flags;
}
