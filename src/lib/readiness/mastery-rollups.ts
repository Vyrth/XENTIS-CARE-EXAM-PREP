/**
 * Mastery rollups - aggregate performance by topic, subtopic, system, domain, skill, item type
 */

import { MASTERY_TARGET_PERCENT, MIN_QUESTIONS_FOR_MASTERY } from "@/config/readiness";
import type { MasteryRollup } from "@/types/readiness";

export interface RawPerformanceRecord {
  entityId: string;
  entityName: string;
  correct: number;
  total: number;
}

/** Build mastery rollup from raw performance */
function buildRollup(
  type: MasteryRollup["type"],
  record: RawPerformanceRecord,
  targetPercent: number = MASTERY_TARGET_PERCENT
): MasteryRollup {
  const percent = record.total > 0 ? (record.correct / record.total) * 100 : 0;
  return {
    id: `${type}-${record.entityId}`,
    type,
    name: record.entityName,
    correct: record.correct,
    total: record.total,
    percent: Math.round(percent * 10) / 10,
    targetPercent,
    atTarget: record.total >= MIN_QUESTIONS_FOR_MASTERY && percent >= targetPercent,
  };
}

/** Roll up by system */
export function rollupBySystem(
  records: RawPerformanceRecord[],
  targetPercent?: number
): MasteryRollup[] {
  return records.map((r) => buildRollup("system", r, targetPercent));
}

/** Roll up by domain */
export function rollupByDomain(
  records: RawPerformanceRecord[],
  targetPercent?: number
): MasteryRollup[] {
  return records.map((r) => buildRollup("domain", r, targetPercent));
}

/** Roll up by topic */
export function rollupByTopic(
  records: RawPerformanceRecord[],
  targetPercent?: number
): MasteryRollup[] {
  return records.map((r) => buildRollup("topic", r, targetPercent));
}

/** Roll up by skill */
export function rollupBySkill(
  records: RawPerformanceRecord[],
  targetPercent?: number
): MasteryRollup[] {
  return records.map((r) => buildRollup("skill", r, targetPercent));
}

/** Roll up by item type */
export function rollupByItemType(
  records: RawPerformanceRecord[],
  targetPercent?: number
): MasteryRollup[] {
  return records.map((r) => buildRollup("item_type", r, targetPercent));
}

/** Get weak rollups (below target, min questions met) */
export function getWeakRollups(rollups: MasteryRollup[]): MasteryRollup[] {
  return rollups
    .filter((r) => r.total >= MIN_QUESTIONS_FOR_MASTERY && !r.atTarget)
    .sort((a, b) => a.percent - b.percent);
}

/** Get strong rollups (at or above target) */
export function getStrongRollups(rollups: MasteryRollup[]): MasteryRollup[] {
  return rollups
    .filter((r) => r.total >= MIN_QUESTIONS_FOR_MASTERY && r.atTarget)
    .sort((a, b) => b.percent - a.percent);
}
