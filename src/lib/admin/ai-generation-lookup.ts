/**
 * AI Generation Lookup - check if content was AI-generated and get source summary.
 * Used for review queue badges and admin detail panels.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";

/** Map review entity type to ai_generation_audit content_type(s) */
const ENTITY_TO_AUDIT_TYPES: Record<string, string[]> = {
  question: ["question"],
  study_guide: ["study_guide"],
  flashcard_deck: ["flashcard_deck"],
  high_yield_content: [
    "high_yield_summary",
    "common_confusion",
    "board_trap",
    "compare_contrast_summary",
  ],
};

export interface AIGenerationRecord {
  id: string;
  contentType: string;
  generationParams: Record<string, unknown>;
  modelUsed: string;
  generatedAt: string;
  createdBy: string | null;
}

/** Build a safe, short summary from generation params (no full prompts) */
export function buildGenerationSourceSummary(params: Record<string, unknown>): string {
  const parts: string[] = [];
  const track = params.track as string | undefined;
  if (track) parts.push(track.toUpperCase());
  const system = params.systemName as string | undefined;
  if (system) parts.push(system);
  const topic = params.topicName as string | undefined;
  if (topic) parts.push(topic);
  const objective = params.objective as string | undefined;
  if (objective && objective.length < 50) parts.push(objective);
  else if (objective) parts.push(objective.slice(0, 47) + "...");
  return parts.length > 0 ? parts.join(" · ") : "AI Content Factory";
}

/** Load AI generation audit record for content (if any) */
export async function loadAIGenerationForContent(
  entityType: string,
  entityId: string
): Promise<AIGenerationRecord | null> {
  if (!isSupabaseServiceRoleConfigured()) return null;
  try {
    const auditTypes = ENTITY_TO_AUDIT_TYPES[entityType];
    if (!auditTypes?.length) return null;

    const supabase = createServiceClient();
    const { data } = await supabase
      .from("ai_generation_audit")
      .select("id, content_type, generation_params, model_used, generated_at, created_by")
      .eq("content_id", entityId)
      .in("content_type", auditTypes)
      .eq("outcome", "saved")
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) return null;
    return {
      id: data.id,
      contentType: data.content_type,
      generationParams: (data.generation_params as Record<string, unknown>) ?? {},
      modelUsed: data.model_used ?? "",
      generatedAt: data.generated_at ?? "",
      createdBy: data.created_by,
    };
  } catch {
    return null;
  }
}

/** Batch load AI generation for multiple content items. Returns Map<entityType-entityId, record> */
export async function loadAIGenerationBatch(
  items: { entityType: string; entityId: string }[]
): Promise<Map<string, AIGenerationRecord>> {
  const result = new Map<string, AIGenerationRecord>();
  if (!isSupabaseServiceRoleConfigured() || items.length === 0) return result;

  try {
    const supabase = createServiceClient();
    const contentIds = [...new Set(items.map((i) => i.entityId))];

    const { data: rows } = await supabase
      .from("ai_generation_audit")
      .select("id, content_type, content_id, generation_params, model_used, generated_at, created_by")
      .in("content_id", contentIds)
      .eq("outcome", "saved")
      .order("generated_at", { ascending: false });

    if (!rows?.length) return result;

    const byContentId = new Map<string, (typeof rows)[0]>();
    for (const r of rows) {
      if (r.content_id && !byContentId.has(r.content_id)) {
        byContentId.set(r.content_id, r);
      }
    }

    for (const item of items) {
      const r = byContentId.get(item.entityId);
      if (!r) continue;
      const auditTypes = ENTITY_TO_AUDIT_TYPES[item.entityType];
      if (!auditTypes?.includes(r.content_type)) continue;

      result.set(`${item.entityType}-${item.entityId}`, {
        id: r.id,
        contentType: r.content_type,
        generationParams: (r.generation_params as Record<string, unknown>) ?? {},
        modelUsed: r.model_used ?? "",
        generatedAt: r.generated_at ?? "",
        createdBy: r.created_by,
      });
    }
  } catch {
    // ignore
  }
  return result;
}
