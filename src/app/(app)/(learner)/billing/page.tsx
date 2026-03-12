import { getSessionUser } from "@/lib/auth/session";
import { getEntitlements } from "@/lib/billing/access";
import { getSubscription } from "@/lib/billing/subscription";
import { getPlanSlugFromStripePriceId } from "@/lib/billing/plans";
import { getPriceIdForPlan } from "@/lib/billing/stripe";
import { TrialStatusIndicator } from "@/components/billing/TrialStatusIndicator";
import { MembershipSection } from "@/components/billing/MembershipSection";

export default async function BillingPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const [entitlements, subscription] = await Promise.all([
    getEntitlements(user.id),
    getSubscription(user.id),
  ]);
  const isFree = entitlements.plan === "free";
  const sub = subscription as {
    status?: string;
    current_period_end?: string;
    currentPeriodEnd?: string;
    stripe_price_id?: string;
    stripe_customer_id?: string;
  } | null;
  const periodEnd =
    sub?.current_period_end ?? sub?.currentPeriodEnd ?? null;
  const isTrialing =
    sub?.status === "trialing" &&
    periodEnd &&
    new Date(periodEnd) > new Date();

  const stripeConfigured = !!(
    getPriceIdForPlan("3_month") ||
    getPriceIdForPlan("6_month") ||
    getPriceIdForPlan("12_month")
  );
  const hasStripeCustomer = !!sub?.stripe_customer_id;

  let currentPlanSlug: "free" | "trial" | "3_month" | "6_month" | "12_month" | "paid" = "free";
  let status: "free" | "trial" | "paid" = "free";
  if (isTrialing) {
    currentPlanSlug = "trial";
    status = "trial";
  } else if (!isFree && sub) {
    const paidSlug = getPlanSlugFromStripePriceId(sub.stripe_price_id);
    currentPlanSlug = paidSlug ?? "paid";
    status = "paid";
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl space-y-10">
      <div>
        <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
          Billing
        </h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Manage your subscription and plan.
        </p>
      </div>

      {isTrialing && (
        <TrialStatusIndicator trialEndDate={periodEnd} showUpgradeCta={true} />
      )}

      <MembershipSection
        currentPlanSlug={currentPlanSlug}
        status={status}
        periodEnd={periodEnd}
        hasStripeCustomer={hasStripeCustomer}
        stripeConfigured={stripeConfigured}
      />
    </div>
  );
}
