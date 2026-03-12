/**
 * Billing config - Stripe price IDs, plan slugs, entitlements
 */

export const PLAN_SLUGS = ["free", "3_month", "6_month", "12_month"] as const;
export type PlanSlug = (typeof PLAN_SLUGS)[number];

export const STRIPE_PRICE_IDS: Record<string, string> = {
  "3_month": process.env.STRIPE_PRICE_ID_3MO ?? "",
  "6_month": process.env.STRIPE_PRICE_ID_6MO ?? "",
  "12_month": process.env.STRIPE_PRICE_ID_12MO ?? "",
};

/** Entitlement limits for Free plan - limited access, no credit card required */
export const FREE_ENTITLEMENTS = {
  questionsPerDay: 25,
  /** Total Jade Tutor actions per day (explain, mnemonic, flashcard, summarize, etc.) */
  aiActionsPerDay: 3,
  /** Free: 1 starter diagnostic slice; paid: full pre-practice */
  prePracticeAccess: "diagnostic_only" as const,
  fullQuestionBank: false,
  fullSystemExams: false,
  advancedAnalytics: false,
  notebookExport: false,
  /** Free: first 2 study guides; paid: all */
  studyGuidesLimit: 2,
  /** Free: first 2 videos; paid: all */
  videosLimit: 2,
  /** Free: first 1 flashcard deck; paid: all */
  flashcardDecksLimit: 1,
  notebookAccess: true,
  basicReadinessAnalytics: true,
} as const;

/** Entitlement limits for Paid plans - full access */
export const PAID_ENTITLEMENTS = {
  questionsPerDay: 999,
  aiActionsPerDay: 999,
  prePracticeAccess: "full" as const,
  fullQuestionBank: true,
  fullSystemExams: true,
  advancedAnalytics: true,
  notebookExport: true,
  studyGuidesLimit: 999,
  videosLimit: 999,
  flashcardDecksLimit: 999,
  notebookAccess: true,
  basicReadinessAnalytics: true,
} as const;
