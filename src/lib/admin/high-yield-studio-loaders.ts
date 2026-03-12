/**
 * High-Yield Content Production loaders
 */

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";

export type HighYieldContentType =
  | "high_yield_summary"
  | "common_confusion"
  | "board_trap"
  | "compare_contrast_summary";

export type ConfusionFrequency = "common" | "very_common" | "extremely_common";

export interface AdminHighYieldItem {
  id: string;
  contentType: HighYieldContentType;
  examTrackId: string;
  systemId: string | null;
  topicId: string | null;
  title: string;
  explanation: string | null;
  whyHighYield: string | null;
  commonConfusion: string | null;
  suggestedPracticeLink: string | null;
  suggestedGuideLink: string | null;
  highYieldScore: number | null;
  trapSeverity: number | null;
  confusionFrequency: ConfusionFrequency | null;
  trapDescription: string | null;
  correctApproach: string | null;
  conceptA: string | null;
  conceptB: string | null;
  keyDifference: string | null;
  status: string;
  displayOrder: number;
}

export interface SystemOption {
  id: string;
  slug: string;
  name: string;
  examTrackId: string;
}

export interface TopicOption {
  id: string;
  slug: string;
  name: string;
  domainId: string;
  systemIds?: string[];
}

async function safeQuery<T>(fn: () => Promise<T>): Promise<T> {
  try {
    if (!isSupabaseServiceRoleConfigured()) return [] as unknown as T;
    return await fn();
  } catch {
    return [] as unknown as T;
  }
}

export async function loadAllSystemsForAdmin(): Promise<SystemOption[]> {
  return safeQuery(async () => {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("systems")
      .select("id, slug, name, exam_track_id")
      .order("display_order", { ascending: true });
    return (data ?? []).map((s) => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
      examTrackId: s.exam_track_id,
    }));
  });
}

export async function loadTopicsForTrackAdmin(
  trackId: string | null
): Promise<TopicOption[]> {
  return safeQuery(async () => {
    if (!trackId) return [];
    const supabase = createServiceClient();
    const { data: systems } = await supabase
      .from("systems")
      .select("id")
      .eq("exam_track_id", trackId);
    const systemIds = (systems ?? []).map((s) => s.id);
    if (systemIds.length === 0) return [];

    const { data: links } = await supabase
      .from("topic_system_links")
      .select("topic_id, system_id")
      .in("system_id", systemIds);
    const topicToSystems = new Map<string, string[]>();
    for (const l of links ?? []) {
      const list = topicToSystems.get(l.topic_id) ?? [];
      list.push(l.system_id);
      topicToSystems.set(l.topic_id, list);
    }
    const topicIds = [...topicToSystems.keys()];
    if (topicIds.length === 0) return [];

    const { data: topics } = await supabase
      .from("topics")
      .select("id, slug, name, domain_id")
      .in("id", topicIds)
      .order("display_order", { ascending: true });
    return (topics ?? []).map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      domainId: t.domain_id ?? "",
      systemIds: topicToSystems.get(t.id) ?? [],
    }));
  });
}

function mapRow(r: Record<string, unknown>): AdminHighYieldItem {
  return {
    id: String(r.id ?? ""),
    contentType: (r.content_type as HighYieldContentType) ?? "high_yield_summary",
    examTrackId: String(r.exam_track_id ?? ""),
    systemId: r.system_id ? String(r.system_id) : null,
    topicId: r.topic_id ? String(r.topic_id) : null,
    title: String(r.title ?? ""),
    explanation: r.explanation ? String(r.explanation) : null,
    whyHighYield: r.why_high_yield ? String(r.why_high_yield) : null,
    commonConfusion: r.common_confusion ? String(r.common_confusion) : null,
    suggestedPracticeLink: r.suggested_practice_link
      ? String(r.suggested_practice_link)
      : null,
    suggestedGuideLink: r.suggested_guide_link
      ? String(r.suggested_guide_link)
      : null,
    highYieldScore:
      typeof r.high_yield_score === "number" ? r.high_yield_score : null,
    trapSeverity:
      typeof r.trap_severity === "number" ? r.trap_severity : null,
    confusionFrequency: (r.confusion_frequency as ConfusionFrequency) ?? null,
    trapDescription: r.trap_description ? String(r.trap_description) : null,
    correctApproach: r.correct_approach ? String(r.correct_approach) : null,
    conceptA: r.concept_a ? String(r.concept_a) : null,
    conceptB: r.concept_b ? String(r.concept_b) : null,
    keyDifference: r.key_difference ? String(r.key_difference) : null,
    status: String(r.status ?? "draft"),
    displayOrder: Number(r.display_order ?? 0),
  };
}

/** Load high-yield content for admin with optional filters */
export async function loadAdminHighYieldContent(
  trackId?: string | null,
  contentType?: HighYieldContentType | null
): Promise<AdminHighYieldItem[]> {
  return safeQuery(async () => {
    const supabase = createServiceClient();
    let query = supabase
      .from("high_yield_content")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (trackId) query = query.eq("exam_track_id", trackId);
    if (contentType) query = query.eq("content_type", contentType);
    const { data } = await query;
    return (data ?? []).map((r) => mapRow(r as Record<string, unknown>));
  });
}

/** Load single item for edit */
export async function loadAdminHighYieldItemForEdit(
  id: string
): Promise<AdminHighYieldItem | null> {
  try {
    if (!isSupabaseServiceRoleConfigured()) return null;
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("high_yield_content")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) return null;
    return mapRow(data as Record<string, unknown>);
  } catch {
    return null;
  }
}
