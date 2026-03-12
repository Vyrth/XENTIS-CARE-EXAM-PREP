"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";
import type { SectionMetadata } from "@/lib/admin/study-guide-studio-loaders";
import { ensureSourceEvidenceForAdminContent } from "@/lib/admin/source-evidence";

export interface StudyGuideFormData {
  examTrackId: string;
  systemId: string | null;
  topicId: string | null;
  slug: string;
  title: string;
  description?: string | null;
}

export interface StudyGuideSectionInput {
  id?: string;
  slug: string;
  title: string;
  contentMarkdown: string | null;
  sectionMetadata: SectionMetadata;
  displayOrder: number;
}

export interface SaveStudyGuideResult {
  success: boolean;
  guideId?: string;
  error?: string;
  validationErrors?: string[];
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function createStudyGuide(
  data: StudyGuideFormData
): Promise<SaveStudyGuideResult> {
  if (!data.examTrackId?.trim() || !data.title?.trim()) {
    return { success: false, validationErrors: ["Track and title are required"] };
  }
  if (!isSupabaseServiceRoleConfigured()) {
    return { success: false, error: "Supabase not configured" };
  }

  const slug = data.slug?.trim() || slugify(data.title);
  if (!slug) return { success: false, validationErrors: ["Slug is required"] };

  try {
    const supabase = createServiceClient();
    const { data: g, error } = await supabase
      .from("study_guides")
      .insert({
        exam_track_id: data.examTrackId,
        system_id: data.systemId || null,
        topic_id: data.topicId || null,
        slug,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        display_order: 0,
        status: "draft",
      })
      .select("id")
      .single();

    if (error || !g) {
      if (error?.code === "23505") {
        return { success: false, validationErrors: ["A guide with this slug already exists for this track"] };
      }
      return { success: false, error: error?.message ?? "Failed to create guide" };
    }

    await ensureSourceEvidenceForAdminContent("study_guide", g.id);

    revalidatePath("/admin/study-guides");
    return { success: true, guideId: g.id };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function updateStudyGuide(
  guideId: string,
  data: StudyGuideFormData
): Promise<SaveStudyGuideResult> {
  if (!data.examTrackId?.trim() || !data.title?.trim()) {
    return { success: false, validationErrors: ["Track and title are required"] };
  }
  if (!isSupabaseServiceRoleConfigured()) {
    return { success: false, error: "Supabase not configured" };
  }

  const slug = data.slug?.trim() || slugify(data.title);
  if (!slug) return { success: false, validationErrors: ["Slug is required"] };

  try {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("study_guides")
      .update({
        exam_track_id: data.examTrackId,
        system_id: data.systemId || null,
        topic_id: data.topicId || null,
        slug,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", guideId);

    if (error) {
      if (error.code === "23505") {
        return { success: false, validationErrors: ["A guide with this slug already exists for this track"] };
      }
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/study-guides");
    revalidatePath(`/admin/study-guides/${guideId}`);
    return { success: true, guideId };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function saveStudyGuideSections(
  guideId: string,
  sections: StudyGuideSectionInput[]
): Promise<SaveStudyGuideResult> {
  if (!isSupabaseServiceRoleConfigured()) {
    return { success: false, error: "Supabase not configured" };
  }

  try {
    const supabase = createServiceClient();

    for (let i = 0; i < sections.length; i++) {
      const s = sections[i];
      const sectionSlug = s.slug?.trim() || slugify(s.title) || `section-${i + 1}`;
      const contentMarkdown =
        s.contentMarkdown?.trim() ||
        s.sectionMetadata?.plainExplanation?.trim() ||
        s.sectionMetadata?.boardExplanation?.trim() ||
        null;

      const sectionMetadata: Record<string, unknown> = {
        plainExplanation: s.sectionMetadata?.plainExplanation || undefined,
        boardExplanation: s.sectionMetadata?.boardExplanation || undefined,
        keyTakeaways: s.sectionMetadata?.keyTakeaways?.length ? s.sectionMetadata.keyTakeaways : undefined,
        commonTraps: s.sectionMetadata?.commonTraps?.length ? s.sectionMetadata.commonTraps : undefined,
        comparisonTable: s.sectionMetadata?.comparisonTable || undefined,
        mnemonics: s.sectionMetadata?.mnemonics?.length ? s.sectionMetadata.mnemonics : undefined,
        highYield: s.sectionMetadata?.highYield ?? undefined,
        isHighlightable: s.sectionMetadata?.isHighlightable ?? true,
        estimatedReadMinutes: s.sectionMetadata?.estimatedReadMinutes ?? undefined,
      };

      if (s.id) {
        await supabase
          .from("study_material_sections")
          .update({
            slug: sectionSlug,
            title: s.title.trim(),
            content_markdown: contentMarkdown,
            section_metadata: sectionMetadata,
            display_order: i,
            updated_at: new Date().toISOString(),
          })
          .eq("id", s.id)
          .eq("study_guide_id", guideId);
      } else {
        await supabase.from("study_material_sections").insert({
          study_guide_id: guideId,
          parent_section_id: null,
          slug: sectionSlug,
          title: s.title.trim(),
          content_markdown: contentMarkdown,
          section_metadata: sectionMetadata,
          display_order: i,
        });
      }
    }

    revalidatePath("/admin/study-guides");
    revalidatePath(`/admin/study-guides/${guideId}`);
    return { success: true, guideId };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function reorderStudyGuideSections(
  guideId: string,
  sectionIds: string[]
): Promise<SaveStudyGuideResult> {
  if (!isSupabaseServiceRoleConfigured()) {
    return { success: false, error: "Supabase not configured" };
  }

  try {
    const supabase = createServiceClient();
    for (let i = 0; i < sectionIds.length; i++) {
      await supabase
        .from("study_material_sections")
        .update({ display_order: i, updated_at: new Date().toISOString() })
        .eq("id", sectionIds[i])
        .eq("study_guide_id", guideId);
    }
    revalidatePath("/admin/study-guides");
    revalidatePath(`/admin/study-guides/${guideId}`);
    return { success: true, guideId };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function deleteStudyGuideSection(
  guideId: string,
  sectionId: string
): Promise<SaveStudyGuideResult> {
  if (!isSupabaseServiceRoleConfigured()) {
    return { success: false, error: "Supabase not configured" };
  }

  try {
    const supabase = createServiceClient();
    await supabase
      .from("study_material_sections")
      .delete()
      .eq("id", sectionId)
      .eq("study_guide_id", guideId);
    revalidatePath("/admin/study-guides");
    revalidatePath(`/admin/study-guides/${guideId}`);
    return { success: true, guideId };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}
