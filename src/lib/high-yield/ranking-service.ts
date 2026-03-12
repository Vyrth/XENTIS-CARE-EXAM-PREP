/**
 * High-Yield topic ranking service
 * Combines blueprint, telemetry, and student signal into composite score
 */

import { HIGH_YIELD_WEIGHTS, MIN_ATTEMPTS_FOR_TELEMETRY } from "@/config/high-yield";
import type { TrackSlug } from "@/data/mock/types";
import type { HighYieldTopic } from "@/types/high-yield";
import type { BlueprintWeight, TopicBlueprintWeight, TelemetrySignal, StudentSignal } from "@/types/high-yield";

/** Normalize 0-100 for blueprint (max weight in track = 100) */
function normBlueprint(weight: number, maxInTrack: number): number {
  return maxInTrack > 0 ? (weight / maxInTrack) * 100 : 0;
}

/** Normalize miss rate to score (higher miss = higher score, 0-100) */
function normMissRate(missRate: number): number {
  return Math.min(100, missRate ?? 0);
}

/** Normalize student signal (notes + requests) to 0-100 */
function normStudentSignal(notes: number, requests: number): number {
  const combined = notes * 0.5 + requests * 2;
  return Math.min(100, (combined / 500) * 100);
}

/** Compute rank for a single topic */
function rankTopic(
  topicId: string,
  topicName: string,
  systemId: string,
  systemName: string,
  systemSlug: string | undefined,
  track: TrackSlug,
  blueprint: TopicBlueprintWeight | null,
  telemetry: TelemetrySignal | null,
  studentSignal: StudentSignal | null,
  maxBlueprintInTrack: number
): HighYieldTopic {
  const w = HIGH_YIELD_WEIGHTS;

  const blueprintScore = blueprint
    ? normBlueprint(blueprint.weightPercent, maxBlueprintInTrack)
    : 0;

  const missRateScore = telemetry && (telemetry.totalAttempts ?? 0) >= MIN_ATTEMPTS_FOR_TELEMETRY
    ? normMissRate(telemetry.missRate ?? 0)
    : 0;

  const studentScore = studentSignal
    ? normStudentSignal(
        studentSignal.savedNotesCount ?? 0,
        studentSignal.explanationRequestsCount ?? 0
      )
    : 0;

  const score =
    blueprintScore * w.blueprintWeight +
    missRateScore * w.missRate +
    studentScore * w.studentSignal;

  const factors: string[] = [];
  if (blueprint && blueprint.weightPercent >= 4) {
    factors.push(`~${blueprint.weightPercent}% of exam`);
  }
  if (telemetry && (telemetry.missRate ?? 0) >= 40) {
    factors.push(`High miss rate (${telemetry.missRate}%)`);
  }
  if (studentSignal && (studentSignal.savedNotesCount ?? 0) + (studentSignal.explanationRequestsCount ?? 0) > 100) {
    factors.push("Frequently studied & requested");
  }
  if (studentSignal?.confusionTags && studentSignal.confusionTags.length > 0) {
    factors.push(`Common confusion: ${studentSignal.confusionTags[0]}`);
  }

  const whyHighYield =
    factors.length > 0
      ? factors.join(". ")
      : "Relevant to board exam based on blueprint and learner patterns.";

  return {
    topicId,
    topicName,
    systemId,
    systemName,
    systemSlug,
    track,
    score: Math.round(score * 10) / 10,
    whyHighYield,
    factors,
  };
}

export interface RankingInputs {
  topicBlueprint: TopicBlueprintWeight[];
  systemBlueprint: BlueprintWeight[];
  telemetry: TelemetrySignal[];
  studentSignal: StudentSignal[];
  topics: { id: string; name: string; systemId: string; systemName: string; systemSlug?: string }[];
}

/** Get top high-yield topics for a track */
export function getHighYieldTopics(
  track: TrackSlug,
  inputs: RankingInputs,
  limit = 10
): HighYieldTopic[] {
  const maxBlueprint = Math.max(
    ...inputs.systemBlueprint.filter((b) => b.track === track).map((b) => b.weightPercent),
    1
  );

  const topicBlueprintByTrack = inputs.topicBlueprint.filter((t) => t.track === track);
  const telemetryByTopic = new Map(inputs.telemetry.filter((t) => t.entityType === "topic").map((t) => [t.entityId, t]));
  const studentByTopic = new Map(inputs.studentSignal.filter((s) => s.entityType === "topic").map((s) => [s.entityId, s]));

  const ranked = inputs.topics.map((t) =>
    rankTopic(
      t.id,
      t.name,
      t.systemId,
      t.systemName,
      t.systemSlug,
      track,
      topicBlueprintByTrack.find((b) => b.topicId === t.id) ?? null,
      telemetryByTopic.get(t.id) ?? null,
      studentByTopic.get(t.id) ?? null,
      maxBlueprint
    )
  );

  return ranked
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
