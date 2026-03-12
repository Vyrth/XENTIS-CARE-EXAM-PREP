"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { STUDY_MODES, EXAM_TRACKS } from "@/config/auth";

type Track = { id: string; slug: string; name: string };

const inputBase =
  "w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none disabled:opacity-50";
const labelBase = "block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2";

const FALLBACK_TRACKS: Track[] = EXAM_TRACKS.map((t) => ({
  id: t.slug,
  slug: t.slug,
  name: t.name,
}));

export function OnboardingForm({
  tracks: initialTracks,
  loadError = null,
  initialTrackId = null,
  initialTargetDate = null,
  initialStudyMinutes = null,
  initialStudyMode = null,
}: {
  tracks: Track[];
  loadError?: string | null;
  initialTrackId?: string | null;
  initialTargetDate?: string | null;
  initialStudyMinutes?: number | null;
  initialStudyMode?: string | null;
}) {
  const router = useRouter();
  const [tracks, setTracks] = useState<Track[]>(initialTracks);
  const [tracksLoading, setTracksLoading] = useState(initialTracks.length === 0 && !loadError);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialTracks.length > 0) {
      setTracks(initialTracks);
      setTracksLoading(false);
      return;
    }
    if (loadError) {
      setTracksLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/exam-tracks");
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && Array.isArray(data) && data.length > 0) {
          setTracks(data);
          if (process.env.NODE_ENV === "development") {
            console.log("[onboarding] exam tracks loaded from API:", data.length);
          }
        } else if (!res.ok && process.env.NODE_ENV === "development") {
          console.warn("[onboarding] exam-tracks API failed:", res.status, data);
        }
      } catch (err) {
        if (!cancelled && process.env.NODE_ENV === "development") {
          console.warn("[onboarding] exam-tracks fetch error:", err);
        }
      } finally {
        if (!cancelled) setTracksLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialTracks.length, loadError]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const exam_track_id = (formData.get("exam_track") as string)?.trim();
    const target_exam_date = (formData.get("target_exam_date") as string)?.trim();
    const studyMinutesRaw = (formData.get("study_minutes_per_day") as string) || "60";
    const study_minutes_per_day = parseInt(studyMinutesRaw, 10);
    const preferred_study_mode = (formData.get("preferred_study_mode") as string)?.trim();

    const payload = {
      exam_track_id,
      target_exam_date,
      study_minutes_per_day: Number.isNaN(study_minutes_per_day) ? 60 : study_minutes_per_day,
      preferred_study_mode,
    };

    if (process.env.NODE_ENV === "development") {
      console.log("[onboarding] submit payload", payload);
    }

    if (!exam_track_id) {
      setError("Please select your exam track.");
      setLoading(false);
      return;
    }

    if (!target_exam_date) {
      setError("Please select your target exam date.");
      setLoading(false);
      return;
    }

    if (!preferred_study_mode) {
      setError("Please select your preferred study mode.");
      setLoading(false);
      return;
    }

    const validMinutes =
      !Number.isNaN(payload.study_minutes_per_day) &&
      payload.study_minutes_per_day >= 15 &&
      payload.study_minutes_per_day <= 480;
    if (!validMinutes) {
      setError("Study minutes must be between 15 and 480.");
      setLoading(false);
      return;
    }

    try {
      if (process.env.NODE_ENV === "development") {
        console.log("[onboarding] sending request", payload);
      }
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (process.env.NODE_ENV === "development") {
        console.log("[onboarding] API response", { status: res.status, ok: res.ok, data });
      }

      if (!res.ok) {
        if (process.env.NODE_ENV === "development") {
          console.error("[onboarding] save error", { status: res.status, ok: res.ok, data });
        }
        throw new Error(data.error ?? `Failed to save (${res.status})`);
      }

      if (process.env.NODE_ENV === "development") {
        console.log("[onboarding] save success, redirecting to /dashboard");
      }
      window.location.assign("/dashboard");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      if (process.env.NODE_ENV === "development") {
        console.error("[onboarding] submit failed", err);
      }
    } finally {
      setLoading(false);
    }
  };

  const hasDbTracks = tracks.length > 0;
  const displayTracks = hasDbTracks ? tracks : FALLBACK_TRACKS;
  const canSubmit = displayTracks.length > 0 && !tracksLoading;

  const showLoadError = !!loadError;
  const showRetry = showLoadError;

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-6"
    >
      {(error || showLoadError) && (
        <div
          role="alert"
          className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200 text-sm font-medium"
        >
          {showLoadError ? loadError : error}
          {showRetry && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-2 block w-full py-2 rounded-lg border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition"
            >
              Retry
            </button>
          )}
        </div>
      )}

      <div>
        <label htmlFor="exam_track" className={labelBase}>
          Exam track
        </label>
        {tracksLoading && (
          <p className="py-2 text-sm text-slate-600 dark:text-slate-400">
            Loading exam tracks…
          </p>
        )}
        {!showLoadError && !tracksLoading && (
          <select
          id="exam_track"
          name="exam_track"
          required
          aria-required="true"
          aria-invalid={!!error}
          defaultValue={initialTrackId ?? ""}
          className={`${inputBase} appearance-none cursor-pointer`}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
            backgroundPosition: "right 0.5rem center",
            backgroundRepeat: "no-repeat",
            backgroundSize: "1.5em 1.5em",
            paddingRight: "2.5rem",
          }}
        >
          <option value="" disabled={!!initialTrackId}>
            {initialTrackId ? "Current track selected" : "Select your exam track"}
          </option>
          {displayTracks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        )}
        {showLoadError && (
          <div
            className="mt-2 p-3 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm"
            aria-live="polite"
          >
            Unable to load exam tracks. Use Retry above.
          </div>
        )}
      </div>

      <div>
        <label htmlFor="target_exam_date" className={labelBase}>
          Target exam date
        </label>
        <input
          type="date"
          id="target_exam_date"
          name="target_exam_date"
          required
          aria-required="true"
          min={new Date().toISOString().split("T")[0]}
          defaultValue={initialTargetDate ? initialTargetDate.slice(0, 10) : undefined}
          className={inputBase}
        />
      </div>

      <div>
        <label htmlFor="study_minutes_per_day" className={labelBase}>
          Study minutes per day
        </label>
        <input
          type="number"
          id="study_minutes_per_day"
          name="study_minutes_per_day"
          required
          aria-required="true"
          min={15}
          max={480}
          defaultValue={initialStudyMinutes ?? 60}
          className={inputBase}
        />
        <p className="mt-1.5 text-sm text-slate-700 dark:text-slate-300">
          Recommended: 30–90 minutes
        </p>
      </div>

      <div>
        <label htmlFor="preferred_study_mode" className={labelBase}>
          Preferred study mode
        </label>
        <select
          id="preferred_study_mode"
          name="preferred_study_mode"
          required
          aria-required="true"
          defaultValue={initialStudyMode ?? "mixed"}
          className={`${inputBase} appearance-none cursor-pointer`}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
            backgroundPosition: "right 0.5rem center",
            backgroundRepeat: "no-repeat",
            backgroundSize: "1.5em 1.5em",
            paddingRight: "2.5rem",
          }}
        >
          {STUDY_MODES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={loading || !canSubmit}
        className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        aria-disabled={loading || !canSubmit}
      >
        {loading ? "Saving..." : tracksLoading ? "Loading..." : "Continue"}
      </button>
      {!hasDbTracks && !tracksLoading && !showLoadError && (
        <p className="text-center text-xs text-slate-500 dark:text-slate-400">
          Using default exam tracks. You can continue.
        </p>
      )}
    </form>
  );
}
