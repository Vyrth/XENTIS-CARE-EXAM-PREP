/**
 * Auto-Publish Config - shared config loader to avoid circular imports.
 * Used by auto-publish.ts and evaluate-auto-publish.ts.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";

export const ENTITY_TYPE_TO_TABLE: Record<string, string> = {
  question: "questions",
  study_guide: "study_guides",
  flashcard_deck: "flashcard_decks",
  high_yield_content: "high_yield_content",
};

export interface AutoPublishConfig {
  contentType: string;
  enabled: boolean;
  minQualityScore: number;
  minConfidenceScore: number;
  maxSimilarityScore: number | null;
  requireTrackAssigned: boolean;
  requireNoDuplicate: boolean;
  requireAnswerRationaleConsistent: boolean;
  requireSourceMapping: boolean;
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
  const maxSim = data.max_similarity_score != null ? Number(data.max_similarity_score) : null;
  return {
    contentType: data.content_type,
    enabled: !!data.enabled,
    minQualityScore: Number(data.min_quality_score ?? 70),
    minConfidenceScore: Number(data.min_confidence_score ?? 0.85),
    maxSimilarityScore: maxSim,
    requireTrackAssigned: !!data.require_track_assigned,
    requireNoDuplicate: !!data.require_no_duplicate,
    requireAnswerRationaleConsistent: !!data.require_answer_rationale_consistent,
    requireSourceMapping: data.require_source_mapping !== false,
  };
}
