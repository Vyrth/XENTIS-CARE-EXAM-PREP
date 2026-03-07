/**
 * Billing types - aligned with user_subscriptions
 */

export type SubscriptionStatus =
  | "active"
  | "canceled"
  | "past_due"
  | "trialing"
  | "incomplete";

export interface UserSubscription {
  id: string;
  userId: string;
  subscriptionPlanId: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  status: SubscriptionStatus;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Entitlements {
  plan: "free" | "paid";
  questionsPerDay: number;
  aiExplainPerDay: number;
  aiMnemonicPerDay: number;
  aiFlashcardsPerDay: number;
  prePracticeAccess: "diagnostic_only" | "full";
  fullQuestionBank: boolean;
  fullSystemExams: boolean;
  advancedAnalytics: boolean;
  notebookExport: boolean;
}
