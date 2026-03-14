/**
 * Admin metrics for high-confidence auto-publish diagnostics.
 * Increments daily counters in ai_auto_publish_metrics.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";

export type AutoPublishMetricEvent =
  | "auto_published"
  | "routed_to_review"
  | "duplicate_rejected"
  | "legal_exception";

/** Increment one of the auto-publish metric counters for today and content type. */
export async function recordAutoPublishMetric(
  event: AutoPublishMetricEvent,
  contentType: string = "question"
): Promise<void> {
  if (!isSupabaseServiceRoleConfigured()) return;
  const supabase = createServiceClient();
  const periodDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const column =
    event === "auto_published"
      ? "auto_published_count"
      : event === "routed_to_review"
        ? "routed_to_review_count"
        : event === "duplicate_rejected"
          ? "duplicate_rejected_count"
          : "legal_exception_count";

  const { error } = await supabase.rpc("increment_auto_publish_metric", {
    p_period_date: periodDate,
    p_content_type: contentType,
    p_column: column,
  });

  if (error) {
    if (error.code === "42883") {
      await upsertIncrementFallback(supabase, periodDate, contentType, column);
      return;
    }
    if (process.env.NODE_ENV !== "test") {
      console.warn("[auto-publish-metrics] increment failed", { event, contentType, error: error.message });
    }
  }
}

/** Fallback: upsert row and increment when RPC is not present. */
async function upsertIncrementFallback(
  supabase: ReturnType<typeof createServiceClient>,
  periodDate: string,
  contentType: string,
  column: string
): Promise<void> {
  const { data: row } = await supabase
    .from("ai_auto_publish_metrics")
    .select("id, auto_published_count, routed_to_review_count, duplicate_rejected_count, legal_exception_count")
    .eq("period_date", periodDate)
    .eq("content_type", contentType)
    .single();

  const now = new Date().toISOString();
  const counts = {
    auto_published_count: (row?.auto_published_count ?? 0) + (column === "auto_published_count" ? 1 : 0),
    routed_to_review_count: (row?.routed_to_review_count ?? 0) + (column === "routed_to_review_count" ? 1 : 0),
    duplicate_rejected_count: (row?.duplicate_rejected_count ?? 0) + (column === "duplicate_rejected_count" ? 1 : 0),
    legal_exception_count: (row?.legal_exception_count ?? 0) + (column === "legal_exception_count" ? 1 : 0),
  };

  await supabase.from("ai_auto_publish_metrics").upsert(
    {
      period_date: periodDate,
      content_type: contentType,
      ...counts,
      updated_at: now,
    },
    { onConflict: "period_date,content_type" }
  );
}

export interface AutoPublishMetricsRow {
  period_date: string;
  content_type: string;
  auto_published_count: number;
  routed_to_review_count: number;
  duplicate_rejected_count: number;
  legal_exception_count: number;
  updated_at: string;
}

/** Load admin metrics for auto-publish diagnostics (e.g. last 30 days or single day). */
export async function getAutoPublishMetrics(
  options?: { periodDate?: string; contentType?: string; lastDays?: number }
): Promise<AutoPublishMetricsRow[]> {
  if (!isSupabaseServiceRoleConfigured()) return [];
  const supabase = createServiceClient();
  let query = supabase
    .from("ai_auto_publish_metrics")
    .select("period_date, content_type, auto_published_count, routed_to_review_count, duplicate_rejected_count, legal_exception_count, updated_at")
    .order("period_date", { ascending: false });
  if (options?.periodDate) query = query.eq("period_date", options.periodDate);
  if (options?.contentType) query = query.eq("content_type", options.contentType);
  if (options?.lastDays && !options.periodDate) {
    const since = new Date();
    since.setDate(since.getDate() - options.lastDays);
    query = query.gte("period_date", since.toISOString().slice(0, 10));
  }
  const { data } = await query.limit(500);
  return (data ?? []) as AutoPublishMetricsRow[];
}
