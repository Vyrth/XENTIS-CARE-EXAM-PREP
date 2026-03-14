/**
 * Content Source Evidence - copyright/source tracking and legal publish gating.
 * Legal metadata is internal-only; never exposed to learner-facing APIs.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";

export type SourceBasis = "original" | "licensed" | "internal" | "pending";
export type LegalStatus = "original" | "adapted" | "pending_legal" | "blocked";

export interface ContentSourceEvidence {
  id: string;
  contentType: string;
  contentId: string;
  sourceBasis: SourceBasis;
  legalStatus: LegalStatus;
  legalNotes: string | null;
  mediaRightsId: string | null;
  authorNotes: string | null;
}

export interface ContentSourceLink {
  id: string;
  sourceId: string;
  sourceName: string;
  sourceType: string | null;
  excerpt: string | null;
}

export interface SourceEvidenceGateResult {
  canPublish: boolean;
  reason?: string;
  missingEvidence: boolean;
  legalBlocked: boolean;
}

const LEGAL_CLEARED: LegalStatus[] = ["original", "adapted"];
const SOURCE_BASIS_SET: SourceBasis[] = ["original", "licensed", "internal"];

async function safeQuery<T>(fn: () => Promise<T>): Promise<T> {
  try {
    if (!isSupabaseServiceRoleConfigured()) return null as T;
    return await fn();
  } catch {
    return null as T;
  }
}

/** Auto-create source evidence for admin-created content. Enables publish without manual source panel. */
export async function ensureSourceEvidenceForAdminContent(
  contentType: string,
  contentId: string
): Promise<void> {
  try {
    if (!isSupabaseServiceRoleConfigured()) return;
    const supabase = createServiceClient();
    await supabase.from("content_source_evidence").upsert(
      {
        content_type: contentType,
        content_id: contentId,
        source_basis: "original",
        legal_status: "original",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "content_type,content_id" }
    );
  } catch {
    /* non-fatal; admin can add manually */
  }
}

/** AI-generated original content from approved internal evidence maps. Auto-cleared legal; no manual review. */
export const AI_ORIGINAL_AUTHOR_NOTES =
  "AI-generated educational content derived from approved framework and internal source governance.";

export async function ensureSourceEvidenceForAIGeneratedContent(
  contentType: string,
  contentId: string
): Promise<void> {
  try {
    if (!isSupabaseServiceRoleConfigured()) return;
    const supabase = createServiceClient();
    await supabase.from("content_source_evidence").upsert(
      {
        content_type: contentType,
        content_id: contentId,
        source_basis: "internal",
        legal_status: "original",
        author_notes: AI_ORIGINAL_AUTHOR_NOTES,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "content_type,content_id" }
    );
  } catch {
    /* non-fatal */
  }
}

/** Load source evidence for an entity */
export async function loadSourceEvidence(
  contentType: string,
  contentId: string
): Promise<ContentSourceEvidence | null> {
  return safeQuery(async () => {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("content_source_evidence")
      .select("*")
      .eq("content_type", contentType)
      .eq("content_id", contentId)
      .single();

    if (!data) return null;
    return {
      id: data.id,
      contentType: data.content_type,
      contentId: data.content_id,
      sourceBasis: (data.source_basis as SourceBasis) ?? "pending",
      legalStatus: (data.legal_status as LegalStatus) ?? "pending_legal",
      legalNotes: data.legal_notes ?? null,
      mediaRightsId: data.media_rights_id ?? null,
      authorNotes: data.author_notes ?? null,
    };
  });
}

/** Load linked content sources for an entity */
export async function loadContentSourceLinks(
  contentType: string,
  contentId: string
): Promise<ContentSourceLink[]> {
  return safeQuery(async () => {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("content_source_links")
      .select("id, content_source_id, excerpt, content_sources(id, name, source_type)")
      .eq("content_type", contentType)
      .eq("content_id", contentId);

    return (data ?? []).map((r) => {
      const src = Array.isArray(r.content_sources) ? r.content_sources[0] : r.content_sources;
      return {
        id: r.id,
        sourceId: r.content_source_id,
        sourceName: (src as { name?: string })?.name ?? "",
        sourceType: (src as { source_type?: string })?.source_type ?? null,
        excerpt: r.excerpt ?? null,
      };
    });
  });
}

/** Load content type source config */
export async function loadContentTypeSourceConfig(
  contentType: string
): Promise<{ requiresSourceEvidence: boolean; requiresLegalClearance: boolean } | null> {
  return safeQuery(async () => {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("content_type_source_config")
      .select("requires_source_evidence, requires_legal_clearance")
      .eq("content_type", contentType)
      .single();

    if (!data) return null;
    return {
      requiresSourceEvidence: data.requires_source_evidence ?? true,
      requiresLegalClearance: data.requires_legal_clearance ?? true,
    };
  });
}

/** Check if content can be published based on source evidence */
export async function checkSourceEvidenceGate(
  contentType: string,
  contentId: string
): Promise<SourceEvidenceGateResult> {
  const config = await loadContentTypeSourceConfig(contentType);
  if (!config) {
    return { canPublish: true, missingEvidence: false, legalBlocked: false };
  }

  const evidence = await loadSourceEvidence(contentType, contentId);

  if (config.requiresSourceEvidence && !evidence) {
    return {
      canPublish: false,
      reason: "Source evidence required before publishing",
      missingEvidence: true,
      legalBlocked: false,
    };
  }

  if (config.requiresSourceEvidence && evidence && !SOURCE_BASIS_SET.includes(evidence.sourceBasis)) {
    return {
      canPublish: false,
      reason: "Source basis must be set (original, licensed, or internal)",
      missingEvidence: true,
      legalBlocked: false,
    };
  }

  if (config.requiresLegalClearance && evidence && evidence.legalStatus === "blocked") {
    return {
      canPublish: false,
      reason: "Content is blocked for legal reasons",
      missingEvidence: false,
      legalBlocked: true,
    };
  }

  if (config.requiresLegalClearance && evidence && evidence.legalStatus === "pending_legal") {
    return {
      canPublish: false,
      reason: "Pending legal review",
      missingEvidence: false,
      legalBlocked: true,
    };
  }

  return {
    canPublish: true,
    missingEvidence: false,
    legalBlocked: false,
  };
}
