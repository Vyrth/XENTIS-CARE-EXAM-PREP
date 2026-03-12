/**
 * Exam loaders - exam_templates, system_exams
 * All queries are track-filtered at the database level.
 */

import { createClient } from "@/lib/supabase/server";

export interface ExamTemplateListItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  questionCount: number;
  durationMinutes: number;
  blueprintType: string | null;
}

export interface SystemExamListItem {
  id: string;
  name: string;
  description: string | null;
  questionCount: number;
  durationMinutes: number;
  systemId: string;
  systemSlug: string;
  systemName: string;
}

/**
 * Load exam templates for a track (e.g. pre_practice, readiness).
 */
export async function loadExamTemplates(
  trackId: string | null
): Promise<ExamTemplateListItem[]> {
  if (!trackId) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("exam_templates")
    .select("id, slug, name, description, question_count, duration_minutes, blueprint_type")
    .eq("exam_track_id", trackId)
    .order("question_count", { ascending: false });

  return (data ?? []).map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    description: t.description ?? null,
    questionCount: t.question_count,
    durationMinutes: t.duration_minutes,
    blueprintType: t.blueprint_type ?? null,
  }));
}

/**
 * Load pre_practice template for a track. Returns null if none.
 */
export async function loadPrePracticeTemplate(
  trackId: string | null
): Promise<ExamTemplateListItem | null> {
  const templates = await loadExamTemplates(trackId);
  return templates.find((t) => t.slug === "pre_practice") ?? null;
}

export interface PrePracticeVersion {
  id: string;
  versionKey: string;
  displayName: string;
  description: string | null;
  difficultyProfile: string;
  displayOrder: number;
  assemblyRules: Record<string, unknown>;
}

/**
 * Load Pre-Practice versions I-V for a track.
 */
export async function loadPrePracticeVersions(
  trackId: string | null
): Promise<PrePracticeVersion[]> {
  if (!trackId) return [];

  const supabase = await createClient();
  const { data: series } = await supabase
    .from("pre_practice_series")
    .select("id")
    .eq("exam_track_id", trackId)
    .single();

  if (!series) return [];

  const { data: versions } = await supabase
    .from("pre_practice_versions")
    .select("id, version_key, display_name, description, difficulty_profile, display_order, assembly_rules")
    .eq("series_id", series.id)
    .order("display_order", { ascending: true });

  return (versions ?? []).map((v) => ({
    id: v.id,
    versionKey: v.version_key,
    displayName: v.display_name,
    description: v.description ?? null,
    difficultyProfile: v.difficulty_profile,
    displayOrder: v.display_order,
    assemblyRules: (v.assembly_rules as Record<string, unknown>) ?? {},
  }));
}

/**
 * Load a single Pre-Practice version by key (i, ii, iii, iv, v).
 */
export async function loadPrePracticeVersionByKey(
  trackId: string | null,
  versionKey: string
): Promise<PrePracticeVersion | null> {
  const versions = await loadPrePracticeVersions(trackId);
  const key = versionKey.toLowerCase();
  return versions.find((v) => v.versionKey === key) ?? null;
}

/**
 * Load system exams for a track (50+ question exams per system).
 */
export async function loadSystemExams(
  trackId: string | null
): Promise<SystemExamListItem[]> {
  if (!trackId) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("system_exams")
    .select("id, name, description, question_count, duration_minutes, system_id, systems(id, slug, name)")
    .eq("exam_track_id", trackId)
    .order("name", { ascending: true });

  return (data ?? []).map((e) => {
    const sys = Array.isArray(e.systems) ? e.systems[0] : e.systems;
    return {
      id: e.id,
      name: e.name,
      description: e.description ?? null,
      questionCount: e.question_count,
      durationMinutes: e.duration_minutes,
      systemId: e.system_id,
      systemSlug: (sys as { slug?: string })?.slug ?? "",
      systemName: (sys as { name?: string })?.name ?? "",
    };
  });
}

/**
 * Load a single system exam by system_id, track-scoped.
 */
export async function loadSystemExamBySystemId(
  trackId: string | null,
  systemId: string
): Promise<SystemExamListItem | null> {
  const exams = await loadSystemExams(trackId);
  return exams.find((e) => e.systemId === systemId) ?? null;
}
