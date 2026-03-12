import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { getPrimaryTrack } from "@/lib/auth/track";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Icons } from "@/components/ui/icons";
import {
  rollupBySystem,
  rollupByDomain,
  rollupBySkill,
  rollupByItemType,
  getStrongRollups,
} from "@/lib/readiness";
import { loadMasteryData } from "@/lib/dashboard/loaders";

export default async function StrengthReportPage() {
  const user = await getSessionUser();
  const primary = await getPrimaryTrack(user?.id ?? null);
  const trackId = primary?.trackId ?? null;
  const track = primary?.trackSlug ?? "rn";
  const mastery = await loadMasteryData(user?.id ?? null, trackId);

  const hasActivity =
    mastery.systems.some((r) => r.total > 0) ||
    mastery.domains.some((r) => r.total > 0) ||
    mastery.skills.some((r) => r.total > 0) ||
    mastery.itemTypes.some((r) => r.total > 0);

  const systemRollups = rollupBySystem(mastery.systems);
  const domainRollups = rollupByDomain(mastery.domains);
  const skillRollups = rollupBySkill(mastery.skills);
  const itemTypeRollups = rollupByItemType(mastery.itemTypes);

  const strongSystems = getStrongRollups(systemRollups);
  const strongDomains = getStrongRollups(domainRollups);
  const strongSkills = getStrongRollups(skillRollups);
  const strongItemTypes = getStrongRollups(itemTypeRollups);

  const strongAreas = [...strongSystems, ...strongDomains, ...strongSkills, ...strongItemTypes].sort(
    (a, b) => b.percent - a.percent
  );

  const getSlug = (type: string, id: string) =>
    type === "system" ? (mastery.systemSlugMap[id] ?? id) : (mastery.domainSlugMap[id] ?? id);

  const getPracticeHref = (type: string, id: string) => {
    if (type === "system") return `/questions/system/${getSlug(type, id)}`;
    if (type === "domain") return `/questions?domain=${getSlug(type, id)}`;
    if (type === "item_type") {
      const slug = (mastery as { itemTypeSlugMap?: Record<string, string> }).itemTypeSlugMap?.[id] ?? id;
      return `/questions?itemType=${slug}`;
    }
    return "/questions";
  };

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        Strength Report
      </h1>
      <p className="text-slate-600 dark:text-slate-400">
        Systems, domains, skills, and question types where you&apos;re performing at or above target.
        {primary && ` — ${track.toUpperCase()} track`}
      </p>

      {!hasActivity ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-slate-500 dark:text-slate-400">
              No activity yet. Answer questions to see your strengths.
            </p>
            <p className="text-sm text-slate-400 mt-2">
              Reach 80% accuracy with 5+ questions to see areas at target.
            </p>
            <Link href="/questions" className="text-indigo-600 dark:text-indigo-400 mt-4 inline-block font-medium">
              Start practicing →
            </Link>
          </div>
        </Card>
      ) : strongAreas.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-slate-500">No areas at target yet.</p>
            <p className="text-sm text-slate-400 mt-1">
              Focus on weak areas to improve, then revisit.
            </p>
            <Link href="/weak-areas" className="text-indigo-600 mt-4 inline-block font-medium">
              View weak areas →
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {strongAreas.map((area) => {
            const entityId = area.id.replace(`${area.type}-`, "");
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
                    href={getPracticeHref(area.type, entityId)}
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
