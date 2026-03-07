/**
 * Remediation plan generator - creates actionable plans from weak areas
 */

import { MASTERY_TARGET_PERCENT } from "@/config/readiness";
import type { MasteryRollup } from "@/types/readiness";
import type { RemediationItem } from "@/types/readiness";

/** Estimate questions needed to close gap (rough: ~2% per 5 questions at 80% accuracy) */
function estimateQuestionsToCloseGap(gap: number, currentAccuracy: number): number {
  if (gap <= 0) return 0;
  const effectivePerQuestion = 0.4; // rough
  return Math.ceil(gap / effectivePerQuestion);
}

/** Generate remediation plan from weak rollups */
export function generateRemediationPlan(
  weakRollups: MasteryRollup[],
  getEntityName: (type: string, id: string) => string
): RemediationItem[] {
  const plans: RemediationItem[] = [];

  for (const r of weakRollups) {
    const gap = r.targetPercent - r.percent;
    const entityId = r.id.replace(`${r.type}-`, "");

    const suggestedActions: string[] = [];
    if (r.type === "system" || r.type === "topic") {
      suggestedActions.push("Practice 10-15 questions daily");
      suggestedActions.push("Review study guide sections");
    }
    if (r.type === "domain") {
      suggestedActions.push("Review domain-specific content");
      suggestedActions.push("Practice mixed domain questions");
    }
    if (r.type === "item_type") {
      suggestedActions.push("Practice this question type specifically");
    }
    suggestedActions.push("Reassess after 20+ questions");

    plans.push({
      id: `rem-${r.id}`,
      type: r.type,
      entityId,
      name: r.name,
      currentPercent: r.percent,
      targetPercent: r.targetPercent,
      gap,
      suggestedActions,
      estimatedQuestions: estimateQuestionsToCloseGap(gap, r.percent),
    });
  }

  return plans.sort((a, b) => b.gap - a.gap);
}
