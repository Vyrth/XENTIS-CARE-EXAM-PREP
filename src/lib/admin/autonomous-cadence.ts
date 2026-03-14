/**
 * Autonomous Generation Cadence - recurring gap-based content generation.
 *
 * - Reads cadence config from autonomous_settings
 * - Builds generation plan from roadmap coverage gaps
 * - Launches campaigns respecting per-track and per-content-type caps
 * - Idempotent, safe, no duplicate overlapping campaigns
 */

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";
import { loadRoadmapCoverageGaps } from "./roadmap-coverage-loaders";
import { getApprovedSourceSlugsForTrack } from "./source-governance";
import {
  launchCampaign,
  getActiveAutonomousCampaignStatus,
  markStaleAutonomousCampaignsAsFailed,
  type ActiveAutonomousCampaignStatus,
} from "@/lib/ai/campaign-orchestrator";
import type { CampaignTargets } from "@/lib/ai/campaign-orchestrator";
import type { SystemCoverageGap, TopicCoverageGap } from "./roadmap-coverage-loaders";

export const CONTENT_TYPES = ["question", "study_guide", "flashcard_deck", "high_yield_content"] as const;
export type AutonomousContentType = (typeof CONTENT_TYPES)[number];

export interface PerContentTypeCaps {
  perRunPerTrack: number;
  dailyPerTrack: Record<string, number>;
}

export interface AutonomousGenerationCadence {
  enabled: boolean;
  paused: boolean;
  gapAnalysisIntervalHours: number;
  generationIntervalHours: number;
  maxJobsPerRun: number;
  maxItemsPerRun: number;
  priorityOrder: AutonomousContentType[];
  trackEnabled: Record<string, boolean>;
  contentTypeCaps: Record<AutonomousContentType, PerContentTypeCaps>;
  contentTypeEnabled: Record<AutonomousContentType, boolean>;
}

export interface AutonomousRunLog {
  lastRunAt: string | null;
  lastRunSummary: Record<string, unknown> | null;
  nextRunWindow: string | null;
  lastRunMode: "dry-run" | "real" | null;
}

const DEFAULT_CADENCE: AutonomousGenerationCadence = {
  enabled: true,
  paused: false,
  gapAnalysisIntervalHours: 6,
  generationIntervalHours: 12,
  maxJobsPerRun: 20,
  maxItemsPerRun: 500,
  priorityOrder: ["question", "study_guide", "flashcard_deck", "high_yield_content"],
  trackEnabled: { rn: true, fnp: true, pmhnp: true, lvn: true },
  contentTypeCaps: {
    question: { perRunPerTrack: 100, dailyPerTrack: { rn: 200, fnp: 150, pmhnp: 100, lvn: 150 } },
    study_guide: { perRunPerTrack: 5, dailyPerTrack: { rn: 10, fnp: 8, pmhnp: 6, lvn: 8 } },
    flashcard_deck: { perRunPerTrack: 5, dailyPerTrack: { rn: 10, fnp: 8, pmhnp: 6, lvn: 8 } },
    high_yield_content: { perRunPerTrack: 10, dailyPerTrack: { rn: 20, fnp: 15, pmhnp: 12, lvn: 15 } },
  },
  contentTypeEnabled: { question: true, study_guide: true, flashcard_deck: true, high_yield_content: true },
};

const TRACK_SLUGS = ["rn", "fnp", "pmhnp", "lvn"] as const;

/** Map our content types to campaign target keys */
const CONTENT_TO_CAMPAIGN: Record<AutonomousContentType, keyof CampaignTargets> = {
  question: "question",
  study_guide: "study_guide",
  flashcard_deck: "flashcard_deck",
  high_yield_content: "high_yield_summary",
};

/** Load cadence config from autonomous_settings. Fallback: autonomous_generation_cadence then cadence. */
export async function getCadenceConfig(): Promise<AutonomousGenerationCadence> {
  if (!isSupabaseServiceRoleConfigured()) return DEFAULT_CADENCE;
  const supabase = createServiceClient();
  const { data: primary } = await supabase
    .from("autonomous_settings")
    .select("value_json")
    .eq("key", "autonomous_generation_cadence")
    .single();
  let raw = primary?.value_json as Partial<AutonomousGenerationCadence> | null;
  if (!raw) {
    const { data: fallback } = await supabase
      .from("autonomous_settings")
      .select("value_json")
      .eq("key", "cadence")
      .single();
    raw = fallback?.value_json as Partial<AutonomousGenerationCadence> | null;
  }
  if (!raw) return DEFAULT_CADENCE;
  return {
    ...DEFAULT_CADENCE,
    ...raw,
    priorityOrder: raw.priorityOrder ?? DEFAULT_CADENCE.priorityOrder,
    trackEnabled: { ...DEFAULT_CADENCE.trackEnabled, ...raw.trackEnabled },
    contentTypeCaps: { ...DEFAULT_CADENCE.contentTypeCaps, ...raw.contentTypeCaps },
    contentTypeEnabled: { ...DEFAULT_CADENCE.contentTypeEnabled, ...raw.contentTypeEnabled },
  };
}

/** Load run log from autonomous_settings */
export async function getRunLog(): Promise<AutonomousRunLog> {
  if (!isSupabaseServiceRoleConfigured()) {
    return { lastRunAt: null, lastRunSummary: null, nextRunWindow: null, lastRunMode: null };
  }
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("autonomous_settings")
    .select("value_json")
    .eq("key", "autonomous_run_log")
    .single();
  const raw = data?.value_json as Partial<AutonomousRunLog> | null;
  return {
    lastRunAt: raw?.lastRunAt ?? null,
    lastRunSummary: raw?.lastRunSummary ?? null,
    nextRunWindow: raw?.nextRunWindow ?? null,
    lastRunMode: raw?.lastRunMode ?? null,
  };
}

/** Update run log */
async function setRunLog(log: Partial<AutonomousRunLog>): Promise<void> {
  if (!isSupabaseServiceRoleConfigured()) return;
  const supabase = createServiceClient();
  const current = await getRunLog();
  const merged = { ...current, ...log };
  await supabase
    .from("autonomous_settings")
    .upsert(
      { key: "autonomous_run_log", value_json: merged, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
}

/** Check for active autonomous campaign. Marks stale campaigns as failed. Returns status if healthy active campaign blocks launch. */
async function checkActiveAutonomousCampaign(): Promise<{
  blocksLaunch: boolean;
  diagnostic: ActiveAutonomousCampaignStatus | null;
}> {
  const status = await getActiveAutonomousCampaignStatus();
  if (!status) return { blocksLaunch: false, diagnostic: null };
  if (status.isStale) {
    const marked = await markStaleAutonomousCampaignsAsFailed();
    if (marked > 0) {
      logAutonomous({ phase: "stale-cleanup", campaignId: status.campaignId, reason: status.staleReason });
    }
    return { blocksLaunch: false, diagnostic: { ...status, isStale: true, staleReason: status.staleReason } };
  }
  return { blocksLaunch: true, diagnostic: status };
}

/** Build generation plan from gaps. Returns CampaignTargets capped by config. */
export async function buildGapGenerationPlan(
  cadence: AutonomousGenerationCadence
): Promise<{ targets: CampaignTargets; plan: GenerationPlanItem[]; skippedReasons: string[] }> {
  const skippedReasons: string[] = [];
  const targets: CampaignTargets = {};
  const plan: GenerationPlanItem[] = [];

  const gaps = await loadRoadmapCoverageGaps(5, 10);
  if (!gaps.length) {
    skippedReasons.push("No tracks or taxonomy seeded (no exam_tracks or systems)");
    logAutonomous({ phase: "buildGapPlan", outcome: "skip", reason: "no_gaps", skippedReasons });
    return { targets, plan, skippedReasons };
  }

  const hasAnySystems = gaps.some((g) => (g.lowestSystems ?? []).length > 0);
  if (!hasAnySystems) {
    skippedReasons.push("No systems found for any track");
    logAutonomous({ phase: "buildGapPlan", outcome: "skip", reason: "no_systems", skippedReasons });
    return { targets, plan, skippedReasons };
  }

  for (const contentType of cadence.priorityOrder) {
    if (!cadence.contentTypeEnabled[contentType]) {
      skippedReasons.push(`${contentType} disabled in config`);
      continue;
    }
    const caps = cadence.contentTypeCaps[contentType];
    if (!caps) continue;

    const campaignKey = CONTENT_TO_CAMPAIGN[contentType];
    if (!targets[campaignKey]) (targets as Record<string, Record<string, number>>)[campaignKey] = {};

    for (const track of gaps) {
      const slug = track.trackSlug as string;
      if (!TRACK_SLUGS.includes(slug as (typeof TRACK_SLUGS)[number])) continue;
      if (!cadence.trackEnabled[slug]) {
        skippedReasons.push(`Track ${slug} disabled`);
        continue;
      }

      const perRun = Math.min(caps.perRunPerTrack, cadence.maxItemsPerRun);
      const dailyCap = caps.dailyPerTrack[slug] ?? caps.perRunPerTrack * 2;

      const systemGaps = track.lowestSystems ?? [];
      const topicGaps = track.lowestTopics ?? [];
      const hasGap = systemGaps.some((g) => hasLowCoverage(g, contentType)) ||
        topicGaps.some((g) => hasLowCoverage(g, contentType));

      if (!hasGap) continue;

      const approved = await getApprovedSourceSlugsForTrack(slug);
      if (!approved.length) {
        skippedReasons.push(`No approved evidence sources for track ${slug}`);
        logAutonomous({ phase: "buildGapPlan", trackSlug: slug, contentType, reason: "no_approved_sources" });
        continue;
      }

      const count = Math.min(perRun, dailyCap);
      if (count <= 0) continue;

      (targets[campaignKey] as Record<string, number>)[slug] = count;
      const sysIds = systemGaps.slice(0, 3).map((g) => g.systemId);
      const topIds = topicGaps.slice(0, 5).map((g) => g.topicId);
      const scope = topIds.length > 0 ? "topic" : "system";
      plan.push({
        trackId: track.trackId,
        trackSlug: slug,
        contentType,
        targetCount: count,
        systemIds: sysIds,
        topicIds: topIds,
        scope,
      });
    }
  }

  logAutonomous({
    phase: "buildGapPlan",
    outcome: plan.length > 0 ? "plan-ready" : "no-gaps",
    planLength: plan.length,
    trackSlugs: [...new Set(plan.map((p) => p.trackSlug))],
    contentTypes: [...new Set(plan.map((p) => p.contentType))],
    scopeTypes: [...new Set(plan.map((p) => p.scope ?? "topic"))],
    skippedReasonsCount: skippedReasons.length,
  });

  return { targets, plan, skippedReasons };
}

function hasLowCoverage(
  gap: SystemCoverageGap | TopicCoverageGap,
  contentType: AutonomousContentType
): boolean {
  switch (contentType) {
    case "question":
      return gap.questionCount < 20;
    case "study_guide":
      return gap.guideCount < 2;
    case "flashcard_deck":
      return gap.deckCount < 1;
    case "high_yield_content":
      return gap.highYieldCount < 3;
    default:
      return false;
  }
}

export interface GenerationPlanItem {
  trackId: string;
  trackSlug: string;
  contentType: AutonomousContentType;
  targetCount: number;
  systemIds: string[];
  topicIds: string[];
  /** "topic" when topicIds present, "system" when system-scoped only */
  scope?: "topic" | "system";
}

export interface RunAutonomousResult {
  success: boolean;
  dryRun: boolean;
  launched: boolean;
  campaignId?: string;
  shardCount?: number;
  targetTotal?: number;
  plan?: GenerationPlanItem[];
  skippedReasons?: string[];
  error?: string;
  /** Diagnostic when launchCampaign succeeds but shardCount is 0 */
  shardCountZeroDiagnostic?: string;
  /** When skipped due to active campaign: id, status, job counts, isStale */
  activeCampaignDiagnostic?: ActiveAutonomousCampaignStatus;
  log: Record<string, unknown>;
}

/** Structured log entry for autonomous ops */
function logAutonomous(entry: Record<string, unknown>): void {
  const msg = `[autonomous] ${JSON.stringify(entry)}`;
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.log(msg);
  }
}

/** Run autonomous generation (dry run or real) */
export async function runAutonomousGeneration(dryRun: boolean): Promise<RunAutonomousResult> {
  const log: Record<string, unknown> = {
    mode: dryRun ? "dry-run" : "real",
    startedAt: new Date().toISOString(),
    track: "",
    contentType: "",
    systemsTargeted: [],
    topicsTargeted: [],
    itemsRequested: 0,
    itemsLaunched: 0,
    skippedReason: null as string | null,
    campaignId: null as string | null,
    batchPlanId: null as string | null,
  };

  if (!isSupabaseServiceRoleConfigured()) {
    return { success: false, dryRun, launched: false, error: "Supabase not configured", log };
  }

  const cadence = await getCadenceConfig();
  if (!cadence.enabled) {
    log.skippedReason = "Autonomous generation disabled";
    await setRunLog({
      lastRunAt: new Date().toISOString(),
      lastRunSummary: log,
      lastRunMode: dryRun ? "dry-run" : "real",
    });
    return { success: true, dryRun, launched: false, skippedReasons: ["Autonomous generation disabled"], log };
  }
  if (cadence.paused) {
    log.skippedReason = "Autonomous generation paused";
    await setRunLog({
      lastRunAt: new Date().toISOString(),
      lastRunSummary: log,
      lastRunMode: dryRun ? "dry-run" : "real",
    });
    return { success: true, dryRun, launched: false, skippedReasons: ["Autonomous generation paused"], log };
  }

  const { blocksLaunch, diagnostic } = await checkActiveAutonomousCampaign();
  if (blocksLaunch && diagnostic) {
    const reason = `Active campaign ${diagnostic.campaignId} (${diagnostic.status}): ${diagnostic.pendingCount} pending, ${diagnostic.runningCount} running`;
    log.skippedReason = reason;
    log.activeCampaignId = diagnostic.campaignId;
    log.activeCampaignStatus = diagnostic.status;
    log.activeCampaignPending = diagnostic.pendingCount;
    log.activeCampaignRunning = diagnostic.runningCount;
    log.activeCampaignIsStale = diagnostic.isStale;
    logAutonomous({
      phase: "launch-blocked",
      reason: "active_campaign",
      campaignId: diagnostic.campaignId,
      status: diagnostic.status,
      pendingCount: diagnostic.pendingCount,
      runningCount: diagnostic.runningCount,
    });
    await setRunLog({
      lastRunAt: new Date().toISOString(),
      lastRunSummary: log,
      lastRunMode: dryRun ? "dry-run" : "real",
    });
    return {
      success: true,
      dryRun,
      launched: false,
      skippedReasons: [reason],
      activeCampaignDiagnostic: diagnostic,
      log,
    };
  }

  const { targets, plan, skippedReasons } = await buildGapGenerationPlan(cadence);

  const totalTarget = Object.values(targets).reduce(
    (sum, byTrack) => sum + Object.values((byTrack as Record<string, number>) ?? {}).reduce((a: number, b: number) => a + b, 0),
    0
  );

  if (totalTarget === 0 || plan.length === 0) {
    const skipReason = skippedReasons.length ? skippedReasons.join("; ") : "No gaps to fill";
    log.skippedReason = skipReason;
    logAutonomous({
      launchMode: dryRun ? "dry-run" : "real",
      outcome: "skipped",
      skipReason,
      skippedReasons,
      planLength: plan.length,
      totalTarget,
    });
    await setRunLog({
      lastRunAt: new Date().toISOString(),
      lastRunSummary: { ...log, skippedReasons },
      lastRunMode: dryRun ? "dry-run" : "real",
    });
    return {
      success: true,
      dryRun,
      launched: false,
      plan,
      skippedReasons: skippedReasons.length ? skippedReasons : ["No gaps to fill"],
      log,
    };
  }

  log.itemsRequested = totalTarget;
  log.plan = plan;
  const scopeTypes = [...new Set(plan.map((p) => p.scope ?? "topic"))];
  log.scopeType = scopeTypes.length > 1 ? "mixed" : scopeTypes[0] ?? "topic";
  const systemsTargeted = [...new Set(plan.flatMap((p) => p.systemIds))];
  const topicsTargeted = [...new Set(plan.flatMap((p) => p.topicIds))];
  log.systemsTargeted = systemsTargeted;
  log.topicsTargeted = topicsTargeted;

  logAutonomous({
    launchMode: dryRun ? "dry-run" : "real",
    outcome: dryRun ? "dry-run-complete" : "launching",
    trackSlugs: [...new Set(plan.map((p) => p.trackSlug))],
    contentTypes: [...new Set(plan.map((p) => p.contentType))],
    scopeType: log.scopeType,
    systemsTargetedCount: systemsTargeted.length,
    topicsTargetedCount: topicsTargeted.length,
    itemsRequested: totalTarget,
    planLength: plan.length,
  });

  if (dryRun) {
    await setRunLog({
      lastRunAt: new Date().toISOString(),
      lastRunSummary: log,
      nextRunWindow: `Next run in ~${cadence.generationIntervalHours}h`,
      lastRunMode: "dry-run",
    });
    return {
      success: true,
      dryRun: true,
      launched: false,
      plan,
      targetTotal: totalTarget,
      log,
    };
  }

  const idempotencyKey = `autonomous-${new Date().toISOString().slice(0, 13)}`;
  const result = await launchCampaign({
    campaignName: `Autonomous ${new Date().toISOString().slice(0, 16)}`,
    targetByTrackContent: targets,
    maxConcurrency: 4,
    dryRun: false,
    idempotencyKey,
  });

  log.itemsLaunched = result.shardCount ?? 0;
  log.campaignId = result.campaignId ?? null;
  log.shardsCreated = result.shardCount ?? 0;

  const shardCountZeroDiagnostic =
    result.success && (result.shardCount ?? 0) === 0 && result.campaignId
      ? result.shardCountZeroDiagnostic ?? "Campaign created but no batch jobs inserted (all shards may be duplicate/idempotent)"
      : undefined;

  logAutonomous({
    launchMode: "real",
    outcome: result.success ? "launch-complete" : "launch-failed",
    campaignId: result.campaignId,
    shardCount: result.shardCount ?? 0,
    targetTotal: result.targetTotal ?? totalTarget,
    error: result.error,
    shardCountZeroDiagnostic: shardCountZeroDiagnostic ?? undefined,
  });

  await setRunLog({
    lastRunAt: new Date().toISOString(),
    lastRunSummary: log,
    nextRunWindow: `Next run in ~${cadence.generationIntervalHours}h`,
    lastRunMode: "real",
  });

  return {
    success: result.success,
    dryRun: false,
    launched: result.success && (result.shardCount ?? 0) > 0,
    campaignId: result.campaignId,
    shardCount: result.shardCount,
    targetTotal: result.targetTotal ?? totalTarget,
    plan,
    error: result.error,
    shardCountZeroDiagnostic,
    log,
  };
}

/** Pause or resume autonomous generation */
export async function setAutonomousPaused(paused: boolean): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseServiceRoleConfigured()) return { success: false, error: "Supabase not configured" };
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("autonomous_settings")
    .select("value_json")
    .eq("key", "autonomous_generation_cadence")
    .single();
  const current = (data?.value_json as Record<string, unknown>) ?? {};
  const updated = { ...current, paused };
  const { error } = await supabase
    .from("autonomous_settings")
    .upsert(
      { key: "autonomous_generation_cadence", value_json: updated, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
  return { success: !error, error: error?.message };
}
