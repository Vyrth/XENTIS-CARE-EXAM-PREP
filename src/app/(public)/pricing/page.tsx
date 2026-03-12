import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function PricingPage() {
  const freePlan = {
    name: "Free",
    price: "$0",
    period: "forever",
    slug: "free" as const,
    features: [
      "25 questions/day",
      "3 Jade Tutor actions/day",
      "First 2 study guides & videos",
      "1 flashcard deck",
      "Notebook access",
      "Basic readiness dashboard",
      "Starter pre-practice diagnostic",
    ],
    cta: "Start Free",
    ctaHref: "/login",
    highlighted: true,
  };

  const paidPlans = [
    {
      name: "3 Month",
      price: "$99",
      period: "/3 months",
      slug: "3_month" as const,
      features: [
        "Unlimited questions",
        "Full Jade Tutor & flashcards",
        "All study guides & videos",
        "50+ system exams",
        "Advanced analytics",
        "Notebook export",
      ],
      cta: "Get Started",
      ctaHref: "/login",
    },
    {
      name: "6 Month",
      price: "$179",
      period: "/6 months",
      slug: "6_month" as const,
      features: [
        "Unlimited questions",
        "Full Jade Tutor & flashcards",
        "All study guides & videos",
        "50+ system exams",
        "Advanced analytics",
        "Notebook export",
      ],
      cta: "Get Started",
      ctaHref: "/login",
    },
    {
      name: "12 Month",
      price: "$299",
      period: "/year",
      slug: "12_month" as const,
      features: [
        "Unlimited questions",
        "Full Jade Tutor & flashcards",
        "All study guides & videos",
        "50+ system exams",
        "Advanced analytics",
        "Notebook export",
      ],
      cta: "Get Started",
      ctaHref: "/login",
    },
  ];

  return (
    <div className="py-16 px-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="font-heading text-3xl font-bold text-slate-900 dark:text-white text-center mb-4">
          Pricing
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-center mb-12 max-w-2xl mx-auto">
          Start free with limited access. Upgrade anytime for full question bank,
          system exams, and advanced Jade Tutor.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card
            key={freePlan.name}
            variant="elevated"
            className={`text-center relative ${freePlan.highlighted ? "ring-2 ring-indigo-500" : ""}`}
          >
            {freePlan.highlighted && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge variant="default" className="text-xs">
                  No credit card
                </Badge>
              </div>
            )}
            <p className="font-heading text-lg font-semibold text-slate-900 dark:text-white mt-2">
              {freePlan.name}
            </p>
            <p className="font-heading text-3xl font-bold text-slate-900 dark:text-white">
              {freePlan.price}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              {freePlan.period}
            </p>
            <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2 mb-6 text-left">
              {freePlan.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <Link
              href={freePlan.ctaHref}
              className="block w-full py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 text-center"
            >
              {freePlan.cta}
            </Link>
          </Card>
          {paidPlans.map((plan) => (
            <Card key={plan.name} variant="elevated" className="text-center">
              <p className="font-heading text-lg font-semibold text-slate-900 dark:text-white mt-2">
                {plan.name}
              </p>
              <p className="font-heading text-3xl font-bold text-slate-900 dark:text-white">
                {plan.price}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                {plan.period}
              </p>
              <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2 mb-6 text-left">
                {plan.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <Link
                href={plan.ctaHref}
                className="block w-full py-3 rounded-xl border border-indigo-600 text-indigo-600 dark:text-indigo-400 font-medium hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-center"
              >
                {plan.cta}
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
