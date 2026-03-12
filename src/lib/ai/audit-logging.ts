/**
 * AI Content Factory - generation audit logging.
 * Tracks every generation event for compliance, traceability, and troubleshooting.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";
import type { GenerationConfig } from "@/lib/ai/factory/types";

const PROMPT_VERSION = "content-factory-v1";
const MODEL_USED = "gpt-4o-mini";

export type AuditOutcome = "pending" | "saved" | "discarded";

export interface RecordGenerationAuditParams {
  contentType: string;
  config: GenerationConfig;
  createdBy: string | null;
  /** Number of items generated (e.g. 1 question, 8 cards) */
  generationCount?: number;
  /** Template or prompt name */
  promptVersion?: string;
  /** Link to batch job when generated via batch engine */
  batchJobId?: string | null;
}

/**
 * Record a generation event (insert at generate time).
 * Returns auditId for later update on save/discard.
 */
export async function recordGenerationAudit(params: RecordGenerationAuditParams): Promise<string | null> {
  if (!isSupabaseServiceRoleConfigured()) return null;
  try {
    const supabase = createServiceClient();
    const { contentType, config, createdBy, generationCount = 1, promptVersion = PROMPT_VERSION, batchJobId } = params;

    const generationParams = {
      aiGenerated: true,
      source: "ai_content_factory",
      track: config.trackSlug,
      trackId: config.trackId,
      systemId: config.systemId,
      systemName: config.systemName,
      topicId: config.topicId,
      topicName: config.topicName,
      domainId: config.domainId,
      domainName: config.domainName,
      objective: config.objective,
      targetDifficulty: config.targetDifficulty,
      itemType: config.itemTypeSlug,
      generationCount,
      promptVersion,
    };

    const { data } = await supabase
      .from("ai_generation_audit")
      .insert({
        content_type: contentType,
        content_id: null,
        generation_params: generationParams,
        model_used: MODEL_USED,
        created_by: createdBy,
        outcome: "pending",
        ...(batchJobId && { batch_job_id: batchJobId }),
      })
      .select("id")
      .single();

    return data?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Update audit record when content is saved.
 */
export async function recordGenerationSaved(
  auditId: string,
  contentId: string
): Promise<boolean> {
  if (!isSupabaseServiceRoleConfigured()) return false;
  try {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("ai_generation_audit")
      .update({ content_id: contentId, outcome: "saved" })
      .eq("id", auditId);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Update audit record when user discards generated content.
 */
export async function recordGenerationDiscarded(auditId: string): Promise<boolean> {
  if (!isSupabaseServiceRoleConfigured()) return false;
  try {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("ai_generation_audit")
      .update({ outcome: "discarded" })
      .eq("id", auditId);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Record audit at save time (legacy flow - generate-and-save without preview).
 * Used when no preview step; we only have one record with outcome=saved.
 */
export async function recordGenerationAuditAtSave(
  params: RecordGenerationAuditParams & { contentId: string }
): Promise<string | null> {
  if (!isSupabaseServiceRoleConfigured()) return null;
  try {
    const supabase = createServiceClient();
    const { contentType, config, createdBy, generationCount = 1, promptVersion = PROMPT_VERSION, contentId } = params;

    const generationParams = {
      aiGenerated: true,
      source: "ai_content_factory",
      track: config.trackSlug,
      trackId: config.trackId,
      systemId: config.systemId,
      systemName: config.systemName,
      topicId: config.topicId,
      topicName: config.topicName,
      domainId: config.domainId,
      domainName: config.domainName,
      objective: config.objective,
      targetDifficulty: config.targetDifficulty,
      itemType: config.itemTypeSlug,
      generationCount,
      promptVersion,
    };

    const { data } = await supabase
      .from("ai_generation_audit")
      .insert({
        content_type: contentType,
        content_id: contentId,
        generation_params: generationParams,
        model_used: MODEL_USED,
        created_by: createdBy,
        outcome: "saved",
      })
      .select("id")
      .single();

    return data?.id ?? null;
  } catch {
    return null;
  }
}
