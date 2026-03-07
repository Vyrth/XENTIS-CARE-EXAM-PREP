/**
 * Recommendation engine - generates adaptive recommendations from mastery and activity
 */

import type { AdaptiveRecommendation } from "@/data/mock/types";
import type { MasteryRollup } from "@/types/readiness";
import { RECOMMENDATION_THRESHOLDS } from "@/config/readiness";

export interface RecommendationContext {
  weakSystems: MasteryRollup[];
  weakDomains: MasteryRollup[];
  weakSkills: MasteryRollup[];
  weakItemTypes: MasteryRollup[];
  studyGuideProgress: number;
  videoProgress: number;
  lastPrePracticeDate?: string;
  lastSystemExamDate?: string;
  overconfidentRanges?: string[];
}

/** Generate recommendations from context */
export function generateRecommendations(
  ctx: RecommendationContext,
  getSystemSlug: (systemId: string) => string,
  getDomainSlug: (domainId: string) => string
): AdaptiveRecommendation[] {
  const recs: AdaptiveRecommendation[] = [];
  let id = 1;

  // Weak systems → practice questions
  for (const s of ctx.weakSystems.slice(0, 3)) {
    if (s.percent < RECOMMENDATION_THRESHOLDS.weakSystemPercent) {
      recs.push({
        id: `rec-${id++}`,
        type: "question",
        title: `Practice ${s.name} Questions`,
        description: `Your accuracy in ${s.name} is ${s.percent}%. Focus on improving before exam.`,
        priority: "high",
        reason: "weak_system",
        href: `/questions/system/${getSystemSlug(s.id.replace("system-", ""))}`,
        entityId: s.id.replace("system-", ""),
      });
    }
  }

  // Weak domains → content + questions
  for (const d of ctx.weakDomains.slice(0, 2)) {
    if (d.percent < RECOMMENDATION_THRESHOLDS.weakDomainPercent) {
      recs.push({
        id: `rec-${id++}`,
        type: "content",
        title: `Review ${d.name} Content`,
        description: `Domain performance at ${d.percent}%. Study guides and practice.`,
        priority: "high",
        reason: "weak_domain",
        href: `/study-guides?domain=${getDomainSlug(d.id.replace("domain-", ""))}`,
        entityId: d.id.replace("domain-", ""),
      });
    }
  }

  // Weak item types → targeted practice
  for (const it of ctx.weakItemTypes.slice(0, 2)) {
    if (it.percent < RECOMMENDATION_THRESHOLDS.weakItemTypePercent) {
      recs.push({
        id: `rec-${id++}`,
        type: "question",
        title: `Practice ${it.name} Questions`,
        description: `Your ${it.name} accuracy is ${it.percent}%.`,
        priority: "medium",
        reason: "weak_item_type",
        href: `/questions?type=${it.name.toLowerCase().replace(/\s+/g, "-")}`,
        entityId: it.id,
      });
    }
  }

  // Pre-practice exam if not taken recently
  if (!ctx.lastPrePracticeDate || daysSince(ctx.lastPrePracticeDate) > 7) {
    recs.push({
      id: `rec-${id++}`,
      type: "exam",
      title: "Pre-Practice Exam",
      description: "Take a full-length exam to gauge readiness.",
      priority: "medium",
      reason: "scheduled",
      href: "/pre-practice/rn",
    });
  }

  // Study guide completion
  if (ctx.studyGuideProgress < 50) {
    recs.push({
      id: `rec-${id++}`,
      type: "content",
      title: "Complete Study Guides",
      description: `${ctx.studyGuideProgress}% complete. Review key systems.`,
      priority: "low",
      reason: "study_progress",
      href: "/study-guides",
    });
  }

  // Confidence calibration
  if (ctx.overconfidentRanges && ctx.overconfidentRanges.length > 0) {
    recs.push({
      id: `rec-${id++}`,
      type: "content",
      title: "Improve Confidence Calibration",
      description: "You're overconfident in some ranges. Review missed questions.",
      priority: "medium",
      reason: "confidence_mismatch",
      href: "/confidence-calibration",
    });
  }

  return recs.sort(priorityOrder);
}

function daysSince(dateStr: string): number {
  const d = new Date(dateStr);
  return Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000));
}

function priorityOrder(a: AdaptiveRecommendation, b: AdaptiveRecommendation): number {
  const order = { high: 0, medium: 1, low: 2 };
  return order[a.priority] - order[b.priority];
}
