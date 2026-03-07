/**
 * Adaptive question queue - selects next questions based on weak areas and item types
 */

import type { MasteryRollup } from "@/types/readiness";

export interface QuestionCandidate {
  id: string;
  systemId: string;
  domainId: string;
  topicId?: string;
  skillId?: string;
  itemType: string;
}

export interface QueueConfig {
  count: number;
  preferWeakSystems: boolean;
  preferWeakItemTypes: boolean;
  mixItemTypes: boolean;
}

/** Select question IDs for adaptive practice session */
export function selectAdaptiveQuestions(
  candidates: QuestionCandidate[],
  weakSystems: MasteryRollup[],
  weakItemTypes: MasteryRollup[],
  config: QueueConfig
): string[] {
  const weakSystemIds = new Set(weakSystems.map((s) => s.id.replace("system-", "")));
  const weakItemTypeSet = new Set(
    weakItemTypes.map((it) => it.name.toLowerCase().replace(/\s+/g, "_"))
  );

  const scored = candidates.map((c) => {
    let score = 0;
    if (config.preferWeakSystems && weakSystemIds.has(c.systemId)) score += 10;
    const cNorm = c.itemType.toLowerCase();
    if (config.preferWeakItemTypes && weakItemTypeSet.has(cNorm)) score += 5;
    return { ...c, score };
  });

  // Sort by score desc, then shuffle within same score for variety
  scored.sort((a, b) => b.score - a.score);

  const selected: string[] = [];
  const used = new Set<string>();

  // First pass: fill with high-priority (weak area) questions
  for (const c of scored) {
    if (selected.length >= config.count) break;
    if (used.has(c.id)) continue;
    selected.push(c.id);
    used.add(c.id);
  }

  // If we need more, add from remainder
  for (const c of scored) {
    if (selected.length >= config.count) break;
    if (!used.has(c.id)) {
      selected.push(c.id);
      used.add(c.id);
    }
  }

  return selected;
}
