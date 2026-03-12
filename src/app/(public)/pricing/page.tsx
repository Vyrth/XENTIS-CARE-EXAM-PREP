import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Icons } from "@/components/ui/icons";
import {
  TRIAL_PLAN,
  PAID_PLANS,
} from "@/lib/billing/plans";

const PLAN_BADGES: Record<string, { label: string; variant: "default" | "success" | "neutral" }> = {
  trial: { label: "Recommended", variant: "default" },
  "6_month": { label: "Most popular", variant: "success" },
  "12_month": { label: "Best value", variant: "success" },
};

export default function PricingPage() {
  const trialPlan = { ...TRIAL_PLAN, cta: "Start free trial", ctaHref: "/login" };
  const paidWithMeta = PAID_PLANS.map((p) => ({
    ...p,
    cta: "Get started",
    ctaHref: "/login",
    badge: PLAN_BADGES[p.slug],
  }));

  return (
    <div className="py-20 px-6 relative min-h-screen">
      {/* Background - match landing */}
      <div className="absolute inset-0 bg-gradient-mesh bg-slate-50 dark:bg-slate-950" />
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-indigo-400/10 dark:bg-indigo-500/5 blur-3xl -translate-x-1/2" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-violet-400/10 dark:bg-violet-500/5 blur-3xl" />
      <div
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(99,102,241,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,0.5) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="font-heading text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white mb-4">
            Choose your plan
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-6">
            Start with a 1-month free trial. Blueprint-aligned content for LVN,
            RN, FNP, and PMHNP.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-2">
              <span className="text-emerald-500">{Icons.check}</span>
              Blueprint-aligned
            </span>
            <span className="flex items-center gap-2">
              <span className="text-emerald-500">{Icons.check}</span>
              Cancel anytime
            </span>
            <span className="flex items-center gap-2">
              <span className="text-emerald-500">{Icons.check}</span>
              Progress saved
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {/* Free Trial - featured */}
          <Card
            variant="elevated"
            className="relative flex flex-col ring-2 ring-indigo-500 dark:ring-indigo-400 bg-gradient-to-b from-indigo-50/80 to-white dark:from-indigo-950/40 dark:to-slate-900 border-0 shadow-glow transition-all duration-300 hover:shadow-glow-violet rounded-card-lg"
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge variant="default" className="text-xs">
                {PLAN_BADGES.trial.label}
              </Badge>
            </div>
            <div className="p-6 flex-1 flex flex-col">
              <h2 className="font-heading text-lg font-semibold text-slate-900 dark:text-white mt-2">
                {trialPlan.name}
              </h2>
              <p className="font-heading text-3xl font-bold text-slate-900 dark:text-white mt-2">
                {trialPlan.price}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                {trialPlan.period}
              </p>
              <ul className="space-y-3 mb-6 flex-1">
                {trialPlan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <span className="text-emerald-500 shrink-0 mt-0.5 [&>svg]:w-4 [&>svg]:h-4">
                      {Icons.check}
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={trialPlan.ctaHref}
                className="block w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-center shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-300"
              >
                {trialPlan.cta}
              </Link>
            </div>
          </Card>

          {/* Paid plans */}
          {paidWithMeta.map((plan) => (
            <Card
              key={plan.slug}
              variant="elevated"
              className="relative flex flex-col border border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-card-lg transition-all duration-300 hover:shadow-glow"
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant={plan.badge.variant} className="text-xs">
                    {plan.badge.label}
                  </Badge>
                </div>
              )}
              <div className="p-6 flex-1 flex flex-col">
                <h2 className="font-heading text-lg font-semibold text-slate-900 dark:text-white mt-2">
                  {plan.name}
                </h2>
                <p className="font-heading text-3xl font-bold text-slate-900 dark:text-white mt-2">
                  {plan.price}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                  {plan.period}
                </p>
                {plan.slug === "12_month" && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-2">
                    Save ~$100 vs monthly
                  </p>
                )}
                <ul className="space-y-3 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <span className="text-emerald-500 shrink-0 mt-0.5 [&>svg]:w-4 [&>svg]:h-4">
                        {Icons.check}
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.ctaHref}
                  className="block w-full py-3 rounded-xl border-2 border-indigo-500/60 dark:border-indigo-400/50 text-indigo-600 dark:text-indigo-400 font-semibold text-center hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all duration-300"
                >
                  {plan.cta}
                </Link>
              </div>
            </Card>
          ))}
        </div>

        {/* Trust section */}
        <div className="rounded-card-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur border border-slate-200/80 dark:border-slate-800/80 p-8 text-center">
          <p className="text-slate-600 dark:text-slate-400 text-sm max-w-2xl mx-auto">
            All plans include access to blueprint-aligned content for your exam track.
            Upgrade or downgrade anytime. Your progress is always saved.
          </p>
        </div>
      </div>
    </div>
  );
}
