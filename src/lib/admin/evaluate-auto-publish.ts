/**
 * Auto-Publish Eligibility - single source of truth.
 *
 * Content auto-publishes when:
 * 1. Schema valid, required fields present
 * 2. Quality score >= threshold
 * 3. Approved source evidence (when required)
 * 4. Track assigned
 * 5. auto_publish_config enabled for content type
 *
 * When gates fail: route to editor_review and record reason.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";
import { getAutoPublishConfig } from "./auto-publish";

const ENTITY_TYPE_TO_TABLE: Record<string, string> = {
  question: "questions",
  study_guide: "study_guides",
  flashcard_deck: "flashcard_decks",
  high_yield_content: "high_yield_content",
};

export interface AutoPublishEvalResult {
  eligible: boolean;
  reason?: string;
  score?: number;
  routedTo: "published" | "editor_review";
  /** Reasons for routing to review (when not eligible) */
  blockReasons?: string[];
}

/**
 * Evaluate whether content is eligible for auto-publish.
 * Single source of truth for all content types.
 */
export async function evaluateAutoPublishEligibility(
  entityType: string,
  entityId: string,
  contentType: string
): Promise<AutoPublishEvalResult> {
  const blockReasons: string[] = [];

  const config = await getAutoPublishConfig(contentType);
  if (!config || !config.enabled) {
    return {
      eligible: false,
      reason: "Auto-publish disabled for this content type",
      routedTo: "editor_review",
      blockReasons: ["Auto-publish disabled for this content type"],
    };
  }

  if (!isSupabaseServiceRoleConfigured()) {
    return {
      eligible: false,
      reason: "Service not configured",
      routedTo: "editor_review",
      blockReasons: ["Service not configured"],
    };
  }

  const supabase = createServiceClient();

  const { data: meta } = await supabase
    .from("content_quality_metadata")
    .select("quality_score, auto_publish_eligible, validation_status, validation_errors")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .single();

  if (!meta) {
    return {
      eligible: false,
      reason: "No quality metadata",
      routedTo: "editor_review",
      blockReasons: ["No quality metadata"],
    };
  }

  const score = Number(meta.quality_score ?? 0);
  if (!meta.auto_publish_eligible) {
    const err = meta.validation_status ?? "Validation failed";
    blockReasons.push(err);
  }
  if (score < config.minQualityScore) {
    blockReasons.push(`Quality score ${score} below threshold ${config.minQualityScore}`);
  }

  const table = ENTITY_TYPE_TO_TABLE[entityType] ?? entityType;
  const { data: row } = await supabase
    .from(table)
    .select("exam_track_id, system_id, topic_id, status")
    .eq("id", entityId)
    .single();

  if (!row) {
    return {
      eligible: false,
      reason: "Content not found",
      routedTo: "editor_review",
      blockReasons: ["Content not found"],
    };
  }
  if (config.requireTrackAssigned && !row.exam_track_id) {
    blockReasons.push("Track not assigned");
  }

  if (config.requireSourceMapping && row.exam_track_id) {
    const { getTrackSlug } = await import("@/lib/admin/source-governance-helpers");
    const trackSlug = await getTrackSlug(row.exam_track_id);
    if (trackSlug) {
      const { hasValidSourceMapping } = await import("@/lib/admin/source-governance");
      const sourceCheck = await hasValidSourceMapping(entityType, entityId, trackSlug);
      if (!sourceCheck.valid) {
        blockReasons.push(sourceCheck.reason ?? "Source mapping required");
      }
    }
  }

  const eligible = blockReasons.length === 0;
  return {
    eligible,
    reason: blockReasons.length > 0 ? blockReasons.join("; ") : undefined,
    score,
    routedTo: eligible ? "published" : "editor_review",
    blockReasons: blockReasons.length > 0 ? blockReasons : undefined,
  };
}
