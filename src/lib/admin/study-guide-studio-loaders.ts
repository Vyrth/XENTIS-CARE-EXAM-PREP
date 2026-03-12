/**
 * Study Guide Production Studio loaders - taxonomy and guide data for admin
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
  systemIds?: string[];
}

export interface SectionMetadata {
  plainExplanation?: string;
  boardExplanation?: string;
  keyTakeaways?: string[];
  commonTraps?: string[];
  comparisonTable?: { headers: string[]; rows: string[][] };
  mnemonics?: string[];
  highYield?: boolean;
  isHighlightable?: boolean;
  estimatedReadMinutes?: number;
}

export interface AdminStudyGuideSection {
  id: string;
  slug: string;
  title: string;
  contentMarkdown: string | null;
  contentHtml: string | null;
  displayOrder: number;
  sectionMetadata: SectionMetadata;
}

export interface AdminStudyGuideForEdit {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  examTrackId: string;
  systemId: string | null;
  topicId: string | null;
  status: string;
  sections: AdminStudyGuideSection[];
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
    return (data ?? []).map((s) => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
      examTrackId: s.exam_track_id,
    }));
  });
}

/** Load systems for all tracks */
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

/** Load topics with system links for track filtering */
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

/** Load study guide for edit (admin) - includes sections with metadata */
export async function loadAdminStudyGuideForEdit(
  guideId: string
): Promise<AdminStudyGuideForEdit | null> {
  try {
    if (!isSupabaseServiceRoleConfigured()) return null;
    const supabase = createServiceClient();
    const { data: g, error } = await supabase
      .from("study_guides")
      .select("id, slug, title, description, exam_track_id, system_id, topic_id, status")
      .eq("id", guideId)
      .single();
    if (error || !g) return null;

    const { data: sections } = await supabase
      .from("study_material_sections")
      .select("id, slug, title, content_markdown, content_html, display_order, section_metadata")
      .eq("study_guide_id", guideId)
      .is("parent_section_id", null)
      .order("display_order", { ascending: true });

    const meta = (raw: unknown): SectionMetadata => {
      if (!raw || typeof raw !== "object") return {};
      const m = raw as Record<string, unknown>;
      return {
        plainExplanation: typeof m.plainExplanation === "string" ? m.plainExplanation : undefined,
        boardExplanation: typeof m.boardExplanation === "string" ? m.boardExplanation : undefined,
        keyTakeaways: Array.isArray(m.keyTakeaways) ? m.keyTakeaways.filter((x): x is string => typeof x === "string") : undefined,
        commonTraps: Array.isArray(m.commonTraps) ? m.commonTraps.filter((x): x is string => typeof x === "string") : undefined,
        comparisonTable:
          m.comparisonTable && typeof m.comparisonTable === "object"
            ? (m.comparisonTable as { headers: string[]; rows: string[][] })
            : undefined,
        mnemonics: Array.isArray(m.mnemonics) ? m.mnemonics.filter((x): x is string => typeof x === "string") : undefined,
        highYield: typeof m.highYield === "boolean" ? m.highYield : undefined,
        isHighlightable: typeof m.isHighlightable === "boolean" ? m.isHighlightable : undefined,
        estimatedReadMinutes: typeof m.estimatedReadMinutes === "number" ? m.estimatedReadMinutes : undefined,
      };
    };

    return {
      id: g.id,
      slug: g.slug ?? "",
      title: g.title ?? "",
      description: g.description ?? null,
      examTrackId: g.exam_track_id ?? "",
      systemId: g.system_id ?? null,
      topicId: g.topic_id ?? null,
      status: g.status ?? "draft",
      sections: (sections ?? []).map((s) => ({
        id: s.id,
        slug: s.slug ?? "",
        title: s.title ?? "",
        contentMarkdown: s.content_markdown ?? null,
        contentHtml: s.content_html ?? null,
        displayOrder: s.display_order ?? 0,
        sectionMetadata: meta(s.section_metadata),
      })),
    };
  } catch {
    return null;
  }
}
