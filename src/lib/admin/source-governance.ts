/**
 * Evidence Source Governance for AI Factory.
 * - Approved sources per track (RN, LVN, FNP, PMHNP)
 * - Validate generation outputs use only approved sources
 * - Require source mapping before auto-publish
 */

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";

export interface ApprovedEvidenceSource {
  id: string;
  slug: string;
  name: string;
  sourceType: string;
  evidenceTier: number;
}

export interface ContentEvidenceMetadata {
  sourceFrameworkId: string | null;
  primaryReferenceId: string | null;
  guidelineReferenceId: string | null;
  evidenceTier: number | null;
  sourceSlugs: string[];
}

/** Get approved evidence source slugs for a track */
export async function getApprovedSourceSlugsForTrack(
  trackSlug: string
): Promise<string[]> {
  if (!isSupabaseServiceRoleConfigured()) return [];
  const supabase = createServiceClient();
  const { data: track } = await supabase
    .from("exam_tracks")
    .select("id")
    .eq("slug", trackSlug)
    .single();
  if (!track) return [];

  const { data: links } = await supabase
    .from("approved_evidence_sources_track")
    .select("approved_evidence_source_id")
    .eq("exam_track_id", track.id);

  if (!links?.length) return [];
  const ids = links.map((l) => l.approved_evidence_source_id).filter(Boolean);
  const { data: sources } = await supabase
    .from("approved_evidence_sources")
    .select("slug")
    .in("id", ids);
  return (sources ?? []).map((s) => s.slug).filter(Boolean);
}

/** Get full approved sources for a track (for prompts) */
export async function getApprovedSourcesForTrack(
  trackSlug: string
): Promise<ApprovedEvidenceSource[]> {
  if (!isSupabaseServiceRoleConfigured()) return [];
  const supabase = createServiceClient();
  const { data: track } = await supabase
    .from("exam_tracks")
    .select("id")
    .eq("slug", trackSlug)
    .single();
  if (!track) return [];

  const { data: links } = await supabase
    .from("approved_evidence_sources_track")
    .select("approved_evidence_source_id")
    .eq("exam_track_id", track.id);

  if (!links?.length) return [];
  const ids = links.map((l) => l.approved_evidence_source_id).filter(Boolean);
  const { data: rows } = await supabase
    .from("approved_evidence_sources")
    .select("id, slug, name, source_type, evidence_tier")
    .in("id", ids);

  return (rows ?? []).map((s) => ({
    id: s.id,
    slug: s.slug,
    name: s.name ?? s.slug,
    sourceType: s.source_type ?? "textbook",
    evidenceTier: Number(s.evidence_tier ?? 2),
  }));
}

/** Build approved-sources block for AI prompts */
export async function buildApprovedSourcesPromptBlock(
  trackSlug: string
): Promise<string> {
  const sources = await getApprovedSourcesForTrack(trackSlug);
  if (sources.length === 0) return "";

  const byTier = new Map<number, string[]>();
  for (const s of sources) {
    const list = byTier.get(s.evidenceTier) ?? [];
    list.push(`${s.name} (${s.slug})`);
    byTier.set(s.evidenceTier, list);
  }

  const lines: string[] = [
    "EVIDENCE SOURCE REQUIREMENTS — Use ONLY these approved sources. Content must cite at least one.",
    "Tier 1 (Test plans): " + (byTier.get(1) ?? []).join("; "),
    "Tier 2 (Textbooks/handbooks): " + (byTier.get(2) ?? []).join("; "),
    "Tier 3 (Guidelines): " + (byTier.get(3) ?? []).join("; "),
    "Include in your JSON: primary_reference (slug), guideline_reference (slug, optional), evidence_tier (1-3).",
  ];
  return lines.join("\n");
}

/** Validate that source slugs are approved for the track */
export async function validateSourceSlugsForTrack(
  trackSlug: string,
  slugs: string[]
): Promise<{ valid: boolean; invalidSlugs: string[] }> {
  const approved = await getApprovedSourceSlugsForTrack(trackSlug);
  const approvedSet = new Set(approved);
  const invalidSlugs = slugs.filter((s) => s && !approvedSet.has(s));
  return {
    valid: invalidSlugs.length === 0,
    invalidSlugs,
  };
}

/** Check if content has valid source mapping (required for auto-publish) */
export async function hasValidSourceMapping(
  entityType: string,
  entityId: string,
  trackSlug: string
): Promise<{ valid: boolean; reason?: string }> {
  if (!isSupabaseServiceRoleConfigured()) {
    return { valid: false, reason: "Service not configured" };
  }
  const supabase = createServiceClient();

  const { data: meta } = await supabase
    .from("content_evidence_metadata")
    .select("source_framework_id, primary_reference_id, source_slugs")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .single();

  if (!meta) {
    return { valid: false, reason: "No evidence metadata" };
  }

  const hasPrimary = !!meta.primary_reference_id;
  const slugs = (meta.source_slugs as string[] | null) ?? [];
  const hasSlugs = slugs.length > 0;

  if (!hasPrimary && !hasSlugs) {
    return { valid: false, reason: "Missing primary_reference or source_slugs" };
  }

  if (hasSlugs) {
    const check = await validateSourceSlugsForTrack(trackSlug, slugs);
    if (!check.valid) {
      return {
        valid: false,
        reason: `Unapproved sources: ${check.invalidSlugs.join(", ")}`,
      };
    }
  }

  return { valid: true };
}

/** Upsert content_evidence_metadata */
export async function upsertContentEvidenceMetadata(
  entityType: string,
  entityId: string,
  data: {
    sourceFrameworkId?: string | null;
    primaryReferenceId?: string | null;
    guidelineReferenceId?: string | null;
    evidenceTier?: number | null;
    sourceSlugs?: string[];
  }
): Promise<void> {
  if (!isSupabaseServiceRoleConfigured()) return;
  const supabase = createServiceClient();
  await supabase.from("content_evidence_metadata").upsert(
    {
      entity_type: entityType,
      entity_id: entityId,
      source_framework_id: data.sourceFrameworkId ?? null,
      primary_reference_id: data.primaryReferenceId ?? null,
      guideline_reference_id: data.guidelineReferenceId ?? null,
      evidence_tier: data.evidenceTier ?? null,
      source_slugs: (data.sourceSlugs ?? []) as unknown,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "entity_type,entity_id" }
  );
}

/** Resolve approved_evidence_sources id by slug */
export async function getApprovedSourceIdBySlug(
  slug: string
): Promise<string | null> {
  if (!isSupabaseServiceRoleConfigured()) return null;
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("approved_evidence_sources")
    .select("id")
    .eq("slug", slug)
    .single();
  return data?.id ?? null;
}

/** Get content evidence metadata for admin UI */
export async function getContentEvidenceMetadata(
  entityType: string,
  entityId: string
): Promise<ContentEvidenceMetadata | null> {
  if (!isSupabaseServiceRoleConfigured()) return null;
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("content_evidence_metadata")
    .select(`
      source_framework_id,
      primary_reference_id,
      guideline_reference_id,
      evidence_tier,
      source_slugs
    `)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .single();

  if (!data) return null;
  return {
    sourceFrameworkId: data.source_framework_id,
    primaryReferenceId: data.primary_reference_id,
    guidelineReferenceId: data.guideline_reference_id,
    evidenceTier: data.evidence_tier ?? null,
    sourceSlugs: (data.source_slugs as string[]) ?? [],
  };
}
