/**
 * Billing config - Stripe price IDs, plan slugs, entitlements
 */

export const PLAN_SLUGS = ["free", "3mo", "6mo", "12mo"] as const;
export type PlanSlug = (typeof PLAN_SLUGS)[number];

export const STRIPE_PRICE_IDS: Record<string, string> = {
  "3mo": process.env.STRIPE_PRICE_ID_3MO ?? "",
  "6mo": process.env.STRIPE_PRICE_ID_6MO ?? "",
  "12mo": process.env.STRIPE_PRICE_ID_12MO ?? "",
};

/** Entitlement limits for Free plan */
export const FREE_ENTITLEMENTS = {
  questionsPerDay: 20,
  aiExplainPerDay: 5,
  aiMnemonicPerDay: 3,
  aiFlashcardsPerDay: 2,
  prePracticeAccess: "diagnostic_only", // 1 diagnostic slice or limited
  fullQuestionBank: false,
  fullSystemExams: false,
  advancedAnalytics: false,
  notebookExport: false,
} as const;

/** Entitlement limits for Paid plans */
export const PAID_ENTITLEMENTS = {
  questionsPerDay: 999,
  aiExplainPerDay: 50,
  aiMnemonicPerDay: 20,
  aiFlashcardsPerDay: 15,
  prePracticeAccess: "full",
  fullQuestionBank: true,
  fullSystemExams: true,
  advancedAnalytics: true,
  notebookExport: true,
} as const;
