"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";
import type { SourceBasis, LegalStatus } from "@/lib/admin/source-evidence";
import { checkSourceEvidenceGate } from "@/lib/admin/source-evidence";

export interface SaveSourceEvidenceResult {
  success: boolean;
  error?: string;
}

/** Save or update source evidence for content */
export async function saveSourceEvidence(
  contentType: string,
  contentId: string,
  data: {
    sourceBasis: SourceBasis;
    legalStatus: LegalStatus;
    legalNotes?: string | null;
    mediaRightsId?: string | null;
    authorNotes?: string | null;
  }
): Promise<SaveSourceEvidenceResult> {
  if (!isSupabaseServiceRoleConfigured()) {
    return { success: false, error: "Not configured" };
  }

  try {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("content_source_evidence")
      .upsert(
        {
          content_type: contentType,
          content_id: contentId,
          source_basis: data.sourceBasis,
          legal_status: data.legalStatus,
          legal_notes: data.legalNotes?.trim() || null,
          media_rights_id: data.mediaRightsId || null,
          author_notes: data.authorNotes?.trim() || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "content_type,content_id" }
      );

    if (error) return { success: false, error: error.message };

    revalidatePath(`/admin/questions/${contentId}`);
    revalidatePath(`/admin/study-guides/${contentId}`);
    revalidatePath(`/admin/videos/${contentId}`);
    revalidatePath(`/admin/flashcards/${contentId}`);
    revalidatePath(`/admin/high-yield/${contentId}`);
    revalidatePath(`/admin/exams/templates/${contentId}`);
    revalidatePath(`/admin/exams/system/${contentId}`);

    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/** Sync content source links (add/remove) */
export async function saveContentSourceLinks(
  contentType: string,
  contentId: string,
  sourceIds: string[]
): Promise<SaveSourceEvidenceResult> {
  if (!isSupabaseServiceRoleConfigured()) {
    return { success: false, error: "Not configured" };
  }

  try {
    const supabase = createServiceClient();
    await supabase
      .from("content_source_links")
      .delete()
      .eq("content_type", contentType)
      .eq("content_id", contentId);

    if (sourceIds.length > 0) {
      const rows = sourceIds.map((sourceId) => ({
        content_source_id: sourceId,
        content_type: contentType,
        content_id: contentId,
      }));
      const { error } = await supabase.from("content_source_links").insert(rows);
      if (error) return { success: false, error: error.message };
    }

    revalidatePath(`/admin/questions/${contentId}`);
    revalidatePath(`/admin/study-guides/${contentId}`);
    revalidatePath(`/admin/videos/${contentId}`);
    revalidatePath(`/admin/flashcards/${contentId}`);
    revalidatePath(`/admin/high-yield/${contentId}`);
    revalidatePath(`/admin/exams/templates/${contentId}`);
    revalidatePath(`/admin/exams/system/${contentId}`);

    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/** Get source evidence gate status (for client) */
export async function getSourceEvidenceGateStatus(
  contentType: string,
  contentId: string
): Promise<{ canPublish: boolean; reason?: string }> {
  const gate = await checkSourceEvidenceGate(contentType, contentId);
  return { canPublish: gate.canPublish, reason: gate.reason };
}
