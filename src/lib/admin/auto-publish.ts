/**
 * Auto-Publish Rules - quality gate and eligibility checks.
 * Content is auto-published only when:
 * - schema valid
 * - no duplicate
 * - answer/rationale consistency valid
 * - track/system/topic assigned
 * - quality score above threshold
 * - auto_publish_config enabled for content type
 */

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";
import { transitionContentStatus } from "@/app/(app)/actions/content-review";

const ENTITY_TYPE_TO_TABLE: Record<string, string> = {
  question: "questions",
  study_guide: "study_guides",
  flashcard_deck: "flashcard_decks",
  high_yield_content: "high_yield_content",
};

export interface AutoPublishConfig {
  contentType: string;
  enabled: boolean;
  minQualityScore: number;
  requireTrackAssigned: boolean;
  requireNoDuplicate: boolean;
  requireAnswerRationaleConsistent: boolean;
  requireSourceMapping: boolean;
}

export interface AutoPublishResult {
  published: boolean;
  reason?: string;
}

/** Load auto-publish config for a content type */
export async function getAutoPublishConfig(
  contentType: string
): Promise<AutoPublishConfig | null> {
  if (!isSupabaseServiceRoleConfigured()) return null;
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("auto_publish_config")
    .select("*")
    .eq("content_type", contentType)
    .single();
  if (!data) return null;
  return {
    contentType: data.content_type,
    enabled: !!data.enabled,
    minQualityScore: Number(data.min_quality_score ?? 70),
    requireTrackAssigned: !!data.require_track_assigned,
    requireNoDuplicate: !!data.require_no_duplicate,
    requireAnswerRationaleConsistent: !!data.require_answer_rationale_consistent,
    requireSourceMapping: data.require_source_mapping !== false,
  };
}

/** Check if content is eligible for auto-publish. Uses evaluateAutoPublishEligibility as source of truth. */
export async function checkAutoPublishEligibility(
  entityType: string,
  entityId: string,
  contentType: string
): Promise<{ eligible: boolean; reason?: string }> {
  const { evaluateAutoPublishEligibility } = await import("@/lib/admin/evaluate-auto-publish");
  const eval_ = await evaluateAutoPublishEligibility(entityType, entityId, contentType);
  return { eligible: eval_.eligible, reason: eval_.reason };
}

/** Attempt auto-publish if eligible. Records publish_audit on success. */
export async function tryAutoPublish(
  entityType: string,
  entityId: string,
  contentType: string,
  fromStatus: string,
  actorId?: string | null
): Promise<AutoPublishResult> {
  const check = await checkAutoPublishEligibility(entityType, entityId, contentType);
  if (!check.eligible) {
    return { published: false, reason: check.reason };
  }

  const result = await transitionContentStatus(
    entityType,
    entityId,
    "published",
    actorId ?? null,
    "Auto-published by quality gate",
    undefined,
    true // bypassPublishGate: quality gate passed, skip review-stage checks
  );

  if (!result.success) {
    return { published: false, reason: result.blockPublishReason ?? result.error };
  }

  if (isSupabaseServiceRoleConfigured()) {
    const supabase = createServiceClient();
    await supabase.from("publish_audit").insert({
      entity_type: entityType,
      entity_id: entityId,
      from_status: fromStatus,
      to_status: "published",
      actor_id: actorId ?? null,
      reason: "Auto-published by quality gate",
      auto_publish: true,
    });
  }

  return { published: true };
}

/** Run auto-publish flow: evaluate eligibility, publish if eligible, else route to editor_review and record reason. */
export async function runAutoPublishFlow(
  entityType: string,
  entityId: string,
  contentType: string,
  fromStatus: string,
  actorId?: string | null
): Promise<{ published: boolean; routedToReview: boolean; reason?: string }> {
  const { evaluateAutoPublishEligibility } = await import("@/lib/admin/evaluate-auto-publish");

  const eval_ = await evaluateAutoPublishEligibility(entityType, entityId, contentType);

  if (eval_.eligible) {
    const result = await tryAutoPublish(entityType, entityId, contentType, fromStatus, actorId);
    return {
      published: result.published,
      routedToReview: false,
      reason: result.reason,
    };
  }

  if (fromStatus === "draft" && eval_.routedTo === "editor_review") {
    const result = await transitionContentStatus(
      entityType,
      entityId,
      "editor_review",
      actorId ?? null,
      `Routed to review: ${eval_.reason ?? "Quality/source gates not met"}`,
      undefined,
      false
    );
    if (result.success && isSupabaseServiceRoleConfigured()) {
      const supabase = createServiceClient();
      const { data: row } = await supabase
        .from("content_quality_metadata")
        .select("generation_metadata")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .single();
      const existing = (row?.generation_metadata as Record<string, unknown>) ?? {};
      await supabase
        .from("content_quality_metadata")
        .update({
          generation_metadata: {
            ...existing,
            routedToReviewReason: eval_.reason,
            routedAt: new Date().toISOString(),
          } as unknown,
          updated_at: new Date().toISOString(),
        })
        .eq("entity_type", entityType)
        .eq("entity_id", entityId);
    }
  }

  return {
    published: false,
    routedToReview: true,
    reason: eval_.reason,
  };
}

/** Upsert content_quality_metadata (called by AI factory after save) */
export async function upsertContentQualityMetadata(
  entityType: string,
  entityId: string,
  data: {
    qualityScore?: number;
    autoPublishEligible?: boolean;
    validationStatus?: string;
    validationErrors?: unknown[];
    generationMetadata?: Record<string, unknown>;
  }
): Promise<void> {
  if (!isSupabaseServiceRoleConfigured()) return;
  const supabase = createServiceClient();
  await supabase.from("content_quality_metadata").upsert(
    {
      entity_type: entityType,
      entity_id: entityId,
      quality_score: data.qualityScore ?? null,
      auto_publish_eligible: data.autoPublishEligible ?? false,
      validation_status: data.validationStatus ?? null,
      validation_errors: (data.validationErrors ?? []) as unknown,
      generation_metadata: (data.generationMetadata ?? {}) as unknown,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "entity_type,entity_id" }
  );
}
