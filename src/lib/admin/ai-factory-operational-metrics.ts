/**
 * Phase 1 AI Factory operational metrics for admin.
 * Sources: ai_question_generation_audit, ai_auto_publish_metrics, question_similarity_index.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";
import { getAutoPublishMetrics } from "@/lib/admin/auto-publish-metrics";

export interface AiFactoryOperationalMetrics {
  /** Count auto-published in window */
  auto_published_count: number;
  /** Count routed to editorial lane */
  routed_editorial_count: number;
  /** Count routed to SME lane */
  routed_sme_count: number;
  /** Count routed to legal lane */
  routed_legal_count: number;
  /** Count routed to QA lane */
  routed_qa_count: number;
  /** Count needing revision */
  needs_revision_count: number;
  /** Duplicate rejected (from metrics table) */
  duplicate_rejected_count: number;
  /** Legal exception (from metrics table) */
  legal_exception_count: number;
  /** Average confidence (0–1) in window; null if none */
  average_confidence_score: number | null;
  /** Average similarity (0–1) in window; null if none */
  average_similarity_score: number | null;
  /** Top repeated scenario archetype keys with counts (desc) */
  top_repeated_archetypes: { archetype_key: string; count: number }[];
  /** Time window used (e.g. last 30 days) */
  window_days: number;
}

const DEFAULT_METRICS: AiFactoryOperationalMetrics = {
  auto_published_count: 0,
  routed_editorial_count: 0,
  routed_sme_count: 0,
  routed_legal_count: 0,
  routed_qa_count: 0,
  needs_revision_count: 0,
  duplicate_rejected_count: 0,
  legal_exception_count: 0,
  average_confidence_score: null,
  average_similarity_score: null,
  top_repeated_archetypes: [],
  window_days: 30,
};

/** Load Phase 1 AI Factory operational metrics (counts, averages, top archetypes). */
export async function loadAiFactoryOperationalMetrics(
  options?: { windowDays?: number; topArchetypesLimit?: number }
): Promise<AiFactoryOperationalMetrics> {
  const windowDays = options?.windowDays ?? 30;
  const topLimit = options?.topArchetypesLimit ?? 10;

  if (!isSupabaseServiceRoleConfigured()) {
    return { ...DEFAULT_METRICS, window_days: windowDays };
  }

  const supabase = createServiceClient();
  const since = new Date();
  since.setDate(since.getDate() - windowDays);
  const sinceStr = since.toISOString();

  try {
    const [auditRows, metricsRows, archetypeRows] = await Promise.all([
      loadAuditCountsAndAverages(supabase, sinceStr),
      getAutoPublishMetrics({ lastDays: windowDays }),
      loadTopRepeatedArchetypes(supabase, topLimit),
    ]);

    const autoPublished = metricsRows.reduce((s, r) => s + (r.auto_published_count ?? 0), 0);
    const duplicateRejected = metricsRows.reduce((s, r) => s + (r.duplicate_rejected_count ?? 0), 0);
    const legalException = metricsRows.reduce((s, r) => s + (r.legal_exception_count ?? 0), 0);

    return {
      auto_published_count: auditRows.auto_published_count,
      routed_editorial_count: auditRows.routed_editorial_count,
      routed_sme_count: auditRows.routed_sme_count,
      routed_legal_count: auditRows.routed_legal_count,
      routed_qa_count: auditRows.routed_qa_count,
      needs_revision_count: auditRows.needs_revision_count,
      duplicate_rejected_count: duplicateRejected,
      legal_exception_count: legalException,
      average_confidence_score: auditRows.average_confidence_score,
      average_similarity_score: auditRows.average_similarity_score,
      top_repeated_archetypes: archetypeRows,
      window_days: windowDays,
    };
  } catch (e) {
    if (process.env.NODE_ENV !== "test") {
      console.warn("[ai-factory-operational-metrics] load failed", e);
    }
    return { ...DEFAULT_METRICS, window_days: windowDays };
  }
}

interface AuditAggregates {
  auto_published_count: number;
  routed_editorial_count: number;
  routed_sme_count: number;
  routed_legal_count: number;
  routed_qa_count: number;
  needs_revision_count: number;
  average_confidence_score: number | null;
  average_similarity_score: number | null;
}

async function loadAuditCountsAndAverages(
  supabase: ReturnType<typeof createServiceClient>,
  sinceStr: string
): Promise<AuditAggregates> {
  const { data: rows } = await supabase
    .from("ai_question_generation_audit")
    .select("auto_published, routed_lane, confidence_score, similarity_score")
    .gte("created_at", sinceStr);

  const r = rows ?? [];
  const result: AuditAggregates = {
    auto_published_count: 0,
    routed_editorial_count: 0,
    routed_sme_count: 0,
    routed_legal_count: 0,
    routed_qa_count: 0,
    needs_revision_count: 0,
    average_confidence_score: null,
    average_similarity_score: null,
  };

  let confidenceSum = 0;
  let confidenceN = 0;
  let similaritySum = 0;
  let similarityN = 0;

  for (const row of r) {
    if (row.auto_published === true) result.auto_published_count++;
    const lane = (row.routed_lane ?? "").toLowerCase();
    if (lane === "editorial") result.routed_editorial_count++;
    else if (lane === "sme") result.routed_sme_count++;
    else if (lane === "legal") result.routed_legal_count++;
    else if (lane === "qa") result.routed_qa_count++;
    else if (lane === "needs_revision") result.needs_revision_count++;

    if (row.confidence_score != null && !Number.isNaN(Number(row.confidence_score))) {
      confidenceSum += Number(row.confidence_score);
      confidenceN++;
    }
    if (row.similarity_score != null && !Number.isNaN(Number(row.similarity_score))) {
      similaritySum += Number(row.similarity_score);
      similarityN++;
    }
  }

  if (confidenceN > 0) result.average_confidence_score = confidenceSum / confidenceN;
  if (similarityN > 0) result.average_similarity_score = similaritySum / similarityN;

  return result;
}

async function loadTopRepeatedArchetypes(
  supabase: ReturnType<typeof createServiceClient>,
  limit: number
): Promise<{ archetype_key: string; count: number }[]> {
  const { data } = await supabase
    .from("question_similarity_index")
    .select("scenario_archetype_key")
    .not("scenario_archetype_key", "is", null);

  const keyCounts = new Map<string, number>();
  for (const row of data ?? []) {
    const key = (row.scenario_archetype_key ?? "").trim();
    if (!key) continue;
    keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1);
  }

  return Array.from(keyCounts.entries())
    .map(([archetype_key, count]) => ({ archetype_key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
