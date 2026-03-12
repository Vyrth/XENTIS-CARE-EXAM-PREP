/**
 * Recommendation engine - generates adaptive recommendations from mastery and activity.
 * Can be augmented with remediation suggestions from adaptive context.
 */

import type { AdaptiveRecommendation } from "@/data/mock/types";
import type { MasteryRollup } from "@/types/readiness";
import { RECOMMENDATION_THRESHOLDS } from "@/config/readiness";
import type { AdaptiveContextOutput } from "./adaptive-context";

export interface RecommendationContext {
  weakSystems: MasteryRollup[];
  weakDomains: MasteryRollup[];
  weakSkills: MasteryRollup[];
  weakItemTypes: MasteryRollup[];
  studyGuideProgress?: number;
  videoProgress?: number;
  lastPrePracticeDate?: string;
  lastSystemExamDate?: string;
  overconfidentRanges?: string[];
  /** Track slug for track-specific pre-practice href */
  trackSlug?: string;
}

export interface RecommendationEngineOptions {
  adaptiveContext?: AdaptiveContextOutput | null;
  getItemTypeSlug?: (questionTypeId: string) => string;
}

/** Generate recommendations from context, optionally augmented with adaptive remediation suggestions */
export function generateRecommendations(
  ctx: RecommendationContext,
  getSystemSlug: (systemId: string) => string,
  getDomainSlug: (domainId: string) => string,
  options?: RecommendationEngineOptions
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

  // Weak domains → practice + study guides
  for (const d of ctx.weakDomains.slice(0, 2)) {
    if (d.percent < RECOMMENDATION_THRESHOLDS.weakDomainPercent) {
      const slug = getDomainSlug(d.id.replace("domain-", ""));
      recs.push({
        id: `rec-${id++}`,
        type: "content",
        title: `Review ${d.name}`,
        description: `Domain at ${d.percent}%. Study guides + practice.`,
        priority: "high",
        reason: "weak_domain",
        href: `/questions?domain=${slug}`,
        entityId: d.id.replace("domain-", ""),
      });
    }
  }

  // Weak item types → targeted practice
  const getItemTypeSlug = options?.getItemTypeSlug;
  for (const it of ctx.weakItemTypes.slice(0, 2)) {
    if (it.percent < RECOMMENDATION_THRESHOLDS.weakItemTypePercent) {
      const questionTypeId = it.id.replace("item_type-", "");
      const slug = getItemTypeSlug?.(questionTypeId) ?? it.name.toLowerCase().replace(/\s+/g, "-");
      recs.push({
        id: `rec-${id++}`,
        type: "question",
        title: `Practice ${it.name} Questions`,
        description: `Your ${it.name} accuracy is ${it.percent}%.`,
        priority: "medium",
        reason: "weak_item_type",
        href: `/questions?itemType=${slug}`,
        entityId: it.id,
      });
    }
  }

  // Pre-practice exam if not taken recently
  if (!ctx.lastPrePracticeDate || daysSince(ctx.lastPrePracticeDate) > 7) {
    const track = ctx.trackSlug ?? "rn";
    recs.push({
      id: `rec-${id++}`,
      type: "exam",
      title: "Pre-Practice Exam",
      description: "Take a full-length exam to gauge readiness.",
      priority: "medium",
      reason: "scheduled",
      href: `/pre-practice/${track}`,
    });
  }

  // Study guide completion (only when we have real progress data)
  if (ctx.studyGuideProgress != null && ctx.studyGuideProgress < 50) {
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

  // Remediate with Jade Tutor when user has weak areas
  const hasWeakAreas =
    ctx.weakSystems.some((s) => s.percent < RECOMMENDATION_THRESHOLDS.weakSystemPercent) ||
    ctx.weakDomains.some((d) => d.percent < RECOMMENDATION_THRESHOLDS.weakDomainPercent);
  if (hasWeakAreas) {
    recs.push({
      id: `rec-${id++}`,
      type: "content",
      title: "Remediate with Jade Tutor",
      description: "Track-scoped remediation brain. Get explanations, mnemonics, and study plans.",
      priority: "high",
      reason: "jade_remediation",
      href: "/weak-areas",
    });
  }

  // Augment with saveable remediation suggestions from adaptive context
  if (options?.adaptiveContext?.remediationSuggestions?.length) {
    for (const suggestion of options.adaptiveContext.remediationSuggestions.slice(0, 2)) {
      recs.push({
        id: `rec-${id++}`,
        type: "content",
        title: "Remediate with Jade Tutor",
        description: suggestion,
        priority: "medium",
        reason: "adaptive_remediation",
        href: "/weak-areas",
      });
    }
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
