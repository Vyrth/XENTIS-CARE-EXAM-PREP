import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Icons } from "@/components/ui/icons";
import { getSessionUser } from "@/lib/auth/session";
import { getEntitlements } from "@/lib/billing/access";
import { getSubscription } from "@/lib/billing/subscription";
import { FREE_ENTITLEMENTS } from "@/config/billing";
import { TrialStatusIndicator } from "@/components/billing/TrialStatusIndicator";

export default async function BillingPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const [entitlements, subscription] = await Promise.all([
    getEntitlements(user.id),
    getSubscription(user.id),
  ]);
  const isFree = entitlements.plan === "free";
  const periodEnd =
    (subscription as { current_period_end?: string; currentPeriodEnd?: string })?.current_period_end ??
    (subscription as { currentPeriodEnd?: string })?.currentPeriodEnd ??
    null;
  const isTrialing =
    subscription?.status === "trialing" &&
    periodEnd &&
    new Date(periodEnd) > new Date();

  const freeFeatures = [
    `${FREE_ENTITLEMENTS.questionsPerDay} questions/day`,
    `${FREE_ENTITLEMENTS.aiActionsPerDay} Jade Tutor actions/day`,
    "Selected study guides & videos",
    "Limited flashcards",
    "Notebook access",
    "Basic readiness analytics",
  ];

  const paidFeatures = [
    "Unlimited questions",
    "Full Jade Tutor & flashcards",
    "All study guides & videos",
    "50+ system exams",
    "Advanced analytics",
    "Notebook export",
  ];

  return (
    <div className="p-6 lg:p-8 max-w-2xl space-y-8">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        Billing
      </h1>
      <p className="text-slate-600 dark:text-slate-400">
        Manage your subscription and plan.
      </p>

      {isTrialing && (
        <TrialStatusIndicator trialEndDate={periodEnd} showUpgradeCta={true} />
      )}

      <Card>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-heading font-semibold text-slate-900 dark:text-white">
              Current Plan
            </h2>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {isFree ? "$0" : isTrialing ? "Free trial" : "Paid"}
              <span className="text-base font-normal text-slate-500">
                {isFree ? " forever" : isTrialing ? " · full access" : ""}
              </span>
            </p>
            <p className="text-sm text-slate-500 mt-1">
              {isFree ? "Free" : isTrialing ? "1 month free" : "Pro"}
            </p>
          </div>
          <Badge variant={isFree ? "neutral" : "success"}>
            {isFree ? "Free" : isTrialing ? "Trial" : "Active"}
          </Badge>
        </div>
        <ul className="mt-6 space-y-2">
          {(isFree ? freeFeatures : paidFeatures).map((f) => (
            <li key={f} className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <span className="text-emerald-500">{Icons.check}</span>
              {f}
            </li>
          ))}
        </ul>
        {isFree && (
          <>
            <p className="mt-6 text-sm text-slate-600 dark:text-slate-400">
              Your progress and achievements are saved to your profile. Upgrade anytime for full access.
            </p>
            <Link
              href="/pricing"
              className="mt-4 inline-block text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Upgrade for full access →
            </Link>
          </>
        )}
        {isTrialing && (
          <Link
            href="/pricing"
            className="mt-4 inline-block text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            View plans to continue after trial →
          </Link>
        )}
      </Card>

      {!isFree && !isTrialing && (
        <Card>
          <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
            Subscription
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Manage your payment method and view billing history in the customer portal.
          </p>
          <Link
            href="/pricing"
            className="mt-4 inline-block text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Manage subscription →
          </Link>
        </Card>
      )}
    </div>
  );
}
