/**
 * Question Production Studio loaders - taxonomy and question types for admin
 */

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";

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
  /** System IDs this topic links to (for track filtering) */
  systemIds?: string[];
}

export interface SubtopicOption {
  id: string;
  slug: string;
  name: string;
  topicId: string;
}

export interface DomainOption {
  id: string;
  slug: string;
  name: string;
}

export interface QuestionTypeOption {
  id: string;
  slug: string;
  name: string;
}

async function safeQuery<T>(fn: () => Promise<T>): Promise<T> {
  try {
    if (!isSupabaseServiceRoleConfigured()) return [] as unknown as T;
    return await fn();
  } catch {
    return [] as unknown as T;
  }
}

/** Load systems for a track */
export async function loadSystemsForTrackAdmin(trackId: string | null): Promise<SystemOption[]> {
  return safeQuery(async () => {
    if (!trackId) return [];
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("systems")
      .select("id, slug, name, exam_track_id")
      .eq("exam_track_id", trackId)
      .order("display_order", { ascending: true });
    return (data ?? []).map((s) => ({ id: s.id, slug: s.slug, name: s.name, examTrackId: s.exam_track_id }));
  });
}

/** Load systems for all tracks (for client-side track switching) */
export async function loadAllSystemsForAdmin(): Promise<SystemOption[]> {
  return safeQuery(async () => {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("systems")
      .select("id, slug, name, exam_track_id")
      .order("display_order", { ascending: true });
    return (data ?? []).map((s) => ({ id: s.id, slug: s.slug, name: s.name, examTrackId: s.exam_track_id }));
  });
}

/** Load domains (shared) */
export async function loadDomainsAdmin(): Promise<DomainOption[]> {
  return safeQuery(async () => {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("domains")
      .select("id, slug, name")
      .order("display_order", { ascending: true });
    return (data ?? []).map((d) => ({ id: d.id, slug: d.slug, name: d.name }));
  });
}

/** Load topics with system links (for client-side track filtering) */
export async function loadAllTopicsForAdmin(): Promise<TopicOption[]> {
  return safeQuery(async () => {
    const supabase = createServiceClient();
    const { data: links } = await supabase.from("topic_system_links").select("topic_id, system_id");
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

/** Load topics linked to track's systems via topic_system_links */
export async function loadTopicsForTrackAdmin(trackId: string | null): Promise<TopicOption[]> {
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
      .select("topic_id")
      .in("system_id", systemIds);
    const topicIds = [...new Set((links ?? []).map((l) => l.topic_id))];
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
    }));
  });
}

/** Load subtopics for a topic */
export async function loadSubtopicsForTopicAdmin(topicId: string | null): Promise<SubtopicOption[]> {
  return safeQuery(async () => {
    if (!topicId) return [];
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("subtopics")
      .select("id, slug, name, topic_id")
      .eq("topic_id", topicId)
      .order("display_order", { ascending: true });
    return (data ?? []).map((s) => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
      topicId: s.topic_id,
    }));
  });
}

/** Load question types */
export async function loadQuestionTypesAdmin(): Promise<QuestionTypeOption[]> {
  return safeQuery(async () => {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("question_types")
      .select("id, slug, name")
      .order("display_order", { ascending: true });
    return (data ?? []).map((t) => ({ id: t.id, slug: t.slug, name: t.name }));
  });
}
