/**
 * Load content_evidence_metadata with resolved source names for admin UI.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";
import type { ContentEvidenceMetadata } from "./source-governance";

export interface ContentEvidenceMetadataWithNames extends ContentEvidenceMetadata {
  sourceFrameworkName?: string | null;
  primarySourceName?: string | null;
  guidelineSourceName?: string | null;
}

export async function loadContentEvidenceMetadataWithNames(
  entityType: string,
  entityId: string
): Promise<ContentEvidenceMetadataWithNames | null> {
  if (!isSupabaseServiceRoleConfigured()) return null;
  const supabase = createServiceClient();

  const { data: meta } = await supabase
    .from("content_evidence_metadata")
    .select(
      "source_framework_id, primary_reference_id, guideline_reference_id, evidence_tier, source_slugs"
    )
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .single();

  if (!meta) return null;

  const result: ContentEvidenceMetadataWithNames = {
    sourceFrameworkId: meta.source_framework_id,
    primaryReferenceId: meta.primary_reference_id,
    guidelineReferenceId: meta.guideline_reference_id,
    evidenceTier: meta.evidence_tier ?? null,
    sourceSlugs: (meta.source_slugs as string[]) ?? [],
  };

  const ids = [
    meta.source_framework_id,
    meta.primary_reference_id,
    meta.guideline_reference_id,
  ].filter(Boolean) as string[];

  if (ids.length > 0) {
    const { data: frameworks } = await supabase
      .from("source_frameworks")
      .select("id, name")
      .in("id", ids);
    const { data: sources } = await supabase
      .from("approved_evidence_sources")
      .select("id, name")
      .in("id", ids);

    const byId = new Map<string, string>();
    for (const f of frameworks ?? []) byId.set(f.id, f.name);
    for (const s of sources ?? []) byId.set(s.id, s.name);

    result.sourceFrameworkName = meta.source_framework_id
      ? byId.get(meta.source_framework_id) ?? null
      : null;
    result.primarySourceName = meta.primary_reference_id
      ? byId.get(meta.primary_reference_id) ?? null
      : null;
    result.guidelineSourceName = meta.guideline_reference_id
      ? byId.get(meta.guideline_reference_id) ?? null
      : null;
  }

  return result;
}
