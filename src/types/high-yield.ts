/**
 * High-Yield Intelligence types
 */

import type { TrackSlug } from "@/data/mock/types";

export interface BlueprintWeight {
  systemId: string;
  systemName: string;
  /** Official blueprint % (e.g. NCSBN) */
  weightPercent: number;
  track: TrackSlug;
}

export interface TopicBlueprintWeight extends BlueprintWeight {
  topicId: string;
  topicName: string;
}

export interface TelemetrySignal {
  entityType: "system" | "topic" | "skill" | "item_type";
  entityId: string;
  entityName: string;
  /** Miss rate 0-100 */
  missRate?: number;
  /** Avg time per item (seconds) - for slow item types */
  avgTimeSeconds?: number;
  /** Low-confidence correct count */
  lowConfidenceCorrect?: number;
  /** Total attempts */
  totalAttempts?: number;
}

export interface StudentSignal {
  entityType: "topic" | "question" | "section";
  entityId: string;
  /** Count of saved notes referencing this */
  savedNotesCount?: number;
  /** Count of issue reports */
  issueReportsCount?: number;
  /** Count of AI explanation requests */
  explanationRequestsCount?: number;
  /** Curated confusion tags */
  confusionTags?: string[];
}

export interface HighYieldTopic {
  topicId: string;
  topicName: string;
  systemId: string;
  systemName: string;
  track: TrackSlug;
  /** Composite score 0-100 */
  score: number;
  /** Why this is high yield */
  whyHighYield: string;
  /** Contributing factors */
  factors: string[];
}

export interface TopTrap {
  id: string;
  topicId: string;
  topicName: string;
  trapDescription: string;
  correctApproach: string;
  track: TrackSlug;
  frequency: "common" | "very_common" | "extremely_common";
}

export interface CommonConfusion {
  id: string;
  topicId: string;
  topicName: string;
  conceptA: string;
  conceptB: string;
  keyDifference: string;
  track: TrackSlug;
}
