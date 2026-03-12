/**
 * Study Workflow Orchestration
 *
 * Recommends what the student should do next based on:
 * - current primary track
 * - weak systems, domains, skills, item types
 * - incomplete guides (when progress data available)
 * - high-yield content
 * - pre-practice exam due
 * - recent activity / empty state
 *
 * Powers: Continue Learning, Recommended for You, Weak area cards,
 * high-yield actions, Jade Tutor next-step suggestions.
 */

import { RECOMMENDATION_THRESHOLDS } from "@/config/readiness";
import type { MasteryRollup } from "@/types/readiness";
import type { TrackSlug } from "@/data/mock/types";
import type { HighYieldTopic } from "@/types/high-yield";
import type { StudyGuideListItem } from "@/lib/content/loaders";

export interface StudyWorkflowInput {
  trackId: string | null;
  trackSlug: TrackSlug;
  userId: string | null;
  /** Weak areas from mastery rollups */
  weakSystems: MasteryRollup[];
  weakDomains: MasteryRollup[];
  weakSkills: MasteryRollup[];
  weakItemTypes: MasteryRollup[];
  /** Slug maps for building hrefs */
  systemSlugMap: Record<string, string>;
  domainSlugMap: Record<string, string>;
  itemTypeSlugMap?: Record<string, string>;
  /** Study guides for track */
  studyGuides: StudyGuideListItem[];
  /** High-yield topics (top N) */
  highYieldTopics: HighYieldTopic[];
  /** Last pre-practice exam completed date (YYYY-MM-DD) or null */
  lastPrePracticeDate?: string | null;
  /** Study guide completion 0-100 (when available) */
  studyGuideCompletion?: number;
  /** Whether user has any activity (questions answered, etc.) */
  hasActivity: boolean;
  /** Recommended content from queue (id, type, title, href, priority) */
  recommendedContent?: { id: string; type: string; title: string; href: string; priority: string }[];
}

export interface StudyWorkflowRecommendation {
  id: string;
  href: string;
  title: string;
  description: string;
  iconKey: string;
  badge?: string;
  trackColor: "lvn" | "rn" | "fnp" | "pmhnp";
  /** Source for analytics / Jade Tutor context */
  source: RecommendationSource;
  priority: "high" | "medium" | "low";
}

export type RecommendationSource =
  | "weak_system"
  | "weak_domain"
  | "weak_skill"
  | "weak_item_type"
  | "high_yield"
  | "pre_practice_due"
  | "study_guides"
  | "recommended_content"
  | "onboarding"
  | "practice_questions"
  | "study_guides_generic";

const TRACK_COLOR = (s: TrackSlug) => s as "lvn" | "rn" | "fnp" | "pmhnp";

function daysSince(dateStr: string): number {
  const d = new Date(dateStr);
  return Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * Generate personalized study workflow recommendations.
 * Returns ContinueLearningCard-compatible items with real hrefs.
 */
export function computeStudyWorkflowRecommendations(
  input: StudyWorkflowInput
): StudyWorkflowRecommendation[] {
  const recs: StudyWorkflowRecommendation[] = [];
  const trackColor = TRACK_COLOR(input.trackSlug);
  let id = 0;

  const push = (
    href: string,
    title: string,
    description: string,
    iconKey: string,
    source: RecommendationSource,
    priority: "high" | "medium" | "low",
    badge?: string
  ) => {
    recs.push({
      id: `wf-${++id}`,
      href,
      title,
      description,
      iconKey,
      badge,
      trackColor,
      source,
      priority,
    });
  };

  // --- Empty state / onboarding ---
  if (!input.trackId) {
    push(
      "/onboarding",
      "Complete onboarding",
      "Set your exam track to get personalized recommendations.",
      "target",
      "onboarding",
      "high"
    );
    return recs;
  }

  // Zero activity = empty recommendations (no synthetic onboarding cards).
  // Dashboard shows "No recommendations yet" when recs is empty.
  if (!input.hasActivity) return recs;

  // --- Weak systems (highest priority) ---
  for (const s of input.weakSystems.slice(0, 2)) {
    if (s.percent < RECOMMENDATION_THRESHOLDS.weakSystemPercent) {
      const entityId = s.id.replace("system-", "");
      const slug = input.systemSlugMap[entityId] ?? entityId;
      push(
        `/questions/system/${slug}`,
        `Practice ${s.name}`,
        `${s.percent}% accuracy — focus here to improve.`,
        "help-circle",
        "weak_system",
        "high",
        "Weak"
      );
    }
  }

  // --- Weak domains ---
  for (const d of input.weakDomains.slice(0, 1)) {
    if (d.percent < RECOMMENDATION_THRESHOLDS.weakDomainPercent) {
      const entityId = d.id.replace("domain-", "");
      const slug = input.domainSlugMap[entityId] ?? entityId;
      push(
        `/questions?domain=${slug}`,
        `Review ${d.name}`,
        `Domain at ${d.percent}%. Study guides + practice.`,
        "book-open",
        "weak_domain",
        "high"
      );
    }
  }

  // --- Weak item types ---
  for (const it of input.weakItemTypes.slice(0, 1)) {
    if (it.percent < RECOMMENDATION_THRESHOLDS.weakItemTypePercent) {
      const slug = input.itemTypeSlugMap?.[it.id.replace("item_type-", "")] ?? it.name.toLowerCase().replace(/\s+/g, "-");
      push(
        `/questions?itemType=${slug}`,
        `Practice ${it.name}`,
        `${it.percent}% on this question type.`,
        "help-circle",
        "weak_item_type",
        "medium"
      );
    }
  }

  // --- Pre-practice exam due ---
  const prePracticeDue =
    !input.lastPrePracticeDate || daysSince(input.lastPrePracticeDate) > 7;
  if (prePracticeDue) {
    push(
      `/pre-practice/${input.trackSlug}`,
      "Pre-Practice Exam",
      "Take a full-length exam to gauge readiness.",
      "file-check",
      "pre_practice_due",
      "medium"
    );
  }

  // --- High-yield (top topic not yet strong) ---
  const topHy = input.highYieldTopics[0];
  if (topHy) {
    const weakInSystem = input.weakSystems.some(
      (s) => s.id === `system-${topHy.systemId}` || s.name === topHy.systemName
    );
    if (weakInSystem || input.weakSystems.length === 0) {
      const practiceHref = topHy.systemSlug
        ? `/questions/system/${topHy.systemSlug}`
        : "/questions";
      push(
        practiceHref,
        `High-yield: ${topHy.topicName}`,
        `Focus on ${topHy.systemName} — high exam weight.`,
        "zap",
        "high_yield",
        input.weakSystems.length > 0 ? "medium" : "high"
      );
    }
  }

  // --- Study guides (incomplete or generic) ---
  if (input.studyGuideCompletion != null && input.studyGuideCompletion < 50) {
    push(
      "/study-guides",
      "Complete study guides",
      `${input.studyGuideCompletion}% complete. Review key systems.`,
      "book-open",
      "study_guides",
      "low"
    );
  } else if (input.studyGuides.length > 0 && recs.length < 4) {
    const first = input.studyGuides[0];
    push(
      first ? `/study-guides/${first.id}` : "/study-guides",
      first ? `Study: ${first.title}` : "Study guides",
      first?.systemName ? `Review ${first.systemName}` : "Review key systems.",
      "book-open",
      "study_guides_generic",
      "low"
    );
  }

  // --- Recommended content from queue ---
  for (const r of input.recommendedContent?.slice(0, 2) ?? []) {
    push(
      r.href,
      r.title,
      "Recommended for you based on your progress.",
      r.type === "video" ? "video" : "book-open",
      "recommended_content",
      r.priority === "high" ? "high" : "medium"
    );
  }

  // No fallback cards—only show recommendations derived from real mastery/activity.
  // Zero activity = empty Continue Learning; dashboard shows "No recommendations yet."

  // Sort by priority
  const order = { high: 0, medium: 1, low: 2 };
  return recs.sort((a, b) => order[a.priority] - order[b.priority]);
}

/** Convert workflow recommendations to ContinueLearningCard format */
export function toContinueLearningCards(
  recs: StudyWorkflowRecommendation[]
): { href: string; title: string; description: string; iconKey: string; badge?: string; trackColor: "lvn" | "rn" | "fnp" | "pmhnp" }[] {
  return recs.map((r) => ({
    href: r.href,
    title: r.title,
    description: r.description,
    iconKey: r.iconKey,
    badge: r.badge,
    trackColor: r.trackColor,
  }));
}
