"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    track("error_boundary", {
      message: error.message,
      digest: error.digest,
      stack: error.stack?.slice(0, 500),
    });
  }, [error]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
        Something went wrong
      </h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400 max-w-md">
        We&apos;ve been notified and are looking into it. Please try again.
      </p>
      <button
        onClick={reset}
        className="mt-6 px-4 py-2 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-medium hover:opacity-90 transition"
      >
        Try again
      </button>
    </div>
  );
}
