/**
 * Load auto-publish status for admin UI display.
 * Shows whether content was auto-published or routed to editor review.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";

export interface AutoPublishStatus {
  autoPublished: boolean;
  routedToReviewReason?: string;
  /** High-confidence routing lane when not auto-published */
  routingLane?: string;
  /** Why item was routed to review (diagnostics) */
  routingReason?: string;
  /** Why item was auto-published */
  publishReason?: string;
  qualityScore?: number;
  publishedAt?: string;
  /** Per-lane review flags (exception-only routing) */
  reviewFlags?: {
    requires_editorial_review: boolean;
    requires_sme_review: boolean;
    requires_legal_review: boolean;
    requires_qa_review: boolean;
  };
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
  const routedReason = (genMeta.routing_reason ?? genMeta.routedToReviewReason) as string | undefined;
  const routingLane = genMeta.routing_lane as string | undefined;
  const publishReason = genMeta.publish_reason as string | undefined;
  const reviewFlags =
    genMeta.requires_editorial_review != null ||
    genMeta.requires_sme_review != null ||
    genMeta.requires_legal_review != null ||
    genMeta.requires_qa_review != null
      ? {
          requires_editorial_review: !!genMeta.requires_editorial_review,
          requires_sme_review: !!genMeta.requires_sme_review,
          requires_legal_review: !!genMeta.requires_legal_review,
          requires_qa_review: !!genMeta.requires_qa_review,
        }
      : undefined;

  return {
    autoPublished: !!audit?.auto_publish,
    routedToReviewReason: routedReason,
    routingLane,
    routingReason: routedReason,
    publishReason,
    qualityScore: meta?.quality_score != null ? Number(meta.quality_score) : undefined,
    publishedAt: audit?.created_at ?? undefined,
    reviewFlags,
  };
}
