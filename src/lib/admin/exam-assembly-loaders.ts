/**
 * Exam Assembly Studio loaders - templates, system exams, options for assembly.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";
import type { AssemblyRules } from "./exam-assembly-pool";

export interface ExamTemplateForAssembly {
  id: string;
  examTrackId: string;
  slug: string;
  name: string;
  description: string | null;
  questionCount: number;
  durationMinutes: number;
  blueprintType: string | null;
  assemblyMode: "manual" | "rule_based" | "hybrid";
  assemblyRules: AssemblyRules;
  poolCount: number;
}

export interface SystemExamForAssembly {
  id: string;
  examTrackId: string;
  systemId: string;
  systemSlug: string;
  systemName: string;
  name: string;
  description: string | null;
  questionCount: number;
  durationMinutes: number;
  assemblyMode: "manual" | "rule_based" | "hybrid";
  assemblyRules: AssemblyRules;
  poolCount: number;
}

export interface SystemOption {
  id: string;
  slug: string;
  name: string;
  examTrackId: string;
}

export interface DomainOption {
  id: string;
  slug: string;
  name: string;
}

export interface TopicOption {
  id: string;
  slug: string;
  name: string;
  domainId: string;
}

export interface ItemTypeOption {
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

/** Load exam templates for assembly (with pool counts) */
export async function loadExamTemplatesForAssembly(
  trackId?: string | null
): Promise<ExamTemplateForAssembly[]> {
  return safeQuery(async () => {
    const supabase = createServiceClient();
    let query = supabase
      .from("exam_templates")
      .select("id, exam_track_id, slug, name, description, question_count, duration_minutes, blueprint_type, assembly_mode, assembly_rules")
      .order("question_count", { ascending: false });
    if (trackId) query = query.eq("exam_track_id", trackId);
    const { data } = await query;

    const templateIds = (data ?? []).map((t) => t.id);
    const poolCounts = new Map<string, number>();

    if (templateIds.length > 0) {
      const { data: counts } = await supabase
        .from("exam_template_question_pool")
        .select("exam_template_id")
        .in("exam_template_id", templateIds);
      for (const row of counts ?? []) {
        poolCounts.set(row.exam_template_id, (poolCounts.get(row.exam_template_id) ?? 0) + 1);
      }
    }

    return (data ?? []).map((t) => ({
      id: t.id,
      examTrackId: t.exam_track_id,
      slug: t.slug,
      name: t.name,
      description: t.description ?? null,
      questionCount: t.question_count,
      durationMinutes: t.duration_minutes,
      blueprintType: t.blueprint_type ?? null,
      assemblyMode: (t.assembly_mode as "manual" | "rule_based" | "hybrid") ?? "manual",
      assemblyRules: (t.assembly_rules as AssemblyRules) ?? {},
      poolCount: poolCounts.get(t.id) ?? 0,
    }));
  });
}

/** Load system exams for assembly */
export async function loadSystemExamsForAssembly(
  trackId?: string | null
): Promise<SystemExamForAssembly[]> {
  return safeQuery(async () => {
    const supabase = createServiceClient();
    let query = supabase
      .from("system_exams")
      .select("id, exam_track_id, system_id, name, description, question_count, duration_minutes, assembly_mode, assembly_rules, systems(id, slug, name)")
      .order("name", { ascending: true });
    if (trackId) query = query.eq("exam_track_id", trackId);
    const { data } = await query;

    const examIds = (data ?? []).map((e) => e.id);
    const poolCounts = new Map<string, number>();

    if (examIds.length > 0) {
      const { data: counts } = await supabase
        .from("system_exam_question_pool")
        .select("system_exam_id")
        .in("system_exam_id", examIds);
      for (const row of counts ?? []) {
        poolCounts.set(row.system_exam_id, (poolCounts.get(row.system_exam_id) ?? 0) + 1);
      }
    }

    return (data ?? []).map((e) => {
      const sys = Array.isArray(e.systems) ? e.systems[0] : e.systems;
      return {
        id: e.id,
        examTrackId: e.exam_track_id,
        systemId: e.system_id,
        systemSlug: (sys as { slug?: string })?.slug ?? "",
        systemName: (sys as { name?: string })?.name ?? "",
        name: e.name,
        description: e.description ?? null,
        questionCount: e.question_count,
        durationMinutes: e.duration_minutes,
        assemblyMode: (e.assembly_mode as "manual" | "rule_based" | "hybrid") ?? "manual",
        assemblyRules: (e.assembly_rules as AssemblyRules) ?? {},
        poolCount: poolCounts.get(e.id) ?? 0,
      };
    });
  });
}

/** Load single template for edit */
export async function loadExamTemplateForEdit(
  id: string
): Promise<ExamTemplateForAssembly | null> {
  try {
    if (!isSupabaseServiceRoleConfigured()) return null;
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("exam_templates")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) return null;

    const { count } = await supabase
      .from("exam_template_question_pool")
      .select("id", { count: "exact", head: true })
      .eq("exam_template_id", id);

    return {
      id: data.id,
      examTrackId: data.exam_track_id,
      slug: data.slug,
      name: data.name,
      description: data.description ?? null,
      questionCount: data.question_count,
      durationMinutes: data.duration_minutes,
      blueprintType: data.blueprint_type ?? null,
      assemblyMode: (data.assembly_mode as "manual" | "rule_based" | "hybrid") ?? "manual",
      assemblyRules: (data.assembly_rules as AssemblyRules) ?? {},
      poolCount: count ?? 0,
    };
  } catch {
    return null;
  }
}

/** Load single system exam for edit */
export async function loadSystemExamForEdit(
  id: string
): Promise<SystemExamForAssembly | null> {
  try {
    if (!isSupabaseServiceRoleConfigured()) return null;
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("system_exams")
      .select("*, systems(id, slug, name)")
      .eq("id", id)
      .single();
    if (error || !data) return null;

    const { count } = await supabase
      .from("system_exam_question_pool")
      .select("id", { count: "exact", head: true })
      .eq("system_exam_id", id);

    const sys = Array.isArray(data.systems) ? data.systems[0] : data.systems;
    return {
      id: data.id,
      examTrackId: data.exam_track_id,
      systemId: data.system_id,
      systemSlug: (sys as { slug?: string })?.slug ?? "",
      systemName: (sys as { name?: string })?.name ?? "",
      name: data.name,
      description: data.description ?? null,
      questionCount: data.question_count,
      durationMinutes: data.duration_minutes,
      assemblyMode: (data.assembly_mode as "manual" | "rule_based" | "hybrid") ?? "manual",
      assemblyRules: (data.assembly_rules as AssemblyRules) ?? {},
      poolCount: count ?? 0,
    };
  } catch {
    return null;
  }
}

/** Load systems for track */
export async function loadSystemsForTrack(trackId: string): Promise<SystemOption[]> {
  return safeQuery(async () => {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("systems")
      .select("id, slug, name, exam_track_id")
      .eq("exam_track_id", trackId)
      .order("display_order", { ascending: true });
    return (data ?? []).map((s) => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
      examTrackId: s.exam_track_id,
    }));
  });
}

/** Load domains */
export async function loadDomainsForAssembly(): Promise<DomainOption[]> {
  return safeQuery(async () => {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("domains")
      .select("id, slug, name")
      .order("display_order", { ascending: true });
    return (data ?? []).map((d) => ({
      id: d.id,
      slug: d.slug,
      name: d.name,
    }));
  });
}

/** Load topics for track (via topic_system_links) */
export async function loadTopicsForTrackAssembly(trackId: string): Promise<TopicOption[]> {
  return safeQuery(async () => {
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

/** Load question types */
export async function loadItemTypesForAssembly(): Promise<ItemTypeOption[]> {
  return safeQuery(async () => {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("question_types")
      .select("id, slug, name")
      .order("display_order", { ascending: true });
    return (data ?? []).map((qt) => ({
      id: qt.id,
      slug: qt.slug,
      name: qt.name,
    }));
  });
}
