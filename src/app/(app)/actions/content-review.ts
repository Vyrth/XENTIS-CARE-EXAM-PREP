"use server";

import { revalidatePath } from "next/cache";
import { ADMIN_ROUTES } from "@/config/admin-routes";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";
import { canTransition } from "@/lib/admin/workflow";
import {
  addReviewNote,
  recordStageCheck,
  checkPublishGate,
  type ReviewLane,
} from "@/lib/admin/review-workflow";
import { checkSourceEvidenceGate } from "@/lib/admin/source-evidence";
import type { WorkflowStatus } from "@/types/admin";

const CONTENT_TABLES: Record<string, string> = {
  question: "questions",
  study_guide: "study_guides",
  video: "video_lessons",
  flashcard_deck: "flashcard_decks",
  high_yield_content: "high_yield_content",
};

const STATUS_COL = "status";

export interface TransitionResult {
  success: boolean;
  error?: string;
  blockPublishReason?: string;
}

/** Get publish gate status for an entity (for client-side display) */
export async function getPublishGateStatus(
  entityType: string,
  entityId: string
): Promise<{ canPublish: boolean; missingStages: string[] }> {
  const gate = await checkPublishGate(entityType, entityId);
  return { canPublish: gate.canPublish, missingStages: gate.missingStages };
}

/** Transition content status with optional review note.
 * bypassPublishGate: when true (auto-publish flow), skip review-stage and source-evidence gates. */
export async function transitionContentStatus(
  entityType: string,
  entityId: string,
  toStatus: WorkflowStatus,
  userId: string | null,
  note?: string,
  recordCheck?: ReviewLane,
  bypassPublishGate?: boolean
): Promise<TransitionResult> {
  if (!isSupabaseServiceRoleConfigured()) {
    return { success: false, error: "Not configured" };
  }

  const table = CONTENT_TABLES[entityType];
  if (!table) return { success: false, error: "Unknown content type" };

  const supabase = createServiceClient();
  const { data: row } = await supabase
    .from(table)
    .select(STATUS_COL)
    .eq("id", entityId)
    .single();

  if (!row) return { success: false, error: "Not found" };
  const fromStatus = row[STATUS_COL] as WorkflowStatus;

  if (!canTransition(fromStatus, toStatus)) {
    return { success: false, error: `Invalid transition: ${fromStatus} → ${toStatus}` };
  }

  if (toStatus === "published" && !bypassPublishGate) {
    const gate = await checkPublishGate(entityType, entityId);
    if (!gate.canPublish) {
      return {
        success: false,
        blockPublishReason: `Missing required approvals: ${gate.missingStages.join(", ")}`,
      };
    }
    const sourceGate = await checkSourceEvidenceGate(entityType, entityId);
    if (!sourceGate.canPublish) {
      return {
        success: false,
        blockPublishReason: sourceGate.reason ?? "Source evidence or legal clearance required",
      };
    }
  }

  const { error } = await supabase
    .from(table)
    .update({ [STATUS_COL]: toStatus, updated_at: new Date().toISOString() })
    .eq("id", entityId);

  if (error) {
    if (process.env.NODE_ENV !== "test") {
      console.warn("[content-review] status transition failed", {
        entityType,
        entityId,
        fromStatus,
        toStatus,
        error: error.message,
      });
    }
    return { success: false, error: error.message };
  }

  if (toStatus === "published") {
    if (process.env.NODE_ENV !== "test") {
      console.log("[content-review] published", { entityType, entityId });
    }
  }

  if (note) {
    await addReviewNote(
      entityType,
      entityId,
      userId,
      "system",
      note,
      "status_transition",
      fromStatus,
      toStatus
    );
  }

  if (recordCheck) {
    await recordStageCheck(entityType, entityId, recordCheck, userId, note);
  } else {
    const stageToRecord: ReviewLane | undefined =
      fromStatus === "editor_review" ? "editor" :
      fromStatus === "sme_review" ? "sme" :
      fromStatus === "legal_review" ? "legal" :
      fromStatus === "qa_review" ? "qa" : undefined;
    if (stageToRecord && (toStatus === "sme_review" || toStatus === "legal_review" || toStatus === "qa_review" || toStatus === "approved")) {
      await recordStageCheck(entityType, entityId, stageToRecord, userId, note);
    }
  }

  revalidatePath(ADMIN_ROUTES.REVIEW_QUEUE);
  revalidatePath(`${ADMIN_ROUTES.REVIEW_QUEUE}/[lane]`);
  revalidatePath(ADMIN_ROUTES.PUBLISH_QUEUE);
  revalidatePath(`${ADMIN_ROUTES.QUESTIONS}/${entityId}`);
  revalidatePath(`${ADMIN_ROUTES.STUDY_GUIDES}/${entityId}`);
  revalidatePath(`${ADMIN_ROUTES.VIDEOS}/${entityId}`);
  revalidatePath(`${ADMIN_ROUTES.FLASHCARDS}/${entityId}`);
  revalidatePath(`${ADMIN_ROUTES.HIGH_YIELD}/${entityId}`);

  // Revalidate learner pages and admin factory when content becomes published.
  // Use "layout" so nested routes (e.g. /questions/system/[slug], /study-guides/[id]) revalidate on next visit.
  if (toStatus === "published") {
    revalidatePath("/questions", "layout");
    revalidatePath("/study-guides", "layout");
    revalidatePath("/flashcards", "layout");
    revalidatePath("/videos", "layout");
    revalidatePath("/high-yield", "layout");
    revalidatePath("/dashboard");
    revalidatePath("/practice", "layout");
    revalidatePath("/topics", "layout");
    revalidatePath(ADMIN_ROUTES.AI_FACTORY);
  }

  return { success: true };
}

/** Add review note only */
export async function addContentReviewNote(
  entityType: string,
  entityId: string,
  userId: string | null,
  roleSlug: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  const r = await addReviewNote(entityType, entityId, userId, roleSlug, content);
  if (r.success) {
    revalidatePath(ADMIN_ROUTES.REVIEW_QUEUE);
    revalidatePath(`${ADMIN_ROUTES.QUESTIONS}/${entityId}`);
    revalidatePath(`${ADMIN_ROUTES.STUDY_GUIDES}/${entityId}`);
    revalidatePath(`${ADMIN_ROUTES.VIDEOS}/${entityId}`);
    revalidatePath(`${ADMIN_ROUTES.FLASHCARDS}/${entityId}`);
  }
  return r;
}

/** Record stage check (approve stage) */
export async function approveStage(
  entityType: string,
  entityId: string,
  stage: ReviewLane,
  userId: string | null,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  return recordStageCheck(entityType, entityId, stage, userId, notes);
}
