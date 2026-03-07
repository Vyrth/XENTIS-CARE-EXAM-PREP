import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Icons } from "@/components/ui/icons";
import { rollupBySystem, rollupByDomain, getStrongRollups } from "@/lib/readiness";
import { MOCK_RAW_SYSTEM_PERFORMANCE, MOCK_RAW_DOMAIN_PERFORMANCE } from "@/data/mock/readiness";
import { MOCK_SYSTEMS, MOCK_DOMAINS } from "@/data/mock/systems";

function getSystemSlug(id: string) {
  return MOCK_SYSTEMS.find((s) => s.id === id)?.slug ?? id;
}

export default function StrengthReportPage() {
  const systemRollups = rollupBySystem(MOCK_RAW_SYSTEM_PERFORMANCE);
  const domainRollups = rollupByDomain(MOCK_RAW_DOMAIN_PERFORMANCE);
  const strongSystems = getStrongRollups(systemRollups);
  const strongDomains = getStrongRollups(domainRollups);
  const strongAreas = [...strongSystems, ...strongDomains].sort(
    (a, b) => b.percent - a.percent
  );

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        Strength Report
      </h1>
      <p className="text-slate-600 dark:text-slate-400">
        Systems and domains where you&apos;re performing at or above target. Maintain with light
        review.
      </p>

      {strongAreas.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-slate-500">No systems or domains at target yet.</p>
            <Link href="/weak-areas" className="text-indigo-600 mt-4 inline-block">
              Focus on weak areas
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {strongAreas.map((area) => {
            const entityId = area.id.replace(`${area.type}-`, "");
            const isSystem = area.type === "system";
            const slug = isSystem ? getSystemSlug(entityId) : MOCK_DOMAINS.find((d) => d.id === entityId)?.slug ?? entityId;
            return (
              <Card key={area.id}>
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-heading font-semibold text-slate-900 dark:text-white">
                      {area.name}
                    </h2>
                    <Badge variant="success" size="sm" className="mt-2">
                      {area.percent}%
                    </Badge>
                    <ProgressBar value={area.percent} size="sm" className="mt-2" />
                  </div>
                  <Link
                    href={
                      isSystem
                        ? `/questions/system/${slug}`
                        : `/questions?domain=${slug}`
                    }
                    className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                  >
                    Quick review
                    {Icons.chevronRight}
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
