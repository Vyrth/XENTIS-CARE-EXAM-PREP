/**
 * Converts mastery analytics into concise AI-ready context for weak-area coaching.
 * Handles sparse analytics gracefully.
 */

import type { MasteryRollup } from "@/types/readiness";
import type { ReadinessBand } from "@/types/readiness";

export interface WeakAreaSummary {
  name: string;
  percent: number;
  targetPercent?: number;
  correct?: number;
  total?: number;
  type?: string;
}

export interface CoachContextInput {
  weakSystems?: WeakAreaSummary[] | MasteryRollup[];
  weakDomains?: WeakAreaSummary[] | MasteryRollup[];
  weakSkills?: WeakAreaSummary[] | MasteryRollup[];
  weakItemTypes?: WeakAreaSummary[] | MasteryRollup[];
  readinessBand?: ReadinessBand | string;
  readinessScore?: number;
  recentMistakes?: string[];
  currentStudyPlan?: string;
}

function formatWeakArea(a: WeakAreaSummary | MasteryRollup): string {
  const target = "targetPercent" in a ? a.targetPercent : (a as WeakAreaSummary).targetPercent ?? 80;
  const correct = "correct" in a ? a.correct : (a as WeakAreaSummary).correct;
  const total = "total" in a ? a.total : (a as WeakAreaSummary).total;
  const suffix = correct != null && total != null ? `, ${correct}/${total}` : "";
  return `${a.name} (${a.percent}%, target ${target}%${suffix})`;
}

/** Build concise AI-ready context from analytics. Handles sparse data. */
export function buildCoachContext(input: CoachContextInput): string {
  const parts: string[] = [];

  if (input.weakSystems && input.weakSystems.length > 0) {
    parts.push("Weak systems: " + input.weakSystems.map(formatWeakArea).join("; "));
  }

  if (input.weakDomains && input.weakDomains.length > 0) {
    parts.push("Weak domains: " + input.weakDomains.map(formatWeakArea).join("; "));
  }

  if (input.weakSkills && input.weakSkills.length > 0) {
    parts.push("Weak skills: " + input.weakSkills.map(formatWeakArea).join("; "));
  }

  if (input.weakItemTypes && input.weakItemTypes.length > 0) {
    parts.push("Weak item types: " + input.weakItemTypes.map(formatWeakArea).join("; "));
  }

  if (input.readinessBand || input.readinessScore != null) {
    const band = input.readinessBand ?? "unknown";
    const score = input.readinessScore != null ? `${input.readinessScore}%` : "";
    parts.push(`Readiness: ${band}${score ? ` (${score})` : ""}`);
  }

  if (input.recentMistakes && input.recentMistakes.length > 0) {
    const sample = input.recentMistakes.slice(0, 5).join("; ");
    parts.push(`Recent mistake topics: ${sample}`);
  }

  if (input.currentStudyPlan?.trim()) {
    parts.push(`Current study plan: ${input.currentStudyPlan.trim().slice(0, 300)}`);
  }

  if (parts.length === 0) {
    return "Limited analytics available. Learner may be new or have sparse practice data. Provide general board-prep guidance and encourage more practice to build a clearer picture.";
  }

  return parts.join("\n\n");
}
