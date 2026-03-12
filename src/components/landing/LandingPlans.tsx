import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const PLANS = [
  { name: "1-Month Free Trial", price: "$0", period: "for 1 month", cta: "Start free trial", href: "/login", highlight: true },
  { name: "3 Month", price: "$99", period: "/3 months", cta: "Get started", href: "/login" },
  { name: "6 Month", price: "$179", period: "/6 months", cta: "Get started", href: "/login" },
  { name: "12 Month", price: "$299", period: "/year", cta: "Best value", href: "/login" },
];

export function LandingPlans() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Simple pricing
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Start free. Upgrade anytime for full access.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {PLANS.map((plan) => (
            <Card
              key={plan.name}
              variant="elevated"
              className={`relative text-center transition-all duration-300 hover:shadow-glow rounded-card-lg ${
                plan.highlight
                  ? "ring-2 ring-indigo-500 dark:ring-indigo-400 bg-gradient-to-b from-indigo-50/50 to-white dark:from-indigo-950/30 dark:to-slate-900"
                  : ""
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="default" className="text-xs">
                    Recommended
                  </Badge>
                </div>
              )}
              <p className="font-heading text-lg font-semibold text-slate-900 dark:text-white mt-2">
                {plan.name}
              </p>
              <p className="font-heading text-3xl font-bold text-slate-900 dark:text-white mt-1">
                {plan.price}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                {plan.period}
              </p>
              <Link
                href={plan.href}
                className={`block w-full py-3 rounded-xl font-semibold text-center transition-all duration-300 ${
                  plan.highlight
                    ? "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
                    : "border-2 border-indigo-500/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                }`}
              >
                {plan.cta}
              </Link>
            </Card>
          ))}
        </div>

        <p className="text-center mt-8 text-sm text-slate-500 dark:text-slate-400">
          <Link href="/pricing" className="hover:text-indigo-600 dark:hover:text-indigo-400 underline">
            View full pricing and features →
          </Link>
        </p>
      </div>
    </section>
  );
}
