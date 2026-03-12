/**
 * Production Pipeline - Shard Generator
 *
 * Splits a master batch into child jobs by:
 * - track
 * - system
 * - topic
 * - content type
 * - batch size (chunk size)
 */

import type { BatchContentType } from "./production-pipeline-config";
import { BATCH_SIZING } from "./production-pipeline-config";

export interface ShardSpec {
  trackId: string;
  trackSlug: string;
  systemId?: string;
  systemName?: string;
  topicId?: string;
  topicName?: string;
  contentType: BatchContentType;
  targetCount: number;
  chunkSize: number;
  shardKey: string;
}

export interface TrackSystemTopic {
  trackId: string;
  trackSlug: string;
  systemId: string;
  systemName: string;
  topicId: string;
  topicName: string;
}

/** Build shard key for deduplication and idempotency */
export function buildShardKey(
  trackId: string,
  systemId: string | undefined,
  topicId: string | undefined,
  contentType: BatchContentType
): string {
  const parts = [trackId, systemId ?? "all", topicId ?? "all", contentType];
  return parts.join(":");
}

/** Get chunk size for content type */
export function getChunkSize(contentType: BatchContentType, targetCount: number): number {
  const sizing = BATCH_SIZING[contentType] as { min?: number; max?: number; default?: number; cardsPerDeck?: { min: number; max: number } };
  if (!sizing) return 10;
  if ("min" in sizing && "max" in sizing && "default" in sizing) {
    const { min = 10, max = 25, default: def = 15 } = sizing;
    const ideal = Math.min(targetCount, def);
    return Math.max(min, Math.min(max, ideal));
  }
  if ("cardsPerDeck" in sizing && sizing.cardsPerDeck) {
    return sizing.cardsPerDeck.max ?? 25;
  }
  return 10;
}

/** Generate shards for a master batch plan */
export function generateShards(
  tracks: { id: string; slug: string }[],
  systemsByTrack: Map<string, { id: string; name: string }[]>,
  topicsBySystem: Map<string, { id: string; name: string; systemId?: string }[]>,
  contentType: BatchContentType,
  targetPerTrack: number
): ShardSpec[] {
  const shards: ShardSpec[] = [];
  const chunkSize = getChunkSize(contentType, targetPerTrack);

  for (const track of tracks) {
    const systems = systemsByTrack.get(track.id) ?? [];
    const topicList: TrackSystemTopic[] = [];

    for (const sys of systems) {
      const topics = topicsBySystem.get(sys.id) ?? [];
      for (const t of topics) {
        topicList.push({
          trackId: track.id,
          trackSlug: track.slug,
          systemId: sys.id,
          systemName: sys.name,
          topicId: t.id,
          topicName: t.name,
        });
      }
    }

    if (topicList.length === 0) continue;

    const perTopic = Math.max(1, Math.ceil(targetPerTrack / topicList.length));
    let remaining = targetPerTrack;

    for (const tst of topicList) {
      if (remaining <= 0) break;
      const count = Math.min(perTopic, remaining, chunkSize * 2);
      remaining -= count;

      const numChunks = Math.ceil(count / chunkSize);
      for (let i = 0; i < numChunks; i++) {
        const chunkTarget = Math.min(chunkSize, count - i * chunkSize);
        if (chunkTarget <= 0) continue;

        shards.push({
          trackId: tst.trackId,
          trackSlug: tst.trackSlug,
          systemId: tst.systemId,
          systemName: tst.systemName,
          topicId: tst.topicId,
          topicName: tst.topicName,
          contentType,
          targetCount: chunkTarget,
          chunkSize,
          shardKey: buildShardKey(tst.trackId, tst.systemId, tst.topicId, contentType) + `:${i}`,
        });
      }
    }
  }

  return shards;
}
