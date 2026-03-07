/**
 * Trend aggregation - time-series performance and consistency
 */

import type { TrendDataPoint } from "@/types/readiness";

export interface DailyPerformance {
  date: string; // YYYY-MM-DD
  correct: number;
  total: number;
  percent: number;
}

/** Aggregate daily performance into trend points */
export function aggregateDailyTrend(
  daily: DailyPerformance[],
  metric: "percent" | "correct" | "total" = "percent"
): TrendDataPoint[] {
  return daily
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({
      date: d.date,
      value: metric === "percent" ? d.percent : metric === "correct" ? d.correct : d.total,
      label: d.date,
    }));
}

/** Compute 7-day rolling average for consistency */
export function rollingAverage(trend: TrendDataPoint[], window = 7): TrendDataPoint[] {
  const result: TrendDataPoint[] = [];
  for (let i = 0; i < trend.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = trend.slice(start, i + 1);
    const avg = slice.reduce((s, p) => s + p.value, 0) / slice.length;
    result.push({
      date: trend[i].date,
      value: Math.round(avg * 10) / 10,
      label: trend[i].label,
    });
  }
  return result;
}

/** Consistency score: how stable is performance over time (0-100) */
export function computeConsistencyScore(daily: DailyPerformance[]): number {
  if (daily.length < 2) return 100;
  const percents = daily.map((d) => d.percent);
  const mean = percents.reduce((a, b) => a + b, 0) / percents.length;
  const variance =
    percents.reduce((s, p) => s + (p - mean) ** 2, 0) / percents.length;
  const stdDev = Math.sqrt(variance);
  // Lower std dev = higher consistency; map to 0-100
  const normalized = Math.max(0, 100 - stdDev * 2);
  return Math.round(normalized);
}
