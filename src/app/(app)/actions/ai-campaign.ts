"use server";

import { withAdminAIGuard } from "@/lib/auth/admin-ai-guard";
import {
  launchCampaign,
  getCampaignSummary,
  pauseCampaign,
  resumeCampaign,
  cancelCampaign,
  retryFailedShards,
  retrySingleJob,
  LARGE_CAMPAIGN_TARGETS,
  SEEDING_CAMPAIGN_TARGETS,
  type CampaignTargets,
  type CampaignSummary,
} from "@/lib/ai/campaign-orchestrator";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";

export type { CampaignSummary, CampaignTargets };

export interface CampaignListItem {
  id: string;
  name: string;
  status: string;
  targetTotal: number;
  savedTotal: number;
  failedTotal: number;
  createdAt: string;
}

export interface CampaignJobRow {
  id: string;
  examTrackId: string;
  trackSlug?: string;
  trackName?: string;
  contentType: string;
  targetCount: number;
  completedCount: number;
  failedCount: number;
  generatedCount: number;
  skippedDuplicateCount: number;
  retryCount: number;
  jobRetryAttempt: number;
  status: string;
  errorMessage?: string | null;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
}

export interface LaunchCampaignInput {
  campaignName?: string;
  targetByTrackContent?: CampaignTargets;
  maxConcurrency?: number;
  modelName?: string;
  dryRun?: boolean;
}

export interface LaunchCampaignResult {
  success: boolean;
  campaignId?: string;
  shardCount?: number;
  targetTotal?: number;
  dryRun?: boolean;
  error?: string;
}

/** List recent campaigns */
export async function loadCampaignsAction(limit = 10): Promise<CampaignListItem[]> {
  const guard = await withAdminAIGuard();
  if (!guard.allowed) return [];
  if (!isSupabaseServiceRoleConfigured()) return [];
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("ai_campaigns")
      .select("id, name, status, target_total, saved_total, failed_total, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data ?? []).map((c) => ({
      id: c.id,
      name: c.name ?? "Campaign",
      status: c.status ?? "planned",
      targetTotal: c.target_total ?? 0,
      savedTotal: c.saved_total ?? 0,
      failedTotal: c.failed_total ?? 0,
      createdAt: c.created_at ?? "",
    }));
  } catch {
    return [];
  }
}

/** Load campaign summary (progress, counters, errors) */
export async function loadCampaignSummaryAction(campaignId: string): Promise<CampaignSummary | null> {
  const guard = await withAdminAIGuard();
  if (!guard.allowed) return null;
  return getCampaignSummary(campaignId);
}

/** Generate 24-hour launch plan (dry run, no generation) */
export async function generateLaunchPlanAction(input?: LaunchCampaignInput): Promise<LaunchCampaignResult> {
  const guard = await withAdminAIGuard();
  if (!guard.allowed) return { success: false, error: guard.error };
  return launchCampaign({
    campaignName: input?.campaignName ?? "24h Launch Plan",
    targetByTrackContent: input?.targetByTrackContent ?? {},
    maxConcurrency: input?.maxConcurrency ?? 4,
    modelName: input?.modelName ?? "gpt-4o-mini",
    dryRun: true,
    createdBy: guard.userId,
    idempotencyKey: `plan-${Date.now()}`,
  });
}

/** Launch campaign now (creates shards and starts processing) */
export async function launchCampaignNowAction(input?: LaunchCampaignInput): Promise<LaunchCampaignResult> {
  const guard = await withAdminAIGuard();
  if (!guard.allowed) return { success: false, error: guard.error };
  return launchCampaign({
    campaignName: input?.campaignName ?? "24h Campaign",
    targetByTrackContent: input?.targetByTrackContent ?? {},
    maxConcurrency: input?.maxConcurrency ?? 4,
    modelName: input?.modelName ?? "gpt-4o-mini",
    dryRun: false,
    createdBy: guard.userId,
    idempotencyKey: undefined,
  });
}

/** Launch autonomous content seeding: RN 2500, FNP 1500, PMHNP 1000, LVN 800 questions + guides, flashcards, high-yield */
export async function launchSeedingCampaignAction(): Promise<LaunchCampaignResult> {
  const guard = await withAdminAIGuard();
  if (!guard.allowed) return { success: false, error: guard.error };
  return launchCampaign({
    campaignName: "Autonomous Content Seeding",
    targetByTrackContent: SEEDING_CAMPAIGN_TARGETS,
    maxConcurrency: 4,
    modelName: "gpt-4o-mini",
    dryRun: false,
    createdBy: guard.userId,
    idempotencyKey: undefined,
  });
}

/** Launch 25k+ full campaign (questions + study guides + flashcards + high-yield across RN, FNP, PMHNP, LVN) */
export async function launchLargeCampaignAction(): Promise<LaunchCampaignResult> {
  const guard = await withAdminAIGuard();
  if (!guard.allowed) return { success: false, error: guard.error };
  return launchCampaign({
    campaignName: "25k+ Full Campaign",
    targetByTrackContent: LARGE_CAMPAIGN_TARGETS,
    maxConcurrency: 4,
    modelName: "gpt-4o-mini",
    dryRun: false,
    createdBy: guard.userId,
    idempotencyKey: undefined,
  });
}

/** Pause campaign */
export async function pauseCampaignAction(campaignId: string): Promise<{ success: boolean; error?: string }> {
  const guard = await withAdminAIGuard();
  if (!guard.allowed) return { success: false, error: guard.error };
  return pauseCampaign(campaignId);
}

/** Resume campaign */
export async function resumeCampaignAction(campaignId: string): Promise<{ success: boolean; error?: string }> {
  const guard = await withAdminAIGuard();
  if (!guard.allowed) return { success: false, error: guard.error };
  return resumeCampaign(campaignId);
}

/** Cancel campaign */
export async function cancelCampaignAction(campaignId: string): Promise<{ success: boolean; error?: string }> {
  const guard = await withAdminAIGuard();
  if (!guard.allowed) return { success: false, error: guard.error };
  return cancelCampaign(campaignId);
}

/** Retry failed shards (skips jobs at retry cap) */
export async function retryFailedShardsAction(
  campaignId: string
): Promise<{ success: boolean; count: number; skippedAtCap?: number; error?: string }> {
  const guard = await withAdminAIGuard();
  if (!guard.allowed) return { success: false, count: 0, error: guard.error };
  return retryFailedShards(campaignId);
}

/** Retry a single failed job by id */
export async function retrySingleJobAction(jobId: string): Promise<{ success: boolean; error?: string }> {
  const guard = await withAdminAIGuard();
  if (!guard.allowed) return { success: false, error: guard.error };
  return retrySingleJob(jobId);
}

/** Load campaign jobs (shards) for drilldown */
export async function loadCampaignJobsAction(
  campaignId: string,
  filters?: { trackId?: string; contentType?: string }
): Promise<CampaignJobRow[]> {
  const guard = await withAdminAIGuard();
  if (!guard.allowed) return [];
  if (!isSupabaseServiceRoleConfigured()) return [];
  try {
    const supabase = createServiceClient();
    let query = supabase
      .from("ai_batch_jobs")
      .select("id, exam_track_id, content_type, target_count, completed_count, failed_count, generated_count, skipped_duplicate_count, retry_count, job_retry_attempt, status, error_message, created_at, started_at, completed_at")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false });

    if (filters?.trackId) query = query.eq("exam_track_id", filters.trackId);
    if (filters?.contentType) query = query.eq("content_type", filters.contentType);

    const { data: jobs } = await query;
    if (!jobs?.length) return [];

    const trackIds = [...new Set(jobs.map((j) => j.exam_track_id))];
    const { data: tracks } = await supabase.from("exam_tracks").select("id, slug, name").in("id", trackIds);
    const trackMap = new Map((tracks ?? []).map((t) => [t.id, t]));

    return jobs.map((j) => {
      const track = trackMap.get(j.exam_track_id);
      return {
        id: j.id,
        examTrackId: j.exam_track_id,
        trackSlug: track?.slug,
        trackName: track?.name,
        contentType: j.content_type ?? "",
        targetCount: j.target_count ?? 0,
        completedCount: j.completed_count ?? 0,
        failedCount: j.failed_count ?? 0,
        generatedCount: j.generated_count ?? 0,
        skippedDuplicateCount: j.skipped_duplicate_count ?? 0,
        retryCount: j.retry_count ?? 0,
        jobRetryAttempt: (j as { job_retry_attempt?: number }).job_retry_attempt ?? 0,
        status: j.status ?? "pending",
        errorMessage: (j as { error_message?: string }).error_message,
        createdAt: j.created_at ?? "",
        startedAt: j.started_at,
        completedAt: j.completed_at,
      };
    });
  } catch {
    return [];
  }
}
