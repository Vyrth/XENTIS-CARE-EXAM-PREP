import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Icons } from "@/components/ui/icons";

export default function BillingPage() {
  const plan = {
    name: "Pro Monthly",
    price: "$29",
    period: "/month",
    features: ["Unlimited questions", "All study guides", "AI Tutor", "Practice exams"],
  };

  return (
    <div className="p-6 lg:p-8 max-w-2xl space-y-8">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        Billing
      </h1>
      <p className="text-slate-600 dark:text-slate-400">
        Manage your subscription and payment method.
      </p>

      <Card>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-heading font-semibold text-slate-900 dark:text-white">
              Current Plan
            </h2>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {plan.price}
              <span className="text-base font-normal text-slate-500">{plan.period}</span>
            </p>
            <p className="text-sm text-slate-500 mt-1">{plan.name}</p>
          </div>
          <Badge variant="success">Active</Badge>
        </div>
        <ul className="mt-6 space-y-2">
          {plan.features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <span className="text-emerald-500">{Icons.check}</span>
              {f}
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
          Payment Method
        </h2>
        <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
          <span className="text-slate-400">{Icons["credit-card"]}</span>
          <div>
            <p className="font-medium text-slate-900 dark:text-white">
              •••• •••• •••• 4242
            </p>
            <p className="text-sm text-slate-500">Expires 12/26</p>
          </div>
          <button
            type="button"
            className="ml-auto text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Update
          </button>
        </div>
      </Card>

      <Card>
        <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
          Billing History
        </h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
            <span className="text-slate-600 dark:text-slate-400">Mar 1, 2025</span>
            <span className="font-medium">$29.00</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
            <span className="text-slate-600 dark:text-slate-400">Feb 1, 2025</span>
            <span className="font-medium">$29.00</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
