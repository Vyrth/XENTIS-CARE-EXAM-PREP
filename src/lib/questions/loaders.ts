/**
 * Question bank loaders - real Supabase queries, track-filtered.
 * Only approved/published content is visible to learners.
 */

import { createClient } from "@/lib/supabase/server";
import { LEARNER_VISIBLE_STATUSES } from "@/config/content";
import type { TrackSlug } from "@/data/mock/types";

export interface QuestionBankFilters {
  systemId?: string;
  systemSlug?: string;
  domainId?: string;
  domainSlug?: string;
  topicId?: string;
  topicSlug?: string;
  subtopicId?: string;
  subtopicSlug?: string;
  difficultyTier?: number;
  itemTypeSlug?: string;
  status?: "unseen" | "incorrect" | "flagged" | "mastered";
}

export interface QuestionCounts {
  total: number;
  bySystem: { systemId: string; systemSlug: string; systemName: string; count: number }[];
  byDomain: { domainId: string; domainSlug: string; domainName: string; count: number }[];
  byTopic: { topicId: string; topicSlug: string; topicName: string; systemName: string; count: number }[];
}

export interface QuestionListItem {
  id: string;
  stem: string;
  type: string;
  systemId: string | null;
  systemSlug: string | null;
  domainId: string | null;
  domainSlug: string | null;
  topicId: string | null;
  topicSlug: string | null;
  subtopicId: string | null;
  difficultyTier: number | null;
}

const PAGE_SIZE = 20;

/**
 * Load question counts by system, domain, topic for a track.
 */
export async function loadQuestionCounts(
  trackId: string | null
): Promise<QuestionCounts> {
  if (!trackId) {
    return { total: 0, bySystem: [], byDomain: [], byTopic: [] };
  }

  const supabase = await createClient();

  const { count: totalCount } = await supabase
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("exam_track_id", trackId)
    .in("status", [...LEARNER_VISIBLE_STATUSES]);

  const { data: bySystemRows } = await supabase
    .from("questions")
    .select("system_id, systems(id, slug, name)")
    .eq("exam_track_id", trackId)
    .in("status", [...LEARNER_VISIBLE_STATUSES])
    .not("system_id", "is", null);

  const systemCounts = new Map<string, { slug: string; name: string; count: number }>();
  for (const r of bySystemRows ?? []) {
    const sys = Array.isArray(r.systems) ? r.systems[0] : r.systems;
    if (r.system_id && sys) {
      const key = r.system_id;
      const cur = systemCounts.get(key) ?? { slug: sys.slug, name: sys.name, count: 0 };
      cur.count++;
      systemCounts.set(key, cur);
    }
  }

  const { data: byDomainRows } = await supabase
    .from("questions")
    .select("domain_id, domains(id, slug, name)")
    .eq("exam_track_id", trackId)
    .in("status", [...LEARNER_VISIBLE_STATUSES])
    .not("domain_id", "is", null);

  const domainCounts = new Map<string, { slug: string; name: string; count: number }>();
  for (const r of byDomainRows ?? []) {
    const dom = Array.isArray(r.domains) ? r.domains[0] : r.domains;
    if (r.domain_id && dom) {
      const key = r.domain_id;
      const cur = domainCounts.get(key) ?? { slug: dom.slug, name: dom.name, count: 0 };
      cur.count++;
      domainCounts.set(key, cur);
    }
  }

  const { data: byTopicRows } = await supabase
    .from("questions")
    .select("topic_id, topics(id, slug, name)")
    .eq("exam_track_id", trackId)
    .in("status", [...LEARNER_VISIBLE_STATUSES])
    .not("topic_id", "is", null);

  const topicCounts = new Map<string, { slug: string; name: string; count: number }>();
  for (const r of byTopicRows ?? []) {
    const top = Array.isArray(r.topics) ? r.topics[0] : r.topics;
    if (r.topic_id && top) {
      const key = r.topic_id;
      const cur = topicCounts.get(key) ?? { slug: top.slug, name: top.name, count: 0 };
      cur.count++;
      topicCounts.set(key, cur);
    }
  }

  const bySystem = Array.from(systemCounts.entries()).map(([systemId, v]) => ({
    systemId,
    systemSlug: v.slug,
    systemName: v.name,
    count: v.count,
  }));

  const byDomain = Array.from(domainCounts.entries()).map(([domainId, v]) => ({
    domainId,
    domainSlug: v.slug,
    domainName: v.name,
    count: v.count,
  }));

  const byTopic = Array.from(topicCounts.entries()).map(([topicId, v]) => ({
    topicId,
    topicSlug: v.slug,
    topicName: v.name,
    systemName: "", // Would need join via topic_system_links
    count: v.count,
  }));

  return {
    total: totalCount ?? 0,
    bySystem,
    byDomain,
    byTopic,
  };
}

/**
 * Load question IDs for a Pre-Practice version (I-V) using assembly rules.
 * Uses difficulty tiers from pre_practice_versions.assembly_rules.byDifficulty.
 * Falls back to full track pool if filtered pool has insufficient questions.
 */
export async function loadQuestionIdsForPrePracticeVersion(
  trackId: string | null,
  versionKey: string,
  limit: number,
  seed?: number
): Promise<string[]> {
  if (!trackId) return [];

  const { queryPoolByFilters } = await import("@/lib/admin/exam-assembly-pool");
  const { loadPrePracticeVersionByKey } = await import("@/lib/exam/loaders");

  const version = await loadPrePracticeVersionByKey(trackId, versionKey);
  if (!version?.assemblyRules?.byDifficulty) {
    return loadQuestionIds(trackId, {}, limit, seed);
  }

  const effectiveLimit = Math.min(
    limit,
    (version.assemblyRules.totalCount as number) ?? 85
  );

  const tiers = (version.assemblyRules.byDifficulty as { tier: number }[])
    .map((r) => r.tier)
    .filter((t) => t >= 1 && t <= 5);
  if (tiers.length === 0) {
    return loadQuestionIds(trackId, {}, effectiveLimit, seed);
  }

  const { ids } = await queryPoolByFilters(
    trackId,
    { difficultyTiers: tiers },
    effectiveLimit,
    seed
  );

  if (ids.length >= Math.min(effectiveLimit, 50)) {
    return ids;
  }
  return loadQuestionIds(trackId, {}, effectiveLimit, seed);
}

/**
 * Load question IDs for a track with optional filters.
 * Used for exam session question selection.
 */
export async function loadQuestionIds(
  trackId: string | null,
  filters: QuestionBankFilters,
  limit: number,
  seed?: number
): Promise<string[]> {
  if (!trackId) return [];

  const supabase = await createClient();
  let query = supabase
    .from("questions")
    .select("id")
    .eq("exam_track_id", trackId)
    .in("status", [...LEARNER_VISIBLE_STATUSES]);

  if (filters.systemId) query = query.eq("system_id", filters.systemId);
  if (filters.systemSlug) {
    const { data: sys } = await supabase
      .from("systems")
      .select("id")
      .eq("exam_track_id", trackId)
      .eq("slug", filters.systemSlug)
      .single();
    if (sys) query = query.eq("system_id", sys.id);
  }
  if (filters.domainId) query = query.eq("domain_id", filters.domainId);
  if (filters.domainSlug) {
    const { data: dom } = await supabase.from("domains").select("id").eq("slug", filters.domainSlug).single();
    if (dom) query = query.eq("domain_id", dom.id);
  }
  if (filters.topicId) query = query.eq("topic_id", filters.topicId);
  if (filters.topicSlug) {
    const { data: top } = await supabase.from("topics").select("id").eq("slug", filters.topicSlug).single();
    if (top) query = query.eq("topic_id", top.id);
  }
  if (filters.subtopicId) query = query.eq("subtopic_id", filters.subtopicId);
  if (filters.itemTypeSlug) {
    const { data: qt } = await supabase.from("question_types").select("id").eq("slug", filters.itemTypeSlug).single();
    if (qt) query = query.eq("question_type_id", qt.id);
  }

  const { data } = await query;

  if (!data || data.length === 0) return [];

  let ids = data.map((r) => r.id);
  if (seed !== undefined && seed > 0) {
    ids = seededShuffle(ids, seed);
  }
  return ids.slice(0, limit);
}

/** Stable shuffle using seed */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  let s = seed;
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Load paginated question list for browse/filter view.
 */
export async function loadQuestionsPage(
  trackId: string | null,
  filters: QuestionBankFilters,
  page: number
): Promise<{ questions: QuestionListItem[]; total: number; hasMore: boolean }> {
  if (!trackId) {
    return { questions: [], total: 0, hasMore: false };
  }

  const supabase = await createClient();
  let query = supabase
    .from("questions")
    .select(
      "id, stem, system_id, domain_id, topic_id, subtopic_id, question_type_id, question_types(slug), systems(slug, name), domains(slug, name), topics(slug, name), subtopics(slug, name)",
      { count: "exact" }
    )
    .eq("exam_track_id", trackId)
    .in("status", [...LEARNER_VISIBLE_STATUSES])
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (filters.systemId) query = query.eq("system_id", filters.systemId);
  if (filters.systemSlug) {
    const { data: sys } = await supabase
      .from("systems")
      .select("id")
      .eq("exam_track_id", trackId)
      .eq("slug", filters.systemSlug)
      .single();
    if (sys) query = query.eq("system_id", sys.id);
  }
  if (filters.domainId) query = query.eq("domain_id", filters.domainId);
  if (filters.domainSlug) {
    const { data: dom } = await supabase.from("domains").select("id").eq("slug", filters.domainSlug).single();
    if (dom) query = query.eq("domain_id", dom.id);
  }
  if (filters.topicId) query = query.eq("topic_id", filters.topicId);
  if (filters.topicSlug) {
    const { data: top } = await supabase.from("topics").select("id").eq("slug", filters.topicSlug).single();
    if (top) query = query.eq("topic_id", top.id);
  }
  if (filters.subtopicId) query = query.eq("subtopic_id", filters.subtopicId);
  if (filters.subtopicSlug) {
    const { data: sub } = await supabase.from("subtopics").select("id").eq("slug", filters.subtopicSlug).single();
    if (sub) query = query.eq("subtopic_id", sub.id);
  }
  if (filters.itemTypeSlug) {
    const { data: qt } = await supabase.from("question_types").select("id").eq("slug", filters.itemTypeSlug).single();
    if (qt) query = query.eq("question_type_id", qt.id);
  }
  if (filters.difficultyTier != null && filters.difficultyTier >= 1 && filters.difficultyTier <= 5) {
    const { data: profileIds } = await supabase
      .from("question_adaptive_profiles")
      .select("question_id")
      .eq("difficulty_tier", filters.difficultyTier);
    const qIds = (profileIds ?? []).map((p) => p.question_id);
    if (qIds.length > 0) query = query.in("id", qIds);
    else return { questions: [], total: 0, hasMore: false };
  }

  const { data, count } = await query;

  const questions: QuestionListItem[] = (data ?? []).map((r: Record<string, unknown>) => {
    const qt = Array.isArray(r.question_types) ? r.question_types[0] : r.question_types;
    const sys = Array.isArray(r.systems) ? r.systems[0] : r.systems;
    const dom = Array.isArray(r.domains) ? r.domains[0] : r.domains;
    const top = Array.isArray(r.topics) ? r.topics[0] : r.topics;
    const sub = Array.isArray(r.subtopics) ? r.subtopics[0] : r.subtopics;
    return {
      id: r.id as string,
      stem: (r.stem as string)?.slice(0, 120) + ((r.stem as string)?.length > 120 ? "…" : ""),
      type: (qt as { slug?: string })?.slug ?? "single_best_answer",
      systemId: r.system_id as string | null,
      systemSlug: (sys as { slug?: string })?.slug ?? null,
      domainId: r.domain_id as string | null,
      domainSlug: (dom as { slug?: string })?.slug ?? null,
      topicId: r.topic_id as string | null,
      topicSlug: (top as { slug?: string })?.slug ?? null,
      subtopicId: r.subtopic_id as string | null,
      difficultyTier: null,
    };
  });

  const total = count ?? 0;
  const hasMore = page * PAGE_SIZE < total;

  return { questions, total, hasMore };
}

/**
 * Load systems for a track from DB.
 */
export async function loadSystemsForTrack(trackId: string | null) {
  if (!trackId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("systems")
    .select("id, slug, name")
    .eq("exam_track_id", trackId)
    .order("display_order", { ascending: true });
  return data ?? [];
}

/**
 * Load system names by IDs for a track (for result display).
 */
export async function loadSystemNamesByIds(
  trackId: string | null,
  systemIds: string[]
): Promise<Record<string, string>> {
  if (!trackId || systemIds.length === 0) return {};
  const supabase = await createClient();
  const { data } = await supabase
    .from("systems")
    .select("id, name")
    .eq("exam_track_id", trackId)
    .in("id", systemIds);
  const map: Record<string, string> = {};
  for (const s of data ?? []) {
    map[s.id] = s.name ?? s.id;
  }
  return map;
}

/**
 * Load domain names by IDs (for result display).
 */
export async function loadDomainNamesByIds(domainIds: string[]): Promise<Record<string, string>> {
  if (domainIds.length === 0) return {};
  const supabase = await createClient();
  const { data } = await supabase
    .from("domains")
    .select("id, name")
    .in("id", domainIds);
  const map: Record<string, string> = {};
  for (const d of data ?? []) {
    map[d.id] = d.name ?? d.id;
  }
  return map;
}

/**
 * Load domains (shared across tracks).
 */
export async function loadDomains() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("domains")
    .select("id, slug, name")
    .order("display_order", { ascending: true });
  return data ?? [];
}

/**
 * Load question metadata for scoring (correct answer, system, domain, type).
 * Used by submitExamAndScore. Track-scoped for security.
 */
export async function loadQuestionMetadataForScoring(
  trackId: string | null,
  questionIds: string[]
): Promise<
  Record<
    string,
    { correctAnswer: string | string[] | number | Record<string, string> | undefined; systemId: string | undefined; domainId: string | undefined; type: string }
  >
> {
  if (!trackId || questionIds.length === 0) return {};

  const supabase = await createClient();
  const { data: questions } = await supabase
    .from("questions")
    .select("id, system_id, domain_id, question_type_id, question_types(slug)")
    .eq("exam_track_id", trackId)
    .in("id", questionIds)
    .in("status", [...LEARNER_VISIBLE_STATUSES]);

  const { data: options } = await supabase
    .from("question_options")
    .select("question_id, option_key, is_correct")
    .in("question_id", questionIds);

  const correctByQuestion = new Map<string, string[]>();
  for (const o of options ?? []) {
    if (o.is_correct) {
      const cur = correctByQuestion.get(o.question_id) ?? [];
      cur.push(o.option_key);
      correctByQuestion.set(o.question_id, cur);
    }
  }

  const result: Record<
    string,
    { correctAnswer: string | string[] | number | Record<string, string> | undefined; systemId: string | undefined; domainId: string | undefined; type: string }
  > = {};
  for (const q of questions ?? []) {
    const keys = correctByQuestion.get(q.id) ?? [];
    const qt = Array.isArray(q.question_types) ? q.question_types[0] : q.question_types;
    const type = (qt as { slug?: string })?.slug ?? "single_best_answer";
    let correctAnswer: string | string[] | number | Record<string, string> | undefined;
    if (type === "dosage_calc" && keys.length === 1) {
      const num = parseFloat(keys[0]);
      correctAnswer = !Number.isNaN(num) ? num : keys[0];
    } else {
      correctAnswer = keys.length === 1 ? keys[0] : keys.length > 1 ? keys : undefined;
    }
    result[q.id] = {
      correctAnswer,
      systemId: q.system_id ?? undefined,
      domainId: q.domain_id ?? undefined,
      type,
    };
  }
  return result;
}

/**
 * Load topics for a track (via topic_system_links) with system info.
 */
export async function loadTopicsForTrack(trackId: string | null): Promise<
  { id: string; slug: string; name: string; domainId: string; systemId?: string; systemName?: string }[]
> {
  if (!trackId) return [];
  const supabase = await createClient();
  const { data: systems } = await supabase
    .from("systems")
    .select("id, name")
    .eq("exam_track_id", trackId);
  const systemIds = (systems ?? []).map((s) => s.id);
  if (systemIds.length === 0) return [];

  const { data: links } = await supabase
    .from("topic_system_links")
    .select("topic_id, system_id")
    .in("system_id", systemIds);
  const topicIds = [...new Set((links ?? []).map((l) => l.topic_id))];
  if (topicIds.length === 0) return [];

  const { data: topics } = await supabase
    .from("topics")
    .select("id, slug, name, domain_id")
    .in("id", topicIds)
    .order("display_order", { ascending: true });

  return (topics ?? []).map((t) => {
    const link = (links ?? []).find((l) => l.topic_id === t.id);
    const sys = link ? systems?.find((s) => s.id === link.system_id) : null;
    return {
      id: t.id,
      slug: t.slug,
      name: t.name,
      domainId: t.domain_id,
      systemId: sys?.id,
      systemName: sys?.name,
    };
  });
}

/**
 * Load question types for filter dropdown.
 */
export async function loadQuestionTypes() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("question_types")
    .select("id, slug, name")
    .order("display_order", { ascending: true });
  return data ?? [];
}

/**
 * Load subtopics that have questions in the track (for filter dropdown).
 */
export async function loadSubtopicsForTrack(trackId: string | null) {
  if (!trackId) return [];
  const supabase = await createClient();
  const { data: qWithSub } = await supabase
    .from("questions")
    .select("subtopic_id")
    .eq("exam_track_id", trackId)
    .in("status", [...LEARNER_VISIBLE_STATUSES])
    .not("subtopic_id", "is", null);
  const subIds = [...new Set((qWithSub ?? []).map((q) => q.subtopic_id).filter(Boolean))];
  if (subIds.length === 0) return [];
  const { data: subs } = await supabase
    .from("subtopics")
    .select("id, slug, name, topic_id")
    .in("id", subIds)
    .order("display_order", { ascending: true });
  return subs ?? [];
}
