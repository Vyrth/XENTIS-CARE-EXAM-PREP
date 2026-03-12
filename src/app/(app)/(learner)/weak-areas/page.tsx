import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { getPrimaryTrack } from "@/lib/auth/track";
import { Card } from "@/components/ui/Card";
import {
  rollupBySystem,
  rollupByDomain,
  rollupBySkill,
  rollupByItemType,
  getWeakRollups,
  generateRemediationPlan,
} from "@/lib/readiness";
import { loadMasteryData, loadReadinessScore } from "@/lib/dashboard/loaders";
import { getReadinessBandInfo } from "@/lib/readiness/readiness-score";
import { WeakAreaCenterClient } from "./WeakAreaCenterClient";

export default async function WeakAreaCenterPage() {
  const user = await getSessionUser();
  const primary = await getPrimaryTrack(user?.id ?? null);
  const trackId = primary?.trackId ?? null;
  const track = primary?.trackSlug ?? "rn";
  const mastery = await loadMasteryData(user?.id ?? null, trackId);
  const readinessResult = await loadReadinessScore(user?.id ?? null, trackId, mastery);
  const readinessInfo = getReadinessBandInfo(readinessResult.score);

  const hasActivity =
    mastery.systems.some((r) => r.total > 0) ||
    mastery.domains.some((r) => r.total > 0) ||
    mastery.skills.some((r) => r.total > 0) ||
    mastery.itemTypes.some((r) => r.total > 0);

  const systemRollups = rollupBySystem(mastery.systems);
  const domainRollups = rollupByDomain(mastery.domains);
  const skillRollups = rollupBySkill(mastery.skills);
  const itemTypeRollups = rollupByItemType(mastery.itemTypes);

  const weakSystems = getWeakRollups(systemRollups);
  const weakDomains = getWeakRollups(domainRollups);
  const weakSkills = getWeakRollups(skillRollups);
  const weakItemTypes = getWeakRollups(itemTypeRollups);

  const weakAreas = [...weakSystems, ...weakDomains, ...weakSkills, ...weakItemTypes].sort(
    (a, b) => a.percent - b.percent
  );

  const getEntityName = (type: string, id: string) => {
    if (type === "system") return mastery.systems.find((s) => s.entityId === id)?.entityName ?? id;
    if (type === "domain") return mastery.domains.find((d) => d.entityId === id)?.entityName ?? id;
    if (type === "skill") return mastery.skills.find((s) => s.entityId === id)?.entityName ?? id;
    if (type === "item_type") return mastery.itemTypes.find((i) => i.entityId === id)?.entityName ?? id;
    return id;
  };

  const remediationPlan = generateRemediationPlan(weakAreas, getEntityName);

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        Weak Areas
      </h1>
      <p className="text-slate-600 dark:text-slate-400">
        Systems, domains, skills, and question types where you need the most improvement.
        {primary && ` — ${track.toUpperCase()} track`}
      </p>

      {!hasActivity ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-slate-500 dark:text-slate-400">
              No activity yet. Answer questions to see your weak areas.
            </p>
            <p className="text-sm text-slate-400 mt-2">
              Practice questions and take exams to build your analytics.
            </p>
            <Link href="/questions" className="text-indigo-600 dark:text-indigo-400 mt-4 inline-block font-medium">
              Start practicing →
            </Link>
          </div>
        </Card>
      ) : weakAreas.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-emerald-600 dark:text-emerald-400 font-medium">
              All areas at or above target!
            </p>
            <p className="text-slate-500 mt-2">Keep up the great work.</p>
          </div>
        </Card>
      ) : user?.id && trackId ? (
        <WeakAreaCenterClient
          weakAreas={weakAreas}
          remediationPlan={remediationPlan}
          mastery={{
            systemSlugMap: mastery.systemSlugMap,
            domainSlugMap: mastery.domainSlugMap,
            itemTypeSlugMap: mastery.itemTypeSlugMap,
          }}
          userId={user.id}
          track={track}
          trackId={trackId}
          readinessBand={readinessInfo.label}
          readinessScore={readinessResult.score}
        />
      ) : (
        <Card>
          <div className="text-center py-12">
            <p className="text-slate-500 dark:text-slate-400">
              Sign in to use Jade Tutor coaching on your weak areas.
            </p>
            <Link href="/login" className="text-indigo-600 dark:text-indigo-400 mt-4 inline-block font-medium">
              Sign in →
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
