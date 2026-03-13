/**
 * Load auto-publish status for admin UI display.
 * Shows whether content was auto-published or routed to editor review.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";

export interface AutoPublishStatus {
  autoPublished: boolean;
  routedToReviewReason?: string;
  qualityScore?: number;
  publishedAt?: string;
}

/** Load auto-publish status for an entity (question, study_guide, etc.) */
export async function loadAutoPublishStatus(
  entityType: string,
  entityId: string
): Promise<AutoPublishStatus | null> {
  if (!isSupabaseServiceRoleConfigured()) return null;

  const supabase = createServiceClient();

  const [metaRes, auditRes] = await Promise.all([
    supabase
      .from("content_quality_metadata")
      .select("quality_score, generation_metadata")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .single(),
    supabase
      .from("publish_audit")
      .select("auto_publish, created_at")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .eq("to_status", "published")
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),
  ]);

  const meta = metaRes.data;
  const audit = auditRes.data;

  const genMeta = (meta?.generation_metadata as Record<string, unknown>) ?? {};
  const routedReason = genMeta.routedToReviewReason as string | undefined;

  return {
    autoPublished: !!audit?.auto_publish,
    routedToReviewReason: routedReason,
    qualityScore: meta?.quality_score != null ? Number(meta.quality_score) : undefined,
    publishedAt: audit?.created_at ?? undefined,
  };
}
