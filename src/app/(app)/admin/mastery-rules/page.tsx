import { Card } from "@/components/ui/Card";
import { MOCK_MASTERY_RULES } from "@/data/mock/admin";
import { MOCK_SYSTEMS, MOCK_DOMAINS } from "@/data/mock/systems";

export default function MasteryRuleManagerPage() {
  return (
    <div className="p-6 lg:p-8 space-y-8">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        Mastery Rule Manager
      </h1>
      <p className="text-slate-600 dark:text-slate-400">
        Define mastery thresholds by system or domain. Used for adaptive recommendations and progress tracking.
      </p>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left p-4 text-sm font-medium text-slate-500">Name</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Scope</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Threshold</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Min Questions</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Enabled</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_MASTERY_RULES.map((rule) => {
                const scope = rule.systemId
                  ? MOCK_SYSTEMS.find((s) => s.id === rule.systemId)?.name ?? rule.systemId
                  : rule.domainId
                    ? MOCK_DOMAINS.find((d) => d.id === rule.domainId)?.name ?? rule.domainId
                    : "—";
                return (
                  <tr key={rule.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-4 font-medium text-slate-900 dark:text-white">{rule.name}</td>
                    <td className="p-4 text-slate-600 dark:text-slate-400">{scope}</td>
                    <td className="p-4 text-slate-600 dark:text-slate-400">{rule.thresholdPercent}%</td>
                    <td className="p-4 text-slate-600 dark:text-slate-400">{rule.minQuestions}</td>
                    <td className="p-4">{rule.enabled ? "Yes" : "No"}</td>
                    <td className="p-4">
                      <button type="button" className="text-indigo-600 hover:underline text-sm">Edit</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <button type="button" className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700">
        + Add rule
      </button>
    </div>
  );
}
