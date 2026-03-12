"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import {
  loadAIGenerationHistory,
  loadAIGenerationCounts,
  loadAIGenerationHistoryUsers,
  type AIGenerationHistoryFilters,
} from "@/app/(app)/actions/ai-factory";
import Link from "next/link";
import type { AIFactoryPageData } from "@/lib/admin/ai-factory-loaders";

const CONTENT_LINKS: Record<string, (id: string) => string> = {
  question: (id) => `/admin/questions/${id}`,
  study_guide: (id) => `/admin/study-guides/${id}`,
  study_guide_section_pack: (id) => `/admin/study-guides/${id}`,
  study_section: () => `/admin/study-guides`,
  flashcard_deck: (id) => `/admin/flashcards/${id}`,
  flashcard: (id) => `/admin/flashcards/${id}`,
  high_yield_summary: (id) => `/admin/high-yield/${id}`,
  common_confusion: (id) => `/admin/high-yield/${id}`,
  board_trap: (id) => `/admin/high-yield/${id}`,
  compare_contrast_summary: (id) => `/admin/high-yield/${id}`,
};

const CONTENT_TYPE_OPTIONS = [
  { value: "", label: "All types" },
  { value: "question", label: "Question" },
  { value: "study_guide", label: "Study guide" },
  { value: "study_guide_section_pack", label: "Study guide section pack" },
  { value: "flashcard_deck", label: "Flashcard deck" },
  { value: "high_yield_summary", label: "High-yield summary" },
  { value: "common_confusion", label: "Common confusion" },
  { value: "board_trap", label: "Board trap" },
  { value: "compare_contrast_summary", label: "Compare/contrast" },
];

export interface GenerationHistoryTabProps {
  data: AIFactoryPageData;
}

export function GenerationHistoryTab({ data }: GenerationHistoryTabProps) {
  const [history, setHistory] = useState<Awaited<ReturnType<typeof loadAIGenerationHistory>>>([]);
  const [counts, setCounts] = useState<Awaited<ReturnType<typeof loadAIGenerationCounts>>>({
    total: 0,
    saved: 0,
    discarded: 0,
    pending: 0,
  });
  const [users, setUsers] = useState<Awaited<ReturnType<typeof loadAIGenerationHistoryUsers>>>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<AIGenerationHistoryFilters>({});
  const [trackSlug, setTrackSlug] = useState("");
  const [contentType, setContentType] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const applyFilters = useCallback(() => {
    const f: AIGenerationHistoryFilters = {};
    if (trackSlug) f.trackSlug = trackSlug;
    if (contentType) f.contentType = contentType;
    if (createdBy) f.createdBy = createdBy;
    if (dateFrom) f.dateFrom = dateFrom;
    if (dateTo) f.dateTo = dateTo;
    setFilters(f);
  }, [trackSlug, contentType, createdBy, dateFrom, dateTo]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const hasFilters = Object.keys(filters).length > 0;
    const [historyData, countsData] = await Promise.all([
      loadAIGenerationHistory(100, hasFilters ? filters : undefined),
      loadAIGenerationCounts(hasFilters ? filters : undefined),
    ]);
    setHistory(historyData);
    setCounts(countsData);
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    loadAIGenerationHistoryUsers().then(setUsers);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const typeLabel = (type: string) => {
    const opt = CONTENT_TYPE_OPTIONS.find((o) => o.value === type);
    return opt?.label ?? type;
  };

  const outcomeLabel = (outcome: string | null) => {
    if (!outcome || outcome === "pending") return "Pending";
    if (outcome === "saved") return "Saved";
    if (outcome === "discarded") return "Discarded";
    return outcome;
  };

  const userLabel = (userId: string | null) => {
    if (!userId) return "—";
    const u = users.find((x) => x.id === userId);
    return u?.fullName ?? u?.email ?? userId.slice(0, 8) + "…";
  };

  return (
    <Card>
      <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Generation History</h2>
      <p className="text-sm text-slate-500 mb-4">
        Audit trail of AI-generated content. Filter by track, content type, date, or admin user.
      </p>

      {/* Counts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-4 py-3">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Generated</p>
          <p className="text-xl font-semibold text-slate-900 dark:text-white">{counts.total}</p>
        </div>
        <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3">
          <p className="text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Saved</p>
          <p className="text-xl font-semibold text-emerald-700 dark:text-emerald-300">{counts.saved}</p>
        </div>
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
          <p className="text-xs text-amber-600 dark:text-amber-400 uppercase tracking-wide">Discarded</p>
          <p className="text-xl font-semibold text-amber-700 dark:text-amber-300">{counts.discarded}</p>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-4 py-3">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Pending</p>
          <p className="text-xl font-semibold text-slate-700 dark:text-slate-300">{counts.pending}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={trackSlug}
          onChange={(e) => setTrackSlug(e.target.value)}
          className="rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm px-3 py-1.5"
        >
          <option value="">All tracks</option>
          {data.tracks.map((t) => (
            <option key={t.id} value={t.slug}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          value={contentType}
          onChange={(e) => setContentType(e.target.value)}
          className="rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm px-3 py-1.5"
        >
          {CONTENT_TYPE_OPTIONS.map((o) => (
            <option key={o.value || "all"} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={createdBy}
          onChange={(e) => setCreatedBy(e.target.value)}
          className="rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm px-3 py-1.5"
        >
          <option value="">All users</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.fullName ?? u.email ?? u.id.slice(0, 8)}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm px-3 py-1.5"
          placeholder="From"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm px-3 py-1.5"
          placeholder="To"
        />
        <button
          onClick={applyFilters}
          className="rounded-md bg-indigo-600 text-white text-sm px-4 py-1.5 hover:bg-indigo-700"
        >
          Apply filters
        </button>
      </div>

      {loading ? (
        <p className="text-slate-500 py-8">Loading generation history…</p>
      ) : history.length === 0 ? (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-12 text-center">
          <p className="text-slate-500">No AI generations yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-2 px-3">Type</th>
                <th className="text-left py-2 px-3">Track</th>
                <th className="text-left py-2 px-3">Outcome</th>
                <th className="text-left py-2 px-3">Generated</th>
                <th className="text-left py-2 px-3">By</th>
                <th className="text-left py-2 px-3">Link</th>
              </tr>
            </thead>
            <tbody>
              {history.map((entry) => (
                <tr key={entry.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2 px-3">{typeLabel(entry.contentType)}</td>
                  <td className="py-2 px-3">
                    {(entry.generationParams as { track?: string })?.track ?? "—"}
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className={
                        entry.outcome === "saved"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : entry.outcome === "discarded"
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-slate-500"
                      }
                    >
                      {outcomeLabel(entry.outcome)}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-slate-500">
                    {new Date(entry.generatedAt).toLocaleString()}
                  </td>
                  <td className="py-2 px-3 text-slate-500">{userLabel(entry.createdBy)}</td>
                  <td className="py-2 px-3">
                    {entry.contentId && CONTENT_LINKS[entry.contentType] ? (
                      <Link
                        href={CONTENT_LINKS[entry.contentType](entry.contentId)}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        View
                      </Link>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
