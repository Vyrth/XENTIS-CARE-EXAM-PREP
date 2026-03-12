"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Icons } from "@/components/ui/icons";

const PAID_FEATURES = [
  "Unlimited questions",
  "Full Jade Tutor & flashcards",
  "All study guides & videos",
  "50+ system exams",
  "Advanced analytics",
  "Notebook export",
];

const TRIAL_FEATURES = [
  "1 month full access",
  "Unlimited questions & Jade Tutor",
  "All study guides, videos, exams",
  "No credit card required",
  "Progress saved to your profile",
];

const PAID_PLANS = [
  { slug: "3_month" as const, name: "3 Month", price: "$99", period: "/3 months", value: "Best for short-term prep" },
  { slug: "6_month" as const, name: "6 Month", price: "$179", period: "/6 months", value: "Most popular" },
  { slug: "12_month" as const, name: "12 Month", price: "$299", period: "/year", value: "Best value" },
];

export interface PlanSelectStepProps {
  onTrialSelected: () => void;
}

export function PlanSelectStep({ onTrialSelected }: PlanSelectStepProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTrial = async () => {
    setError(null);
    setLoading("trial");
    try {
      const res = await fetch("/api/onboarding/select-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "trial" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to activate trial");
      onTrialSelected();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(null);
    }
  };

  const handlePaid = async (planSlug: string) => {
    setError(null);
    setLoading(planSlug);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planSlug }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Checkout failed");
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error("No checkout URL returned");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
        Choose your plan to get started. You can change or upgrade anytime.
      </p>

      {error && (
        <div
          role="alert"
          className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200 text-sm font-medium"
        >
          {error}
        </div>
      )}

      <div className="grid gap-4">
        {/* Free trial - recommended */}
        <div className="relative rounded-xl border-2 border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 dark:border-indigo-500 p-5">
          <div className="absolute -top-3 left-4">
            <Badge variant="default" className="text-xs">
              Recommended
            </Badge>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">
                1-Month Free Trial
              </h3>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                $0 <span className="text-base font-normal text-slate-500">for 1 month</span>
              </p>
              <ul className="mt-3 space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
                {TRIAL_FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="text-emerald-500 shrink-0">{Icons.check}</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              onClick={handleTrial}
              disabled={loading !== null}
              className="shrink-0 w-full sm:w-auto py-3 px-6 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading === "trial" ? "Activating..." : "Start Free Trial"}
            </button>
          </div>
        </div>

        {/* Paid plans */}
        {PAID_PLANS.map((plan) => (
          <div
            key={plan.slug}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  {plan.name}
                </h3>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {plan.price}
                  <span className="text-base font-normal text-slate-500">{plan.period}</span>
                </p>
                <p className="text-sm text-slate-500 mt-1">{plan.value}</p>
                <ul className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-400">
                  {PAID_FEATURES.slice(0, 3).map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <span className="text-emerald-500 shrink-0">{Icons.check}</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                onClick={() => handlePaid(plan.slug)}
                disabled={loading !== null}
                className="shrink-0 w-full sm:w-auto py-3 px-6 rounded-xl border border-indigo-600 text-indigo-600 dark:text-indigo-400 font-medium hover:bg-indigo-50 dark:hover:bg-indigo-950/30 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading === plan.slug ? "Redirecting..." : "Get Started"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
