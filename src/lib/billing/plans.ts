/**
 * Plan definitions for display - name, price, features.
 * Single source of truth for billing UI.
 */

import { STRIPE_PRICE_IDS } from "@/config/billing";

export type PlanSlug = "free" | "trial" | "3_month" | "6_month" | "12_month" | "paid";

export interface PlanDefinition {
  slug: PlanSlug;
  name: string;
  price: string;
  period: string;
  features: string[];
  /** Whether this plan requires Stripe (has checkout) */
  hasCheckout: boolean;
}

export const FREE_PLAN: PlanDefinition = {
  slug: "free",
  name: "Free",
  price: "$0",
  period: "forever",
  hasCheckout: false,
  features: [
    "25 questions/day",
    "3 Jade Tutor actions/day",
    "First 2 study guides & videos",
    "1 flashcard deck",
    "Notebook access",
    "Basic readiness dashboard",
    "Starter pre-practice diagnostic",
  ],
};

export const TRIAL_PLAN: PlanDefinition = {
  slug: "trial",
  name: "1-Month Free Trial",
  price: "$0",
  period: "for 1 month",
  hasCheckout: false,
  features: [
    "Unlimited questions",
    "Full Jade Tutor & flashcards",
    "All study guides & videos",
    "50+ system exams",
    "Advanced analytics",
    "Notebook export",
  ],
};

export const PAID_PLANS: PlanDefinition[] = [
  {
    slug: "3_month",
    name: "3 Month",
    price: "$99",
    period: "/3 months",
    hasCheckout: true,
    features: [
      "Unlimited questions",
      "Full Jade Tutor & flashcards",
      "All study guides & videos",
      "50+ system exams",
      "Advanced analytics",
      "Notebook export",
    ],
  },
  {
    slug: "6_month",
    name: "6 Month",
    price: "$179",
    period: "/6 months",
    hasCheckout: true,
    features: [
      "Unlimited questions",
      "Full Jade Tutor & flashcards",
      "All study guides & videos",
      "50+ system exams",
      "Advanced analytics",
      "Notebook export",
    ],
  },
  {
    slug: "12_month",
    name: "12 Month",
    price: "$299",
    period: "/year",
    hasCheckout: true,
    features: [
      "Unlimited questions",
      "Full Jade Tutor & flashcards",
      "All study guides & videos",
      "50+ system exams",
      "Advanced analytics",
      "Notebook export",
    ],
  },
];

/** Resolve plan slug from Stripe price ID (reverse lookup) */
export function getPlanSlugFromStripePriceId(priceId: string | null | undefined): PlanSlug | null {
  if (!priceId) return null;
  for (const [slug, id] of Object.entries(STRIPE_PRICE_IDS)) {
    if (id && id === priceId) return slug as PlanSlug;
  }
  return null;
}

const PAID_GENERIC: PlanDefinition = {
  slug: "paid",
  name: "Pro",
  price: "Paid",
  period: "active",
  hasCheckout: false,
  features: [
    "Unlimited questions",
    "Full Jade Tutor & flashcards",
    "All study guides & videos",
    "50+ system exams",
    "Advanced analytics",
    "Notebook export",
  ],
};

/** Get plan definition by slug */
export function getPlanBySlug(slug: PlanSlug): PlanDefinition {
  if (slug === "free") return FREE_PLAN;
  if (slug === "trial") return TRIAL_PLAN;
  if (slug === "paid") return PAID_GENERIC;
  const found = PAID_PLANS.find((p) => p.slug === slug);
  return found ?? PAID_GENERIC;
}

/** All plans for display (free + trial + paid) */
export function getAllPlans(): PlanDefinition[] {
  return [FREE_PLAN, TRIAL_PLAN, ...PAID_PLANS];
}

/** Plans that can be purchased (have Stripe checkout) */
export function getPurchasablePlans(): PlanDefinition[] {
  return PAID_PLANS;
}
