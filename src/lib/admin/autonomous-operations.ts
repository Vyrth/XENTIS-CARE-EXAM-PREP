/**
 * Autonomous Content Operations - cadence, blueprint gaps, auto-queue.
 * - Compares published content vs target blueprint by track/system/topic
 * - Queues campaigns for underfilled areas
 * - Respects source governance (NCSBN/ANCC)
 */

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";
import { loadBlueprintCoverage, type TrackBlueprintCoverage } from "./blueprint-coverage";
import { loadRoadmapCoverageGaps } from "./roadmap-coverage-loaders";
import { launchCampaign } from "@/lib/ai/campaign-orchestrator";
import type { CampaignTargets } from "@/lib/ai/campaign-orchestrator";

export interface BlueprintTargets {
  minQuestionsPerTopic?: number;
  minQuestionsPerSystem?: number;
}

export interface AutonomousSettings {
  cadence: {
    processShardsEveryHours?: number;
    nightlyUnderfillEnabled?: boolean;
    weeklyRebalanceEnabled?: boolean;
    monthlyLowCoverageEnabled?: boolean;
  };
  autoPublish: {
    minQualityScore?: number;
    borderlineThreshold?: number;
    rejectBelow?: number;
  };
  sourceGovernance: {
    requireOfficialFramework?: boolean;
    blockGenericSources?: boolean;
  };
  blueprintTargets?: Record<string, BlueprintTargets>;
  prePractice?: {
    regenerateMonthly?: boolean;
    minQualityThreshold?: number;
    minCoverageThreshold?: number;
  };
}

export async function getSettings(): Promise<AutonomousSettings> {
  if (!isSupabaseServiceRoleConfigured()) {
    return {
      cadence: { processShardsEveryHours: 2, nightlyUnderfillEnabled: true, weeklyRebalanceEnabled: true, monthlyLowCoverageEnabled: true },
      autoPublish: { minQualityScore: 75, borderlineThreshold: 65, rejectBelow: 40 },
      sourceGovernance: { requireOfficialFramework: true, blockGenericSources: true },
      blueprintTargets: {},
      prePractice: { regenerateMonthly: true, minQualityThreshold: 70, minCoverageThreshold: 80 },
    };
  }
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("autonomous_settings")
    .select("key, value_json")
    .in("key", ["cadence", "auto_publish", "source_governance", "blueprint_targets", "pre_practice"]);

  const out: AutonomousSettings = {
    cadence: {},
    autoPublish: {},
    sourceGovernance: {},
    blueprintTargets: {},
    prePractice: {},
  };
  for (const row of data ?? []) {
    const key = row.key as string;
    const val = row.value_json as Record<string, unknown>;
    if (key === "cadence") out.cadence = val as AutonomousSettings["cadence"];
    else if (key === "auto_publish") out.autoPublish = val as AutonomousSettings["autoPublish"];
    else if (key === "source_governance") out.sourceGovernance = val as AutonomousSettings["sourceGovernance"];
    else if (key === "blueprint_targets") out.blueprintTargets = val as AutonomousSettings["blueprintTargets"];
    else if (key === "pre_practice") out.prePractice = val as AutonomousSettings["prePractice"];
  }
  return out;
}

export interface BlueprintGap {
  trackId: string;
  trackSlug: string;
  systemId?: string;
  topicId?: string;
  currentQuestions: number;
  targetQuestions: number;
  gap: number;
}

/** Identify underfilled systems/topics vs blueprint targets */
export async function computeBlueprintGaps(
  trackId?: string | null
): Promise<BlueprintGap[]> {
  const settings = await getSettings();
  const targets = settings.blueprintTargets ?? {};
  const coverage = await loadBlueprintCoverage(trackId);
  const gaps: BlueprintGap[] = [];

  for (const track of coverage) {
    const trackTargets = targets[track.trackSlug] ?? { minQuestionsPerTopic: 15, minQuestionsPerSystem: 50 };
    const minPerTopic = trackTargets.minQuestionsPerTopic ?? 15;
    const minPerSystem = trackTargets.minQuestionsPerSystem ?? 50;

    for (const domain of track.domains) {
      for (const sys of domain.systems) {
        if (sys.questionCount < minPerSystem) {
          gaps.push({
            trackId: track.trackId,
            trackSlug: track.trackSlug,
            systemId: sys.systemId,
            currentQuestions: sys.questionCount,
            targetQuestions: minPerSystem,
            gap: minPerSystem - sys.questionCount,
          });
        }
        for (const topic of sys.topics) {
          if (topic.questionCount < minPerTopic) {
            gaps.push({
              trackId: track.trackId,
              trackSlug: track.trackSlug,
              systemId: sys.systemId,
              topicId: topic.topicId,
              currentQuestions: topic.questionCount,
              targetQuestions: minPerTopic,
              gap: minPerTopic - topic.questionCount,
            });
          }
        }
      }
    }
    for (const sys of track.unassignedSystems) {
      if (sys.questionCount < minPerSystem) {
        gaps.push({
          trackId: track.trackId,
          trackSlug: track.trackSlug,
          systemId: sys.systemId,
          currentQuestions: sys.questionCount,
          targetQuestions: minPerSystem,
          gap: minPerSystem - sys.questionCount,
        });
      }
    }
  }

  return gaps.sort((a, b) => b.gap - a.gap);
}

/** Queue underfill campaign from roadmap gaps (nightly) */
export async function queueNightlyUnderfillCampaign(): Promise<{
  launched: boolean;
  campaignId?: string;
  shardCount?: number;
  error?: string;
}> {
  const settings = await getSettings();
  if (!settings.cadence.nightlyUnderfillEnabled) {
    return { launched: false, error: "Nightly underfill disabled" };
  }
  if (!isSupabaseServiceRoleConfigured()) {
    return { launched: false, error: "Supabase not configured" };
  }

  const gaps = await loadRoadmapCoverageGaps(3, 6);
  const targets: CampaignTargets = { question: {} };

  for (const track of gaps) {
    const slug = track.trackSlug as keyof CampaignTargets["question"];
    if (!slug || !["rn", "fnp", "pmhnp", "lvn"].includes(slug)) continue;
    const hasSystemGaps = track.lowestSystems.some((g) => g.questionCount < 20);
    const hasTopicGaps = track.lowestTopics.some((g) => g.questionCount < 10);
    if (hasSystemGaps || hasTopicGaps) {
      targets.question![slug] = 80;
    }
  }

  if (Object.keys(targets.question ?? {}).length === 0) {
    return { launched: false, error: "No underfill gaps" };
  }

  const result = await launchCampaign({
    campaignName: `Nightly Underfill ${new Date().toISOString().slice(0, 10)}`,
    targetByTrackContent: targets,
    maxConcurrency: 4,
    dryRun: false,
    idempotencyKey: `nightly-underfill-${new Date().toISOString().slice(0, 10)}`,
  });

  return {
    launched: result.success,
    campaignId: result.campaignId,
    shardCount: result.shardCount,
    error: result.error,
  };
}

/** Queue weekly blueprint rebalance campaign */
export async function queueWeeklyRebalanceCampaign(): Promise<{
  launched: boolean;
  campaignId?: string;
  shardCount?: number;
  error?: string;
}> {
  const settings = await getSettings();
  if (!settings.cadence.weeklyRebalanceEnabled) {
    return { launched: false, error: "Weekly rebalance disabled" };
  }

  const gaps = await computeBlueprintGaps(null);
  const byTrack = new Map<string, number>();

  for (const g of gaps.slice(0, 100)) {
    const cur = byTrack.get(g.trackSlug) ?? 0;
    byTrack.set(g.trackSlug, cur + Math.min(g.gap, 30));
  }

  const targets: CampaignTargets = {
    question: Object.fromEntries(
      Array.from(byTrack.entries()).filter(([, v]) => v > 0).map(([k, v]) => [k, Math.min(v, 500)])
    ),
  };

  if (Object.keys(targets.question ?? {}).length === 0) {
    return { launched: false, error: "No rebalance gaps" };
  }

  const result = await launchCampaign({
    campaignName: `Weekly Rebalance ${new Date().toISOString().slice(0, 10)}`,
    targetByTrackContent: targets,
    maxConcurrency: 4,
    dryRun: false,
    idempotencyKey: `weekly-rebalance-${new Date().toISOString().slice(0, 7)}`,
  });

  return {
    launched: result.success,
    campaignId: result.campaignId,
    shardCount: result.shardCount,
    error: result.error,
  };
}

/** Get source framework for track (NCSBN/ANCC) */
export async function getSourceFrameworkForTrack(
  trackSlug: string
): Promise<{ id: string; slug: string; name: string } | null> {
  if (!isSupabaseServiceRoleConfigured()) return null;
  const supabase = createServiceClient();
  const { data: track } = await supabase
    .from("exam_tracks")
    .select("id")
    .eq("slug", trackSlug)
    .single();
  if (!track) return null;

  const { data: config } = await supabase
    .from("source_framework_config")
    .select("source_framework_id")
    .eq("exam_track_id", track.id)
    .eq("enabled", true)
    .single();

  if (!config?.source_framework_id) return null;

  const { data: sf } = await supabase
    .from("source_frameworks")
    .select("id, slug, name")
    .eq("id", config.source_framework_id)
    .single();

  if (!sf) return null;
  return { id: sf.id, slug: sf.slug, name: sf.name };
}
