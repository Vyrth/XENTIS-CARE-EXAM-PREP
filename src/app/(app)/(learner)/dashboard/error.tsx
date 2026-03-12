"use client";

import { useEffect } from "react";
import { Card } from "@/components/ui/Card";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error("[dashboard] Error:", error);
    }
  }, [error]);

  return (
    <div className="p-6 lg:p-8">
      <Card className="max-w-md mx-auto text-center py-12">
        <h2 className="font-heading text-lg font-semibold text-slate-900 dark:text-white mb-2">
          Something went wrong
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
          We couldn&apos;t load your dashboard. This may be a temporary issue.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            type="button"
            onClick={reset}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Refresh
          </Link>
        </div>
      </Card>
    </div>
  );
}
