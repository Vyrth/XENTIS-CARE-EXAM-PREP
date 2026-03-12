/**
 * Flashcard Production Studio loaders - taxonomy and deck/card data for admin
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

export interface CardMetadata {
  hint?: string;
  memoryTrick?: string;
  compareContrast?: string;
  rapidRecall?: string;
}

export interface AdminFlashcard {
  id: string;
  frontText: string;
  backText: string;
  displayOrder: number;
  metadata: CardMetadata;
}

export interface AdminFlashcardDeckForEdit {
  id: string;
  name: string;
  description: string | null;
  examTrackId: string;
  systemId: string | null;
  topicId: string | null;
  deckType: string;
  difficulty: string;
  status: string;
  source: string;
  isPublic: boolean;
  cards: AdminFlashcard[];
}

export interface StudyGuideSectionOption {
  id: string;
  guideId: string;
  guideTitle: string;
  sectionTitle: string;
  contentPreview: string;
}

export interface AISavedFlashcardSet {
  id: string;
  userId: string;
  sourceContentType: string | null;
  sourceContentId: string | null;
  outputData: { flashcards?: { front: string; back: string; hint?: string; memory_trick?: string }[] };
  createdAt: string;
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

function parseCardMetadata(raw: unknown): CardMetadata {
  if (!raw || typeof raw !== "object") return {};
  const m = raw as Record<string, unknown>;
  return {
    hint: typeof m.hint === "string" ? m.hint : undefined,
    memoryTrick: typeof m.memoryTrick === "string" ? m.memoryTrick : (typeof m.memory_trick === "string" ? m.memory_trick : undefined),
    compareContrast: typeof m.compareContrast === "string" ? m.compareContrast : undefined,
    rapidRecall: typeof m.rapidRecall === "string" ? m.rapidRecall : undefined,
  };
}

/** Load deck for edit with cards */
export async function loadAdminFlashcardDeckForEdit(
  deckId: string
): Promise<AdminFlashcardDeckForEdit | null> {
  try {
    if (!isSupabaseServiceRoleConfigured()) return null;
    const supabase = createServiceClient();
    const { data: d, error } = await supabase
      .from("flashcard_decks")
      .select("id, name, description, exam_track_id, system_id, topic_id, deck_type, difficulty, status, source, is_public")
      .eq("id", deckId)
      .single();
    if (error || !d) return null;

    const { data: cards } = await supabase
      .from("flashcards")
      .select("id, front_text, back_text, display_order, metadata")
      .eq("flashcard_deck_id", deckId)
      .order("display_order", { ascending: true });

    return {
      id: d.id,
      name: d.name ?? "",
      description: d.description ?? null,
      examTrackId: d.exam_track_id ?? "",
      systemId: d.system_id ?? null,
      topicId: d.topic_id ?? null,
      deckType: d.deck_type ?? "standard",
      difficulty: d.difficulty ?? "medium",
      status: d.status ?? "draft",
      source: d.source ?? "platform",
      isPublic: d.is_public ?? false,
      cards: (cards ?? []).map((c) => ({
        id: c.id,
        frontText: c.front_text ?? "",
        backText: c.back_text ?? "",
        displayOrder: c.display_order ?? 0,
        metadata: parseCardMetadata(c.metadata),
      })),
    };
  } catch {
    return null;
  }
}

/** Load study guide sections for import (track-scoped) */
export async function loadStudyGuideSectionsForImport(
  trackId: string | null
): Promise<StudyGuideSectionOption[]> {
  return safeQuery(async () => {
    if (!trackId) return [];
    const supabase = createServiceClient();
    const { data: guides } = await supabase
      .from("study_guides")
      .select("id, title")
      .eq("exam_track_id", trackId)
      .in("status", ["approved", "draft", "review"]);
    if (!guides?.length) return [];

    const out: StudyGuideSectionOption[] = [];
    for (const g of guides) {
      const { data: sections } = await supabase
        .from("study_material_sections")
        .select("id, title, content_markdown, section_metadata")
        .eq("study_guide_id", g.id)
        .is("parent_section_id", null)
        .order("display_order", { ascending: true });
      for (const s of sections ?? []) {
        const meta = (s.section_metadata as Record<string, unknown>) ?? {};
        const plain = typeof meta.plainExplanation === "string" ? meta.plainExplanation : "";
        const board = typeof meta.boardExplanation === "string" ? meta.boardExplanation : "";
        const content = (s.content_markdown ?? plain ?? board ?? "").slice(0, 200);
        out.push({
          id: s.id,
          guideId: g.id,
          guideTitle: g.title ?? "",
          sectionTitle: s.title ?? "",
          contentPreview: content,
        });
      }
    }
    return out;
  });
}

/** Load full section content for flashcard generation */
export async function loadStudyGuideSectionContent(
  sectionId: string
): Promise<string | null> {
  return safeQuery(async () => {
    const supabase = createServiceClient();
    const { data: s } = await supabase
      .from("study_material_sections")
      .select("content_markdown, section_metadata")
      .eq("id", sectionId)
      .single();
    if (!s) return null;
    const meta = (s.section_metadata as Record<string, unknown>) ?? {};
    const plain = typeof meta.plainExplanation === "string" ? meta.plainExplanation : "";
    const board = typeof meta.boardExplanation === "string" ? meta.boardExplanation : "";
    const md = s.content_markdown ?? "";
    const parts = [md, plain, board].filter(Boolean);
    return parts.join("\n\n") || null;
  });
}

/** Load recent AI-generated flashcard sets for admin import */
export async function loadAISavedFlashcardSets(limit = 50): Promise<AISavedFlashcardSet[]> {
  return safeQuery(async () => {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("ai_saved_outputs")
      .select("id, user_id, source_content_type, source_content_id, output_data, created_at")
      .eq("output_type", "flashcard_set")
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data ?? []).map((r) => ({
      id: r.id,
      userId: r.user_id,
      sourceContentType: r.source_content_type ?? null,
      sourceContentId: r.source_content_id ?? null,
      outputData: (r.output_data as { flashcards?: { front: string; back: string; hint?: string; memory_trick?: string }[] }) ?? {},
      createdAt: r.created_at ?? "",
    }));
  });
}
