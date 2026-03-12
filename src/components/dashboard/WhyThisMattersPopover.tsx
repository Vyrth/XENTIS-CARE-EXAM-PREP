"use client";

import { useState, useRef, useEffect } from "react";
import { Skeleton } from "@/components/ui/Skeleton";

interface WhyThisMattersPopoverProps {
  userId: string;
  examTrack: string;
  weakSystems: { name: string; percent: number }[];
  weakDomains: { name: string; percent: number }[];
  triggerLabel?: string;
}

export function WhyThisMattersPopover({
  userId,
  examTrack,
  weakSystems,
  weakDomains,
  triggerLabel = "Why this matters",
}: WhyThisMattersPopoverProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const fetchWhy = async () => {
    if (status === "loading") return;
    setOpen(true);
    if (status === "success" && content) return;
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/ai/weak-area-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          examTrack,
          weakSystems: weakSystems.map((s) => ({
            name: s.name,
            percent: s.percent,
            targetPercent: 80,
            correct: 0,
            total: 0,
          })),
          weakDomains: weakDomains.map((d) => ({
            name: d.name,
            percent: d.percent,
            targetPercent: 80,
            correct: 0,
            total: 0,
          })),
          coachingMode: "explain_weakness",
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Request failed");
        setStatus("error");
        return;
      }
      if (json.success && json.data) {
        const d = json.data;
        setContent(
          [d.summaryOfWeakAreas, d.likelyCausesOfMistakes, d.suggestedNextStep].filter(Boolean).join("\n\n")
        );
        setStatus("success");
      } else {
        setError("Invalid response");
        setStatus("error");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setStatus("error");
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={fetchWhy}
        className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
      >
        {triggerLabel}
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-2 z-50 w-80 max-h-64 overflow-y-auto p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg"
          role="dialog"
          aria-label="Why this matters"
        >
          {status === "loading" && (
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-12 w-full mt-2" />
            </div>
          )}
          {status === "error" && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          {status === "success" && content && (
            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
              {content}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
