"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Icons } from "@/components/ui/icons";
import type { QuestionListItem } from "@/lib/questions/loaders";

interface FilterOptions {
  systems: { id: string; slug: string; name: string }[];
  domains: { id: string; slug: string; name: string }[];
  topics: { id: string; slug: string; name: string }[];
  subtopics: { id: string; slug: string; name: string }[];
  questionTypes: { id: string; slug: string; name: string }[];
}

interface QuestionBrowseProps {
  initialFilters: { system?: string; domain?: string; topic?: string };
  filterOptions: FilterOptions;
  trackSlug: string;
}

const PAGE_SIZE = 20;
const DIFFICULTY_OPTIONS = [
  { value: "", label: "Any difficulty" },
  { value: "1", label: "1 - Easiest" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "5", label: "5 - Hardest" },
];

export function QuestionBrowse({
  initialFilters,
  filterOptions,
  trackSlug,
}: QuestionBrowseProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [questions, setQuestions] = useState<QuestionListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [filters, setFilters] = useState(() => ({
    system: searchParams.get("system") ?? initialFilters.system ?? "",
    domain: searchParams.get("domain") ?? initialFilters.domain ?? "",
    topic: searchParams.get("topic") ?? initialFilters.topic ?? "",
    subtopic: searchParams.get("subtopic") ?? "",
    difficulty: searchParams.get("difficulty") ?? "",
    itemType: searchParams.get("itemType") ?? "",
  }));

  useEffect(() => {
    const next = {
      system: searchParams.get("system") ?? "",
      domain: searchParams.get("domain") ?? "",
      topic: searchParams.get("topic") ?? "",
      subtopic: searchParams.get("subtopic") ?? "",
      difficulty: searchParams.get("difficulty") ?? "",
      itemType: searchParams.get("itemType") ?? "",
    };
    setFilters((f) => {
      if (
        f.system === next.system &&
        f.domain === next.domain &&
        f.topic === next.topic &&
        f.subtopic === next.subtopic &&
        f.difficulty === next.difficulty &&
        f.itemType === next.itemType
      )
        return f;
      return { ...f, ...next };
    });
  }, [searchParams]);

  const fetchPage = useCallback(
    async (pageNum: number, append: boolean) => {
      const params = new URLSearchParams();
      params.set("page", String(pageNum));
      if (filters.system) params.set("system", filters.system);
      if (filters.domain) params.set("domain", filters.domain);
      if (filters.topic) params.set("topic", filters.topic);
      if (filters.subtopic) params.set("subtopic", filters.subtopic);
      if (filters.difficulty) params.set("difficulty", filters.difficulty);
      if (filters.itemType) params.set("itemType", filters.itemType);

      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      try {
        const res = await fetch(`/api/questions/browse?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        if (append) {
          setQuestions((prev) => [...prev, ...(data.questions ?? [])]);
        } else {
          setQuestions(data.questions ?? []);
        }
        setTotal(data.total ?? 0);
        setHasMore(data.hasMore ?? false);
      } catch {
        setQuestions([]);
        setTotal(0);
        setHasMore(false);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filters]
  );

  useEffect(() => {
    setPage(1);
    fetchPage(1, false);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    const next = page + 1;
    setPage(next);
    fetchPage(next, true);
  }, [page, fetchPage]);

  const updateFilter = useCallback((key: keyof typeof filters, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const target = `/questions?${next.toString()}`;
    const current = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");
    if (target !== current) {
      router.replace(target, { scroll: false });
    }
  }, [searchParams.toString(), pathname, router]);

  const startPractice = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.system) params.set("systemSlug", filters.system);
    if (filters.domain) params.set("domainSlug", filters.domain);
    if (filters.topic) params.set("topicSlug", filters.topic);
    const seed = Date.now() % 100000;
    const query = params.toString();
    router.push(query ? `/exam/custom-${seed}?${query}` : `/exam/custom-${seed}`);
  }, [filters, router]);

  if (loading && questions.length === 0) {
    return (
      <div className="p-6">
        <p className="text-slate-500">Loading questions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <select
          value={filters.system}
          onChange={(e) => updateFilter("system", e.target.value)}
          className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
        >
          <option value="">All systems</option>
          {filterOptions.systems.map((s) => (
            <option key={s.id} value={s.slug}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          value={filters.domain}
          onChange={(e) => updateFilter("domain", e.target.value)}
          className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
        >
          <option value="">All domains</option>
          {filterOptions.domains.map((d) => (
            <option key={d.id} value={d.slug}>
              {d.name}
            </option>
          ))}
        </select>
        <select
          value={filters.topic}
          onChange={(e) => updateFilter("topic", e.target.value)}
          className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
        >
          <option value="">All topics</option>
          {filterOptions.topics.map((t) => (
            <option key={t.id} value={t.slug}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          value={filters.subtopic}
          onChange={(e) => updateFilter("subtopic", e.target.value)}
          className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
        >
          <option value="">All subtopics</option>
          {filterOptions.subtopics.map((s) => (
            <option key={s.id} value={s.slug}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          value={filters.difficulty}
          onChange={(e) => updateFilter("difficulty", e.target.value)}
          className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
        >
          {DIFFICULTY_OPTIONS.map((o) => (
            <option key={o.value || "any"} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={filters.itemType}
          onChange={(e) => updateFilter("itemType", e.target.value)}
          className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
        >
          <option value="">All types</option>
          {filterOptions.questionTypes.map((qt) => (
            <option key={qt.id} value={qt.slug}>
              {qt.name}
            </option>
          ))}
        </select>
        <span className="text-xs text-slate-500 self-center" title="Requires attempt history">
          Status filter (coming soon)
        </span>
      </div>

      <p className="text-sm text-slate-600 dark:text-slate-400">
        {total} question{total === 1 ? "" : "s"} • {trackSlug.toUpperCase()} track
      </p>

      {questions.length === 0 ? (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
          <div className="text-center py-12">
            <span className="inline-block text-4xl mb-4 text-slate-400">{Icons["help-circle"]}</span>
            <h2 className="font-heading text-lg font-semibold text-slate-900 dark:text-white mb-2">
              No questions match your filters
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Try adjusting filters or clearing some to see more questions.
            </p>
          </div>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {questions.map((q) => (
              <Card key={q.id} padding="sm" className="hover:border-indigo-300 dark:hover:border-indigo-700">
                <Link href={`/questions/${q.id}`} className="block text-left">
                  <p className="text-slate-900 dark:text-white line-clamp-2">{q.stem}</p>
                  <div className="flex gap-2 mt-2 text-xs text-slate-500">
                    {q.systemSlug && <span>{q.systemSlug}</span>}
                    {q.domainSlug && <span>• {q.domainSlug}</span>}
                    <span>• {q.type}</span>
                  </div>
                </Link>
              </Card>
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center py-6">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-6 py-2.5 rounded-xl font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {loadingMore ? "Loading..." : "Load more"}
              </button>
            </div>
          )}

          {total >= 10 && (
            <div className="pt-4">
              <button
                onClick={startPractice}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Start practice with these questions
                {Icons.chevronRight}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
