/**
 * Exam Assembly Pool - query and validate question pools for exam composition.
 * Supports rule-based assembly by blueprint/domain/system/topic/item_type/difficulty.
 * Only learner-visible (approved/published) questions are included.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";
import { LEARNER_VISIBLE_STATUSES } from "@/config/content";
import { seededShuffle } from "@/lib/exam/question-bank";

export interface AssemblyRuleBySystem {
  systemId: string;
  min?: number;
  max?: number;
  target?: number;
}

export interface AssemblyRuleByDomain {
  domainId: string;
  min?: number;
  max?: number;
  target?: number;
}

export interface AssemblyRuleByTopic {
  topicId: string;
  min?: number;
  max?: number;
  target?: number;
}

export interface AssemblyRuleByItemType {
  itemTypeSlug: string;
  min?: number;
  max?: number;
  target?: number;
}

export interface AssemblyRuleByDifficulty {
  tier: number;
  min?: number;
  max?: number;
  target?: number;
}

export interface AssemblyRules {
  totalCount?: number;
  bySystem?: AssemblyRuleBySystem[];
  byDomain?: AssemblyRuleByDomain[];
  byTopic?: AssemblyRuleByTopic[];
  byItemType?: AssemblyRuleByItemType[];
  byDifficulty?: AssemblyRuleByDifficulty[];
}

export interface AssemblyFilters {
  systemIds?: string[];
  domainIds?: string[];
  topicIds?: string[];
  itemTypeSlugs?: string[];
  difficultyTiers?: number[];
}

export interface CompositionStats {
  total: number;
  bySystem: { systemId: string; systemName: string; systemSlug: string; count: number }[];
  byDomain: { domainId: string; domainName: string; domainSlug: string; count: number }[];
  byItemType: { slug: string; name: string; count: number }[];
  byDifficulty: { tier: number; count: number }[];
}

export interface BlueprintWarning {
  type: "missing_coverage" | "unbalanced" | "over_allocated" | "under_allocated";
  message: string;
  systemId?: string;
  domainId?: string;
  expectedPercent?: number;
  actualPercent?: number;
}

export interface PoolValidationResult {
  valid: boolean;
  errors: string[];
  warnings: BlueprintWarning[];
  composition: CompositionStats;
  questionIds: string[];
}

async function safeQuery<T>(fn: () => Promise<T>): Promise<T> {
  try {
    if (!isSupabaseServiceRoleConfigured()) return [] as unknown as T;
    return await fn();
  } catch {
    return [] as unknown as T;
  }
}

/** Load blueprint weights for a track (system-level) */
export async function loadBlueprintWeights(trackId: string): Promise<
  { systemId: string; systemName: string; weightPct: number }[]
> {
  return safeQuery(async () => {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("exam_blueprints")
      .select("system_id, weight_pct, systems(id, name)")
      .eq("exam_track_id", trackId)
      .not("system_id", "is", null);

    return (data ?? []).map((r) => {
      const sys = Array.isArray(r.systems) ? r.systems[0] : r.systems;
      return {
        systemId: r.system_id,
        systemName: (sys as { name?: string })?.name ?? "",
        weightPct: Number(r.weight_pct ?? 0),
      };
    });
  });
}

/** Query questions by track and filters. Returns IDs with metadata for composition. */
export async function queryPoolByFilters(
  trackId: string,
  filters: AssemblyFilters,
  limit: number,
  seed?: number
): Promise<{ ids: string[]; composition: CompositionStats }> {
  const supabase = createServiceClient();
  let query = supabase
    .from("questions")
    .select(
      "id, system_id, domain_id, topic_id, question_type_id, question_types(slug, name), systems(id, name, slug), domains(id, name, slug)"
    )
    .eq("exam_track_id", trackId)
    .in("status", [...LEARNER_VISIBLE_STATUSES]);

  if (filters.systemIds?.length) query = query.in("system_id", filters.systemIds);
  if (filters.domainIds?.length) query = query.in("domain_id", filters.domainIds);
  if (filters.topicIds?.length) query = query.in("topic_id", filters.topicIds);
  if (filters.itemTypeSlugs?.length) {
    const { data: qTypes } = await supabase
      .from("question_types")
      .select("id")
      .in("slug", filters.itemTypeSlugs);
    const ids = (qTypes ?? []).map((p) => p.id);
    if (ids.length) query = query.in("question_type_id", ids);
  }
  if (filters.difficultyTiers?.length) {
    const { data: profiles } = await supabase
      .from("question_adaptive_profiles")
      .select("question_id")
      .in("difficulty_tier", filters.difficultyTiers);
    const qIds = (profiles ?? []).map((p) => p.question_id);
    if (qIds.length) query = query.in("id", qIds);
    else return { ids: [], composition: buildEmptyComposition() };
  }

  const { data } = await query;

  if (!data || data.length === 0) {
    return { ids: [], composition: buildEmptyComposition() };
  }

  const composition = buildCompositionFromRows(data);
  let ids = data.map((r) => r.id);
  if (seed !== undefined && seed > 0) {
    ids = seededShuffle(ids, seed);
  }
  return { ids: ids.slice(0, limit), composition };
}

/** Load questions from exam_template_question_pool and compute composition stats. */
export async function loadTemplatePoolComposition(
  templateId: string,
  trackId: string
): Promise<{ questionIds: string[]; composition: CompositionStats; invalidTrackIds: string[] }> {
  const supabase = createServiceClient();
  const { data: poolRows } = await supabase
    .from("exam_template_question_pool")
    .select("question_id")
    .eq("exam_template_id", templateId);

  if (!poolRows?.length) {
    return {
      questionIds: [],
      composition: buildEmptyComposition(),
      invalidTrackIds: [],
    };
  }

  const questionIds = poolRows.map((r) => r.question_id).filter(Boolean);
  const { data: questions } = await supabase
    .from("questions")
    .select("id, exam_track_id, system_id, domain_id, topic_id, question_type_id, question_types(slug, name), systems(id, name, slug), domains(id, name, slug)")
    .in("id", questionIds)
    .in("status", [...LEARNER_VISIBLE_STATUSES]);

  const invalidTrackIds = (questions ?? [])
    .filter((q) => q.exam_track_id !== trackId)
    .map((q) => q.id);
  const validQuestions = (questions ?? []).filter((q) => q.exam_track_id === trackId);
  const composition = buildCompositionFromRows(validQuestions as unknown as Record<string, unknown>[]);

  return {
    questionIds: validQuestions.map((q) => q.id),
    composition,
    invalidTrackIds,
  };
}

/** Load system_exam question pool composition. */
export async function loadSystemExamPoolComposition(
  systemExamId: string,
  trackId: string
): Promise<{ questionIds: string[]; composition: CompositionStats; invalidTrackIds: string[] }> {
  const supabase = createServiceClient();
  const { data: poolRows } = await supabase
    .from("system_exam_question_pool")
    .select("question_id")
    .eq("system_exam_id", systemExamId);

  if (!poolRows?.length) {
    return {
      questionIds: [],
      composition: buildEmptyComposition(),
      invalidTrackIds: [],
    };
  }

  const questionIds = poolRows.map((r) => r.question_id).filter(Boolean);
  const { data: questions } = await supabase
    .from("questions")
    .select("id, exam_track_id, system_id, domain_id, topic_id, question_type_id, question_types(slug, name), systems(id, name, slug), domains(id, name, slug)")
    .in("id", questionIds)
    .in("status", [...LEARNER_VISIBLE_STATUSES]);

  const invalidTrackIds = (questions ?? [])
    .filter((q) => q.exam_track_id !== trackId)
    .map((q) => q.id);
  const validQuestions = (questions ?? []).filter((q) => q.exam_track_id === trackId);
  const composition = buildCompositionFromRows(validQuestions as unknown as Record<string, unknown>[]);

  return {
    questionIds: validQuestions.map((q) => q.id),
    composition,
    invalidTrackIds,
  };
}

/** Validate pool composition against blueprint and rules. */
export async function validatePool(
  trackId: string,
  questionIds: string[],
  rules?: AssemblyRules,
  expectedTotal?: number
): Promise<PoolValidationResult> {
  const errors: string[] = [];
  const warnings: BlueprintWarning[] = [];

  if (questionIds.length === 0) {
    return {
      valid: false,
      errors: ["No questions in pool"],
      warnings: [],
      composition: buildEmptyComposition(),
      questionIds: [],
    };
  }

  const supabase = createServiceClient();
  const { data: questions } = await supabase
    .from("questions")
    .select("id, system_id, domain_id, topic_id, question_type_id, question_types(slug, name), systems(id, name, slug), domains(id, name, slug)")
    .eq("exam_track_id", trackId)
    .in("id", questionIds)
    .in("status", [...LEARNER_VISIBLE_STATUSES]);

  const validIds = (questions ?? []).map((q) => q.id);
  const invalidCount = questionIds.length - validIds.length;
  if (invalidCount > 0) {
    errors.push(`${invalidCount} question(s) not found or not approved for this track`);
  }

  const composition = buildCompositionFromRows(questions ?? []);

  if (expectedTotal && composition.total < expectedTotal) {
    warnings.push({
      type: "under_allocated",
      message: `Pool has ${composition.total} questions but exam expects ${expectedTotal}`,
    });
  }

  if (rules?.totalCount && composition.total > rules.totalCount) {
    warnings.push({
      type: "over_allocated",
      message: `Pool has ${composition.total} questions but exam expects ${rules.totalCount}`,
    });
  }

  const blueprintWeights = await loadBlueprintWeights(trackId);
  if (blueprintWeights.length > 0 && composition.total > 0) {
    const totalWeight = blueprintWeights.reduce((s, t) => s + t.weightPct, 0);
    for (const { systemId, systemName, weightPct } of blueprintWeights) {
      const sysCount = composition.bySystem.find((s) => s.systemId === systemId)?.count ?? 0;
      const actualPercent = totalWeight > 0 ? (sysCount / composition.total) * 100 : 0;
      const expectedPercent = totalWeight > 0 ? (weightPct / totalWeight) * 100 : 0;
      const diff = Math.abs(actualPercent - expectedPercent);
      if (diff > 15) {
        warnings.push({
          type: "unbalanced",
          message: `${systemName}: ${actualPercent.toFixed(1)}% vs blueprint ${expectedPercent.toFixed(1)}%`,
          systemId,
          expectedPercent,
          actualPercent,
        });
      }
      if (expectedPercent > 5 && sysCount === 0) {
        warnings.push({
          type: "missing_coverage",
          message: `${systemName} has no questions (blueprint ${expectedPercent.toFixed(1)}%)`,
          systemId,
          expectedPercent,
          actualPercent: 0,
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    composition,
    questionIds: validIds,
  };
}

function buildEmptyComposition(): CompositionStats {
  return {
    total: 0,
    bySystem: [],
    byDomain: [],
    byItemType: [],
    byDifficulty: [],
  };
}

function buildCompositionFromRows(rows: Record<string, unknown>[]): CompositionStats {
  const bySystem = new Map<string, { name: string; slug: string; count: number }>();
  const byDomain = new Map<string, { name: string; slug: string; count: number }>();
  const byItemType = new Map<string, { name: string; count: number }>();
  const byDifficulty = new Map<number, number>();

  for (const r of rows) {
    const sys = Array.isArray(r.systems) ? r.systems[0] : r.systems;
    const dom = Array.isArray(r.domains) ? r.domains[0] : r.domains;
    const qt = Array.isArray(r.question_types) ? r.question_types[0] : r.question_types;

    if (r.system_id && sys) {
      const key = r.system_id as string;
      const cur = bySystem.get(key) ?? {
        name: (sys as { name?: string })?.name ?? "",
        slug: (sys as { slug?: string })?.slug ?? "",
        count: 0,
      };
      cur.count++;
      bySystem.set(key, cur);
    }
    if (r.domain_id && dom) {
      const key = r.domain_id as string;
      const cur = byDomain.get(key) ?? {
        name: (dom as { name?: string })?.name ?? "",
        slug: (dom as { slug?: string })?.slug ?? "",
        count: 0,
      };
      cur.count++;
      byDomain.set(key, cur);
    }
    if (qt) {
      const slug = (qt as { slug?: string })?.slug ?? "unknown";
      const cur = byItemType.get(slug) ?? { name: (qt as { name?: string })?.name ?? slug, count: 0 };
      cur.count++;
      byItemType.set(slug, cur);
    }
  }

  return {
    total: rows.length,
    bySystem: Array.from(bySystem.entries()).map(([systemId, v]) => ({
      systemId,
      systemName: v.name,
      systemSlug: v.slug,
      count: v.count,
    })),
    byDomain: Array.from(byDomain.entries()).map(([domainId, v]) => ({
      domainId,
      domainName: v.name,
      domainSlug: v.slug,
      count: v.count,
    })),
    byItemType: Array.from(byItemType.entries()).map(([slug, v]) => ({
      slug,
      name: v.name,
      count: v.count,
    })),
    byDifficulty: Array.from(byDifficulty.entries()).map(([tier, count]) => ({ tier, count })),
  };
}
