"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Icons } from "@/components/ui/icons";
import {
  getPlanBySlug,
  getPurchasablePlans,
  type PlanSlug,
} from "@/lib/billing/plans";
import { getPriceIdForPlan } from "@/lib/billing/stripe";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export interface MembershipSectionProps {
  /** Current plan: free, trial, or paid slug */
  currentPlanSlug: PlanSlug;
  /** Display status */
  status: "free" | "trial" | "paid";
  /** Trial end or renewal date (ISO) */
  periodEnd: string | null;
  /** Whether Stripe customer portal is available */
  hasStripeCustomer: boolean;
  /** Whether Stripe is configured */
  stripeConfigured: boolean;
}

export function MembershipSection({
  currentPlanSlug,
  status,
  periodEnd,
  hasStripeCustomer,
  stripeConfigured,
}: MembershipSectionProps) {
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const currentPlan = getPlanBySlug(currentPlanSlug);
  const purchasablePlans = getPurchasablePlans();

  const handleUpgrade = async (planSlug: string) => {
    if (!stripeConfigured) return;
    setCheckoutLoading(planSlug);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planSlug }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setCheckoutLoading(null);
    } catch {
      setCheckoutLoading(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Current membership */}
      <section>
        <h2 className="font-heading text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Membership
        </h2>
        <Card className="overflow-hidden">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-heading text-xl font-semibold text-slate-900 dark:text-white">
                    {currentPlan.name}
                  </h3>
                  <Badge
                    variant={
                      status === "free"
                        ? "neutral"
                        : status === "trial"
                          ? "default"
                          : "success"
                    }
                  >
                    {status === "free"
                      ? "Free"
                      : status === "trial"
                        ? "Trial active"
                        : "Paid"}
                  </Badge>
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {currentPlan.price}
                  <span className="text-base font-normal text-slate-500">
                    {" "}
                    {currentPlan.period}
                  </span>
                </p>
                {periodEnd && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                    {status === "trial" ? (
                      <>Trial ends {formatDate(periodEnd)}</>
                    ) : status === "paid" ? (
                      <>Renews {formatDate(periodEnd)}</>
                    ) : null}
                  </p>
                )}
              </div>
            </div>
            <ul className="mt-6 space-y-2">
              {currentPlan.features.map((f) => (
                <li
                  key={f}
                  className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"
                >
                  <span className="text-emerald-500 shrink-0">{Icons.check}</span>
                  {f}
                </li>
              ))}
            </ul>
            {status === "free" && (
              <Link
                href="/pricing"
                className="mt-6 inline-block text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Upgrade for full access →
              </Link>
            )}
            {status === "trial" && (
              <Link
                href="/pricing"
                className="mt-6 inline-block text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                View plans to continue after trial →
              </Link>
            )}
            {status === "paid" && (
              <Link
                href={hasStripeCustomer && stripeConfigured ? "/pricing" : "/pricing"}
                className="mt-6 inline-block text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {hasStripeCustomer && stripeConfigured
                  ? "Manage subscription →"
                  : "View pricing →"}
              </Link>
            )}
          </div>
        </Card>
      </section>

      {/* Available plans */}
      <section>
        <h2 className="font-heading text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Available plans
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {purchasablePlans.map((plan) => {
            const isCurrent =
              status === "paid" && currentPlanSlug === plan.slug;
            const hasCheckout =
              plan.hasCheckout && getPriceIdForPlan(plan.slug);
            const isLoading = checkoutLoading === plan.slug;

            return (
              <Card
                key={plan.slug}
                className={`relative overflow-hidden ${
                  isCurrent ? "ring-2 ring-indigo-500" : ""
                }`}
              >
                {isCurrent && (
                  <div className="absolute top-3 right-3">
                    <Badge variant="success" className="text-xs">
                      Current
                    </Badge>
                  </div>
                )}
                <div className="p-5">
                  <p className="font-heading font-semibold text-slate-900 dark:text-white">
                    {plan.name}
                  </p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                    {plan.price}
                    <span className="text-sm font-normal text-slate-500">
                      {plan.period}
                    </span>
                  </p>
                  <ul className="mt-4 space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
                    {plan.features.slice(0, 4).map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <span className="text-emerald-500 shrink-0">
                          {Icons.check}
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  {!isCurrent && (
                    <div className="mt-4">
                      {hasCheckout ? (
                        <button
                          type="button"
                          onClick={() => handleUpgrade(plan.slug)}
                          disabled={isLoading}
                          className="w-full py-2.5 rounded-lg border border-indigo-600 text-indigo-600 dark:text-indigo-400 font-medium hover:bg-indigo-50 dark:hover:bg-indigo-950/30 disabled:opacity-50 transition"
                        >
                          {isLoading ? "Redirecting..." : "Upgrade plan"}
                        </button>
                      ) : (
                        <Link
                          href="/pricing"
                          className="block w-full py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-50 dark:hover:bg-slate-800/50 text-center transition"
                        >
                          View pricing
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
        {!stripeConfigured && (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            Payment processing is being set up. Contact support to upgrade.
          </p>
        )}
      </section>
    </div>
  );
}
