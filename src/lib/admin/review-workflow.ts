/**
 * Content Review Workflow - multi-lane pipeline, publish gating, required checks.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";
import type { WorkflowStatus } from "@/types/admin";

export type ReviewLane = "editor" | "sme" | "legal" | "qa";

export const LANE_TO_STATUS: Record<ReviewLane, WorkflowStatus> = {
  editor: "editor_review",
  sme: "sme_review",
  legal: "legal_review",
  qa: "qa_review",
};

export const STATUS_TO_LANE: Partial<Record<WorkflowStatus, ReviewLane>> = {
  editor_review: "editor",
  sme_review: "sme",
  legal_review: "legal",
  qa_review: "qa",
};

export const LANE_LABELS: Record<ReviewLane, string> = {
  editor: "Editorial",
  sme: "SME",
  legal: "Legal/Copyright",
  qa: "QA",
};

export const ROLE_TO_LANE: Record<string, ReviewLane> = {
  content_editor: "editor",
  super_admin: "editor",
  sme_reviewer: "sme",
  legal_reviewer: "legal",
  qa_reviewer: "qa",
};

export interface ReviewBacklogItem {
  id: string;
  type: string;
  title: string;
  examTrackId: string;
  examTrackSlug: string | null;
  status: WorkflowStatus;
  createdAt: string;
  /** AI generation source summary (if AI-generated) */
  aiGenerated?: boolean;
  aiSourceSummary?: string;
  /** Per-lane review flags (exception-only routing) */
  reviewFlags?: {
    requires_editorial_review: boolean;
    requires_sme_review: boolean;
    requires_legal_review: boolean;
    requires_qa_review: boolean;
  };
  /** Why this item was routed to review (for exception badges) */
  routingReason?: string | null;
}

export interface ReviewNoteRow {
  id: string;
  entityType: string;
  entityId: string;
  authorId: string | null;
  roleSlug: string;
  content: string;
  action: string | null;
  fromStatus: string | null;
  toStatus: string | null;
  createdAt: string;
}

export interface ReviewCheckRow {
  stageSlug: string;
  checkedAt: string;
  checkedBy: string | null;
  notes: string | null;
}

export interface PublishGateResult {
  canPublish: boolean;
  missingStages: string[];
  config: { requiresEditor: boolean; requiresSme: boolean; requiresLegal: boolean; requiresQa: boolean };
}

const CONTENT_TABLES: Record<string, { table: string; idCol: string; titleCol: string; trackCol: string }> = {
  question: { table: "questions", idCol: "id", titleCol: "stem", trackCol: "exam_track_id" },
  study_guide: { table: "study_guides", idCol: "id", titleCol: "title", trackCol: "exam_track_id" },
  video: { table: "video_lessons", idCol: "id", titleCol: "title", trackCol: "exam_track_id" },
  flashcard_deck: { table: "flashcard_decks", idCol: "id", titleCol: "name", trackCol: "exam_track_id" },
  high_yield_content: { table: "high_yield_content", idCol: "id", titleCol: "title", trackCol: "exam_track_id" },
};

async function safeQuery<T>(fn: () => Promise<T>): Promise<T> {
  try {
    if (!isSupabaseServiceRoleConfigured()) return [] as unknown as T;
    return await fn();
  } catch {
    return [] as unknown as T;
  }
}

/** Load review backlog for a lane (status) and optional track. Use statusOverride for needs_revision. */
export async function loadReviewBacklog(
  lane: ReviewLane | "needs_revision",
  trackId?: string | null
): Promise<ReviewBacklogItem[]> {
  return safeQuery(async () => {
    const status: WorkflowStatus =
      lane === "needs_revision" ? "needs_revision" : LANE_TO_STATUS[lane];
    const supabase = createServiceClient();
    const items: ReviewBacklogItem[] = [];

    for (const [type, cfg] of Object.entries(CONTENT_TABLES)) {
      const selectCols = `${cfg.idCol}, ${cfg.titleCol}, ${cfg.trackCol}, status, created_at, exam_tracks(slug)`;
      let q = supabase.from(cfg.table).select(selectCols)
        .eq("status", status);
      if (trackId) q = q.eq(cfg.trackCol, trackId);
      const { data } = await q.order("created_at", { ascending: false });
      const rows = (data ?? []) as unknown as Record<string, unknown>[];

      for (const r of rows) {
        const track = Array.isArray(r.exam_tracks) ? r.exam_tracks[0] : r.exam_tracks;
        items.push({
          id: r[cfg.idCol] as string,
          type,
          title: String(r[cfg.titleCol] ?? "").slice(0, 80),
          examTrackId: String(r[cfg.trackCol] ?? ""),
          examTrackSlug: (track as { slug?: string })?.slug ?? null,
          status: r.status as WorkflowStatus,
          createdAt: String(r.created_at ?? ""),
        });
      }
    }

    const sorted = items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const { loadAIGenerationBatch, buildGenerationSourceSummary } = await import("./ai-generation-lookup");
    const aiMap = await loadAIGenerationBatch(
      sorted.map((i) => ({ entityType: i.type, entityId: i.id }))
    );

    const byType = new Map<string, string[]>();
    for (const item of sorted) {
      const list = byType.get(item.type) ?? [];
      list.push(item.id);
      byType.set(item.type, list);
    }
    const metaByKey = new Map<string, { flags: ReviewBacklogItem["reviewFlags"]; routingReason: string | null }>();
    for (const [entityType, ids] of byType) {
      const { data: metaRows } = await supabase
        .from("content_quality_metadata")
        .select("entity_id, generation_metadata")
        .eq("entity_type", entityType)
        .in("entity_id", ids);
      for (const r of metaRows ?? []) {
        const gm = (r.generation_metadata as Record<string, unknown>) ?? {};
        const hasFlags =
          gm.requires_editorial_review != null ||
          gm.requires_sme_review != null ||
          gm.requires_legal_review != null ||
          gm.requires_qa_review != null;
        const routingReason = (gm.routing_reason ?? gm.routedToReviewReason) as string | null;
        if (hasFlags || routingReason) {
          metaByKey.set(`${entityType}-${r.entity_id}`, {
            flags: hasFlags
              ? {
                  requires_editorial_review: !!gm.requires_editorial_review,
                  requires_sme_review: !!gm.requires_sme_review,
                  requires_legal_review: !!gm.requires_legal_review,
                  requires_qa_review: !!gm.requires_qa_review,
                }
              : undefined,
            routingReason: routingReason ?? null,
          });
        }
      }
    }

    for (const item of sorted) {
      const rec = aiMap.get(`${item.type}-${item.id}`);
      if (rec) {
        item.aiGenerated = true;
        item.aiSourceSummary = buildGenerationSourceSummary(rec.generationParams);
      }
      const meta = metaByKey.get(`${item.type}-${item.id}`);
      if (meta) {
        if (meta.flags) item.reviewFlags = meta.flags;
        if (meta.routingReason != null) item.routingReason = meta.routingReason;
      }
    }

    return sorted;
  });
}

/** Load review notes for an entity */
export async function loadReviewNotes(
  entityType: string,
  entityId: string
): Promise<ReviewNoteRow[]> {
  return safeQuery(async () => {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("content_review_notes")
      .select("id, entity_type, entity_id, author_id, role_slug, content, action, from_status, to_status, created_at")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("created_at", { ascending: false });

    return (data ?? []).map((r) => ({
      id: r.id,
      entityType: r.entity_type,
      entityId: r.entity_id,
      authorId: r.author_id,
      roleSlug: r.role_slug,
      content: r.content,
      action: r.action,
      fromStatus: r.from_status,
      toStatus: r.to_status,
      createdAt: r.created_at,
    }));
  });
}

/** Load review checks for an entity */
export async function loadReviewChecks(
  entityType: string,
  entityId: string
): Promise<ReviewCheckRow[]> {
  return safeQuery(async () => {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("content_review_checks")
      .select("stage_slug, checked_at, checked_by, notes")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId);

    return (data ?? []).map((r) => ({
      stageSlug: r.stage_slug,
      checkedAt: r.checked_at,
      checkedBy: r.checked_by,
      notes: r.notes,
    }));
  });
}

/** Get content type review config */
export async function loadContentTypeReviewConfig(
  contentType: string
): Promise<{ requiresEditor: boolean; requiresSme: boolean; requiresLegal: boolean; requiresQa: boolean } | null> {
  try {
    if (!isSupabaseServiceRoleConfigured()) return null;
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("content_type_review_config")
      .select("requires_editor, requires_sme, requires_legal, requires_qa")
      .eq("content_type", contentType)
      .single();
    if (!data) return null;
    return {
      requiresEditor: data.requires_editor ?? true,
      requiresSme: data.requires_sme ?? true,
      requiresLegal: data.requires_legal ?? true,
      requiresQa: data.requires_qa ?? true,
    };
  } catch {
    return null;
  }
}

/** Check if entity can be published (all required stages approved) */
export async function checkPublishGate(
  entityType: string,
  entityId: string
): Promise<PublishGateResult> {
  const config = await loadContentTypeReviewConfig(entityType);
  if (!config) {
    return { canPublish: true, missingStages: [], config: { requiresEditor: true, requiresSme: true, requiresLegal: true, requiresQa: true } };
  }

  const checks = await loadReviewChecks(entityType, entityId);
  const checkedStages = new Set(checks.map((c) => c.stageSlug));

  const missingStages: string[] = [];
  if (config.requiresEditor && !checkedStages.has("editor")) missingStages.push("Editor");
  if (config.requiresSme && !checkedStages.has("sme")) missingStages.push("SME");
  if (config.requiresLegal && !checkedStages.has("legal")) missingStages.push("Legal");
  if (config.requiresQa && !checkedStages.has("qa")) missingStages.push("QA");

  return {
    canPublish: missingStages.length === 0,
    missingStages,
    config,
  };
}

/** Add review note */
export async function addReviewNote(
  entityType: string,
  entityId: string,
  authorId: string | null,
  roleSlug: string,
  content: string,
  action?: string,
  fromStatus?: string,
  toStatus?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    if (!isSupabaseServiceRoleConfigured()) {
      return { success: false, error: "Not configured" };
    }
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("content_review_notes")
      .insert({
        entity_type: entityType,
        entity_id: entityId,
        author_id: authorId,
        role_slug: roleSlug,
        content,
        action: action ?? null,
        from_status: fromStatus ?? null,
        to_status: toStatus ?? null,
      })
      .select("id")
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, id: data?.id };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/** Record stage check (approval) */
export async function recordStageCheck(
  entityType: string,
  entityId: string,
  stageSlug: string,
  checkedBy: string | null,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isSupabaseServiceRoleConfigured()) {
      return { success: false, error: "Not configured" };
    }
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("content_review_checks")
      .upsert(
        {
          entity_type: entityType,
          entity_id: entityId,
          stage_slug: stageSlug,
          checked_at: new Date().toISOString(),
          checked_by: checkedBy,
          notes: notes ?? null,
        },
        { onConflict: "entity_type,entity_id,stage_slug" }
      );

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}
