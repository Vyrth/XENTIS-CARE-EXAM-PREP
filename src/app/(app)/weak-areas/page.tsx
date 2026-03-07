import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Icons } from "@/components/ui/icons";
import {
  rollupBySystem,
  rollupByDomain,
  getWeakRollups,
  generateRemediationPlan,
} from "@/lib/readiness";
import { MOCK_RAW_SYSTEM_PERFORMANCE, MOCK_RAW_DOMAIN_PERFORMANCE } from "@/data/mock/readiness";
import { MOCK_SYSTEMS, MOCK_DOMAINS } from "@/data/mock/systems";

function getSystemSlug(id: string) {
  return MOCK_SYSTEMS.find((s) => s.id === id)?.slug ?? id;
}

export default function WeakAreaCenterPage() {
  const systemRollups = rollupBySystem(MOCK_RAW_SYSTEM_PERFORMANCE);
  const domainRollups = rollupByDomain(MOCK_RAW_DOMAIN_PERFORMANCE);
  const weakSystems = getWeakRollups(systemRollups);
  const weakDomains = getWeakRollups(domainRollups);
  const weakAreas = [...weakSystems, ...weakDomains].sort((a, b) => a.percent - b.percent);

  const remediationPlan = generateRemediationPlan(weakAreas, (type, id) => {
    if (type === "system") return MOCK_SYSTEMS.find((s) => s.id === id)?.name ?? id;
    if (type === "domain") return MOCK_DOMAINS.find((d) => d.id === id)?.name ?? id;
    return id;
  });

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        Weak Area Center
      </h1>
      <p className="text-slate-600 dark:text-slate-400">
        Focus on systems and domains where you need the most improvement. Targeted practice and
        content recommendations.
      </p>

      {weakAreas.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-emerald-600 dark:text-emerald-400 font-medium">
              All systems and domains at or above target!
            </p>
            <p className="text-slate-500 mt-2">Keep up the great work.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-8">
          <div className="space-y-6">
            {weakAreas.map((area) => {
              const entityId = area.id.replace(`${area.type}-`, "");
              const isSystem = area.type === "system";
              const slug = isSystem ? getSystemSlug(entityId) : MOCK_DOMAINS.find((d) => d.id === entityId)?.slug ?? entityId;
              return (
                <Card key={area.id}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="font-heading font-semibold text-slate-900 dark:text-white">
                        {area.name}
                      </h2>
                      <p className="text-sm text-slate-500 mt-1">
                        {area.percent}% — Target: {area.targetPercent}% ({area.correct}/{area.total} correct)
                      </p>
                      <ProgressBar value={area.percent} size="sm" className="mt-2 max-w-xs" />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={
                          isSystem
                            ? `/questions/system/${slug}`
                            : `/questions?domain=${slug}`
                        }
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
                      >
                        Practice Questions
                        {Icons.chevronRight}
                      </Link>
                      <Link
                        href="/study-guides/sg-1"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        Study Guide
                      </Link>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {remediationPlan.length > 0 && (
            <Card>
              <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
                Remediation Plan
              </h2>
              <p className="text-sm text-slate-500 mb-4">
                Suggested actions to close gaps. Estimated questions to reach target.
              </p>
              <div className="space-y-4">
                {remediationPlan.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50"
                  >
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium text-slate-900 dark:text-white">
                        {item.name}
                      </h3>
                      <span className="text-sm text-slate-500">
                        {item.currentPercent}% → {item.targetPercent}% (gap: {item.gap}%)
                      </span>
                    </div>
                    <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-400">
                      {item.suggestedActions.map((action) => (
                        <li key={action}>• {action}</li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs text-slate-500">
                      ~{item.estimatedQuestions} questions recommended
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
