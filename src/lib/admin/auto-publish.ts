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
import { evaluateAutoPublishEligibility, shouldAutoPublishQuestion } from "./evaluate-auto-publish";

export { shouldAutoPublishQuestion };
export type { QuestionForAutoPublish } from "./evaluate-auto-publish";
import { hasAnyReviewFlag, type ReviewFlags } from "./review-flags";
import { getAutoPublishConfig, type AutoPublishConfig } from "./auto-publish-config";
import { recordAutoPublishMetric } from "./auto-publish-metrics";

export type { AutoPublishConfig } from "./auto-publish-config";
export { getAutoPublishConfig } from "./auto-publish-config";

export interface AutoPublishResult {
  published: boolean;
  reason?: string;
}

/** Check if content is eligible for auto-publish. Uses evaluateAutoPublishEligibility as source of truth. */
export async function checkAutoPublishEligibility(
  entityType: string,
  entityId: string,
  contentType: string
): Promise<{ eligible: boolean; reason?: string }> {
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
    await recordAutoPublishMetric("auto_published", contentType);
    const { data: meta } = await supabase
      .from("content_quality_metadata")
      .select("generation_metadata")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .single();
    const existing = (meta?.generation_metadata as Record<string, unknown>) ?? {};
    await supabase
      .from("content_quality_metadata")
      .update({
        generation_metadata: { ...existing, publish_reason: "high_confidence_auto_publish" } as unknown,
        updated_at: new Date().toISOString(),
      })
      .eq("entity_type", entityType)
      .eq("entity_id", entityId);
  }

  return { published: true };
}

/** Pre-resolved routing from centralized resolveQuestionRouting (batch/persistence flow). */
export interface PreResolvedRouting {
  shouldAutoPublish: boolean;
  routedLane: string;
  routingReason: string;
}

/** Run auto-publish flow: use preResolvedRouting when provided (centralized routing), else evaluate eligibility. */
export async function runAutoPublishFlow(
  entityType: string,
  entityId: string,
  contentType: string,
  fromStatus: string,
  actorId?: string | null,
  options?: { reviewFlags?: ReviewFlags; preResolvedRouting?: PreResolvedRouting }
): Promise<{ published: boolean; routedToReview: boolean; reason?: string; routingLane?: string }> {
  const pre = options?.preResolvedRouting;

  if (pre) {
    if (process.env.NODE_ENV === "development" || process.env.DEBUG_AUTO_PUBLISH === "1") {
      console.info("[auto-publish] using preResolvedRouting", {
        entityType,
        entityId,
        shouldAutoPublish: pre.shouldAutoPublish,
        routedLane: pre.routedLane,
        routingReason: pre.routingReason,
      });
    }
    if (pre.shouldAutoPublish) {
      const result = await transitionContentStatus(
        entityType,
        entityId,
        "published",
        actorId ?? null,
        "Auto-published by quality gate (centralized routing)",
        undefined,
        true
      );
      if (!result.success) {
        return { published: false, routedToReview: false, reason: result.blockPublishReason ?? result.error };
      }
      if (isSupabaseServiceRoleConfigured()) {
        const supabase = createServiceClient();
        await supabase.from("publish_audit").insert({
          entity_type: entityType,
          entity_id: entityId,
          from_status: fromStatus,
          to_status: "published",
          actor_id: actorId ?? null,
          reason: "Auto-published by quality gate (centralized routing)",
          auto_publish: true,
        });
        await recordAutoPublishMetric("auto_published", contentType);
        const { data: meta } = await supabase
          .from("content_quality_metadata")
          .select("generation_metadata")
          .eq("entity_type", entityType)
          .eq("entity_id", entityId)
          .single();
        const existing = (meta?.generation_metadata as Record<string, unknown>) ?? {};
        await supabase
          .from("content_quality_metadata")
          .update({
            generation_metadata: { ...existing, publish_reason: "high_confidence_auto_publish" } as unknown,
            updated_at: new Date().toISOString(),
          })
          .eq("entity_type", entityType)
          .eq("entity_id", entityId);
      }
      return { published: true, routedToReview: false, routingLane: undefined };
    }
    if (fromStatus === "draft") {
      const result = await transitionContentStatus(
        entityType,
        entityId,
        "editor_review",
        actorId ?? null,
        `Routed to review: ${pre.routingReason}`,
        undefined,
        false
      );
      if (result.success && isSupabaseServiceRoleConfigured()) {
        const supabase = createServiceClient();
        await recordAutoPublishMetric("routed_to_review", contentType);
        if (pre.routedLane === "legal") await recordAutoPublishMetric("legal_exception", contentType);
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
              routing_lane: pre.routedLane,
              routing_reason: pre.routingReason,
              routedToReviewReason: pre.routingReason,
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
      reason: pre.routingReason,
      routingLane: pre.routedLane,
    };
  }

  const eval_ = await evaluateAutoPublishEligibility(entityType, entityId, contentType);
  const reviewFlags = options?.reviewFlags;
  const hasFlags = reviewFlags ? hasAnyReviewFlag(reviewFlags) : (eval_.routedTo === "editor_review");

  if (process.env.NODE_ENV === "development" || process.env.DEBUG_AUTO_PUBLISH === "1") {
    console.info("[auto-publish]", {
      entityType,
      entityId,
      contentType,
      eligible: eval_.eligible,
      reason: eval_.reason,
      routingLane: eval_.routingLane,
      routingReason: eval_.routingReason,
      blockReasons: eval_.blockReasons,
    });
  }

  if (eval_.eligible) {
    const result = await tryAutoPublish(entityType, entityId, contentType, fromStatus, actorId);
    return {
      published: result.published,
      routedToReview: false,
      reason: result.reason,
      routingLane: undefined,
    };
  }

  if (fromStatus === "draft") {
    const result = await transitionContentStatus(
      entityType,
      entityId,
      "editor_review",
      actorId ?? null,
      `Routed to review: ${eval_.routingReason ?? eval_.reason ?? "Quality/source gates not met"}`,
      undefined,
      false
    );
    if (result.success && isSupabaseServiceRoleConfigured()) {
      const supabase = createServiceClient();
      await recordAutoPublishMetric("routed_to_review", contentType);
      if (eval_.routingLane === "legal") await recordAutoPublishMetric("legal_exception", contentType);
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
            routing_lane: eval_.routingLane ?? "editorial",
            routing_reason: eval_.routingReason ?? eval_.reason,
            routedToReviewReason: eval_.routingReason ?? eval_.reason,
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
    reason: eval_.routingReason ?? eval_.reason,
    routingLane: eval_.routingLane ?? "editorial",
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
