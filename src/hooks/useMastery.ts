"use client";

import { useMemo } from "react";
import {
  rollupBySystem,
  rollupByDomain,
  rollupBySkill,
  rollupByItemType,
  getWeakRollups,
  getStrongRollups,
} from "@/lib/readiness/mastery-rollups";
import type { MasteryRollup } from "@/types/readiness";
import type { RawPerformanceRecord } from "@/lib/readiness/mastery-rollups";

export interface MasteryData {
  systems: RawPerformanceRecord[];
  domains: RawPerformanceRecord[];
  skills: RawPerformanceRecord[];
  itemTypes: RawPerformanceRecord[];
  systemSlugMap?: Record<string, string>;
  domainSlugMap?: Record<string, string>;
}

/** Hook to compute mastery rollups and weak/strong areas. Uses data reference for stability. */
export function useMastery(data: MasteryData | null) {
  return useMemo(() => {
    if (!data) return null;

    const systemRollups = rollupBySystem(data.systems);
    const domainRollups = rollupByDomain(data.domains);
    const skillRollups = rollupBySkill(data.skills);
    const itemTypeRollups = rollupByItemType(data.itemTypes);

    const allRollups: MasteryRollup[] = [
      ...systemRollups,
      ...domainRollups,
      ...skillRollups,
      ...itemTypeRollups,
    ];

    return {
      systems: systemRollups,
      domains: domainRollups,
      skills: skillRollups,
      itemTypes: itemTypeRollups,
      weakSystems: getWeakRollups(systemRollups),
      weakDomains: getWeakRollups(domainRollups),
      weakSkills: getWeakRollups(skillRollups),
      weakItemTypes: getWeakRollups(itemTypeRollups),
      strongSystems: getStrongRollups(systemRollups),
      strongDomains: getStrongRollups(domainRollups),
    };
  }, [data]);
}
