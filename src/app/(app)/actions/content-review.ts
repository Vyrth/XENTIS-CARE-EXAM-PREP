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
import { DUPLICATE_SIMILARITY_MAX } from "@/config/ai-factory";
import type { WorkflowStatus } from "@/types/admin";

const MIN_QUALITY_FOR_PUBLISH = 70;

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

export type PublishBlockerType =
  | "legal_status"
  | "review_lane"
  | "duplicate_risk"
  | "schema"
  | "quality";

export interface PublishBlocker {
  type: PublishBlockerType;
  message: string;
}

export interface QuestionPublishEligibilityResult {
  canPublish: boolean;
  currentStatus: WorkflowStatus;
  canTransitionToPublished: boolean;
  blockers: PublishBlocker[];
}

/** Full publish eligibility for question detail page: gates + quality metadata blockers. */
export async function getQuestionPublishEligibility(
  questionId: string
): Promise<QuestionPublishEligibilityResult | null> {
  if (!isSupabaseServiceRoleConfigured()) return null;

  const supabase = createServiceClient();
  const { data: row } = await supabase
    .from("questions")
    .select("status")
    .eq("id", questionId)
    .single();

  if (!row) return null;
  const currentStatus = row.status as WorkflowStatus;
  const canTransitionToPublished = canTransition(currentStatus, "published");

  const blockers: PublishBlocker[] = [];

  const gate = await checkPublishGate("question", questionId);
  if (!gate.canPublish && gate.missingStages.length) {
    for (const stage of gate.missingStages) {
      blockers.push({ type: "review_lane", message: `Missing required approval: ${stage}` });
    }
  }

  const sourceGate = await checkSourceEvidenceGate("question", questionId);
  if (!sourceGate.canPublish && sourceGate.reason) {
    blockers.push({ type: "legal_status", message: sourceGate.reason });
  }

  const { data: meta } = await supabase
    .from("content_quality_metadata")
    .select("validation_status, validation_errors, quality_score, generation_metadata")
    .eq("entity_type", "question")
    .eq("entity_id", questionId)
    .single();

  if (meta) {
    const validationStatus = (meta.validation_status as string) ?? "";
    const validationErrors = (meta.validation_errors as unknown[]) ?? [];
    if (
      validationStatus === "schema_invalid" ||
      validationStatus === "validation_failed" ||
      (Array.isArray(validationErrors) && validationErrors.length > 0)
    ) {
      const msg =
        validationStatus === "schema_invalid"
          ? "Schema invalid"
          : validationStatus === "validation_failed"
            ? "Validation failed"
            : validationErrors.slice(0, 3).map((e) => String(e)).join("; ");
      blockers.push({ type: "schema", message: msg });
    }

    const qualityScore = Number(meta.quality_score ?? 0);
    if (qualityScore > 0 && qualityScore < MIN_QUALITY_FOR_PUBLISH) {
      blockers.push({
        type: "quality",
        message: `Quality score ${qualityScore} below threshold (${MIN_QUALITY_FOR_PUBLISH})`,
      });
    }

    const genMeta = (meta.generation_metadata as Record<string, unknown>) ?? {};
    const stemSim = Number(genMeta.stem_similarity ?? 0);
    const payloadSim = Number(genMeta.payload_similarity ?? 0);
    const maxSim = Math.max(stemSim, payloadSim);
    if (maxSim >= DUPLICATE_SIMILARITY_MAX) {
      blockers.push({
        type: "duplicate_risk",
        message: `Similarity to existing content (${(maxSim * 100).toFixed(0)}%) at or above duplicate threshold`,
      });
    }
  }

  const canPublish =
    canTransitionToPublished && blockers.length === 0;

  return {
    canPublish,
    currentStatus,
    canTransitionToPublished,
    blockers,
  };
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

  if (toStatus === "published" && fromStatus === "editor_review" && !bypassPublishGate) {
    await recordStageCheck(entityType, entityId, "editor", userId, note ?? "Editor sign-off");
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
