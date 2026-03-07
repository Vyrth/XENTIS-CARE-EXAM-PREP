import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function PricingPage() {
  const plans = [
    { name: "LVN/LPN", price: "$29", track: "lvn" as const },
    { name: "RN", price: "$39", track: "rn" as const },
    { name: "FNP", price: "$49", track: "fnp" as const },
    { name: "PMHNP", price: "$49", track: "pmhnp" as const },
  ];

  return (
    <div className="py-16 px-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="font-heading text-3xl font-bold text-slate-900 dark:text-white text-center mb-4">
          Pricing
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-center mb-12 max-w-2xl mx-auto">
          Choose the plan that matches your exam track. All plans include full
          access to study materials, practice exams, and AI tutoring.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <Card key={plan.name} variant="elevated" className="text-center">
              <Badge track={plan.track} className="mb-4">
                {plan.name}
              </Badge>
              <p className="font-heading text-3xl font-bold text-slate-900 dark:text-white">
                {plan.price}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                /month
              </p>
              <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2 mb-6 text-left">
                <li>150-question Pre-Practice Exam</li>
                <li>50+ question system exams</li>
                <li>Study guides & videos</li>
                <li>AI tutor & flashcards</li>
              </ul>
              <a
                href="/login"
                className="block w-full py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 text-center"
              >
                Get Started
              </a>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
