/**
 * Recommended content queue - study guides, videos, etc. based on weak areas
 */

import type { MasteryRollup } from "@/types/readiness";

export interface ContentItem {
  id: string;
  type: "study_guide" | "video";
  title: string;
  systemId?: string;
  domainId?: string;
  progress?: number;
}

/** Select content to recommend based on weak areas */
export function selectRecommendedContent(
  content: ContentItem[],
  weakSystems: MasteryRollup[],
  weakDomains: MasteryRollup[]
): ContentItem[] {
  const weakSystemIds = new Set(weakSystems.map((s) => s.id.replace("system-", "")));
  const weakDomainIds = new Set(weakDomains.map((d) => d.id.replace("domain-", "")));

  const scored = content.map((c) => {
    let score = 0;
    if (c.systemId && weakSystemIds.has(c.systemId)) score += 10;
    if (c.domainId && weakDomainIds.has(c.domainId)) score += 8;
    if ((c.progress ?? 0) < 100) score += 5;
    return { ...c, score };
  });

  return scored
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}
