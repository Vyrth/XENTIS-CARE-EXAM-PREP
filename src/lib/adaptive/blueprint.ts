/**
 * Blueprint balancing for adaptive exam selection.
 * Prefers questions from underrepresented domains/systems to satisfy content coverage.
 */

export interface BlueprintProgressRow {
  domainId: string | null;
  systemId: string | null;
  topicId: string | null;
  servedCount: number;
  correctCount: number;
  targetMin: number | null;
  targetMax: number | null;
}

export interface BlueprintTarget {
  domainId?: string | null;
  systemId?: string | null;
  topicId?: string | null;
  weightPct: number;
  questionCount: number | null;
}

export interface CandidateTaxonomy {
  questionId: string;
  domainId: string | null;
  systemId: string | null;
  topicId: string | null;
}

/**
 * Compute blueprint boost for a candidate question.
 * Higher boost = more underrepresented. Returns 0-1 multiplier to add to score.
 * Pure function for unit testing.
 */
export function computeBlueprintBoost(
  candidate: CandidateTaxonomy,
  progress: BlueprintProgressRow[],
  targets: BlueprintTarget[],
  totalServed: number
): number {
  if (totalServed === 0) return 0;

  let boost = 0;

  // Domain-level: boost if domain is underrepresented
  if (candidate.domainId) {
    const domainProgress = progress.find(
      (p) => p.domainId === candidate.domainId
    );
    const domainTarget = targets.find(
      (t) => t.domainId === candidate.domainId
    );
    boost += computeLevelBoost(
      domainProgress?.servedCount ?? 0,
      domainTarget?.weightPct ?? 0,
      domainTarget?.questionCount ?? null,
      totalServed
    );
  }

  // System-level: boost if system is underrepresented
  if (candidate.systemId) {
    const systemProgress = progress.find(
      (p) => p.systemId === candidate.systemId
    );
    const systemTarget = targets.find(
      (t) => t.systemId === candidate.systemId
    );
    boost += computeLevelBoost(
      systemProgress?.servedCount ?? 0,
      systemTarget?.weightPct ?? 0,
      systemTarget?.questionCount ?? null,
      totalServed
    );
  }

  // Cap boost at 1.0
  return Math.min(1, boost);
}

/**
 * Compute boost for a single taxonomy level (domain or system).
 * Underrepresented = served < expected proportion.
 */
function computeLevelBoost(
  served: number,
  weightPct: number,
  questionCount: number | null,
  totalServed: number
): number {
  if (weightPct <= 0) return 0;

  const expectedProportion = weightPct / 100;
  const expectedCount = questionCount ?? totalServed * expectedProportion;
  const deficit = Math.max(0, expectedCount - served);

  if (deficit <= 0) return 0;

  // Normalize: deficit of 1+ questions gives meaningful boost
  return Math.min(0.5, deficit * 0.5);
}

/**
 * Check if blueprint is satisfied (all targets met or no targets defined).
 */
export function isBlueprintSatisfied(
  progress: BlueprintProgressRow[],
  targets: BlueprintTarget[],
  questionCount: number
): boolean {
  if (targets.length === 0) return true;

  for (const target of targets) {
    const key = target.domainId ?? target.systemId ?? target.topicId;
    if (!key) continue;

    const row = progress.find(
      (p) =>
        p.domainId === target.domainId ||
        p.systemId === target.systemId ||
        p.topicId === target.topicId
    );
    const served = row?.servedCount ?? 0;
    const minRequired = target.questionCount ?? Math.ceil((target.weightPct / 100) * questionCount * 0.8);

    if (served < minRequired) return false;
  }

  return true;
}
