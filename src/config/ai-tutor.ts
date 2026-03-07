/**
 * AI Tutor configuration - model, limits, usage caps
 */

export const AI_TUTOR_CONFIG = {
  /** OpenAI model - use gpt-4o-mini for cost efficiency */
  chatModel: "gpt-4o-mini",
  embeddingModel: "text-embedding-3-small",
  maxTokens: 2048,
  temperature: 0.7,
  /** Max retrieval chunks to include in context */
  maxRetrievalChunks: 8,
  /** Max chars per chunk to avoid token overflow */
  maxChunkChars: 800,
} as const;

/** Content statuses that are approved for retrieval - exclude draft/rejected/internal */
export const APPROVED_CONTENT_STATUSES = ["approved", "published"] as const;

/** Usage limits per plan */
export const AI_USAGE_LIMITS = {
  free: {
    explainPerDay: 5,
    mnemonicPerDay: 3,
    flashcardsPerDay: 2,
    summarizePerDay: 2,
    coachingPerDay: 1,
    quizPerDay: 2,
    comparePerDay: 3,
  },
  paid: {
    explainPerDay: 50,
    mnemonicPerDay: 20,
    flashcardsPerDay: 15,
    summarizePerDay: 10,
    coachingPerDay: 5,
    quizPerDay: 10,
    comparePerDay: 20,
  },
} as const;
