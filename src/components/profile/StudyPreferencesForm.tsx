"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { STUDY_MODES } from "@/config/auth";

type Track = { id: string; slug: string; name: string };

const inputBase =
  "w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none disabled:opacity-50";
const labelBase = "block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2";

export interface StudyPreferencesFormProps {
  currentTrackId: string | null;
  targetExamDate: string | null;
  studyMinutesPerDay: number | null;
  preferredStudyMode: string | null;
  tracks: Track[];
}

export function StudyPreferencesForm({
  currentTrackId,
  targetExamDate,
  studyMinutesPerDay,
  preferredStudyMode,
  tracks: initialTracks,
}: StudyPreferencesFormProps) {
  const router = useRouter();
  const [tracks, setTracks] = useState<Track[]>(initialTracks);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [examTrackId, setExamTrackId] = useState(currentTrackId ?? "");
  const [targetDate, setTargetDate] = useState(
    targetExamDate ? targetExamDate.slice(0, 10) : ""
  );
  const [studyMinutes, setStudyMinutes] = useState(
    String(studyMinutesPerDay ?? 30)
  );
  const [studyMode, setStudyMode] = useState(preferredStudyMode ?? "mixed");

  useEffect(() => {
    setExamTrackId(currentTrackId ?? "");
    setTargetDate(targetExamDate ? targetExamDate.slice(0, 10) : "");
    setStudyMinutes(String(studyMinutesPerDay ?? 30));
    setStudyMode(preferredStudyMode ?? "mixed");
  }, [currentTrackId, targetExamDate, studyMinutesPerDay, preferredStudyMode]);

  useEffect(() => {
    if (initialTracks.length > 0) return;
    fetch("/api/exam-tracks")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setTracks(data);
      })
      .catch(() => {});
  }, [initialTracks.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const trackId = examTrackId?.trim();
    const date = targetDate?.trim();
    const minutes = parseInt(studyMinutes, 10);

    if (!trackId) {
      setError("Please select your exam track.");
      setLoading(false);
      return;
    }
    if (!date) {
      setError("Please select your target exam date.");
      setLoading(false);
      return;
    }
    if (Number.isNaN(minutes) || minutes < 0 || minutes > 480) {
      setError("Study minutes must be between 0 and 480.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exam_track_id: trackId,
          target_exam_date: date,
          study_minutes_per_day: minutes,
          preferred_study_mode: studyMode,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error ?? `Failed to save (${res.status})`);
      }

      setSuccess(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const displayTracks = tracks.length > 0 ? tracks : [];

  return (
    <Card>
      <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
        Study Preferences
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div
            role="alert"
            className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200 text-sm font-medium"
          >
            {error}
          </div>
        )}
        {success && (
          <div
            role="status"
            className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 text-sm font-medium"
          >
            Saved successfully.
          </div>
        )}

        <div>
          <label htmlFor="profile_exam_track" className={labelBase}>
            Exam track
          </label>
          <select
            id="profile_exam_track"
            value={examTrackId}
            onChange={(e) => setExamTrackId(e.target.value)}
            className={`${inputBase} appearance-none cursor-pointer`}
            style={{
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundPosition: "right 0.5rem center",
              backgroundRepeat: "no-repeat",
              backgroundSize: "1.5em 1.5em",
              paddingRight: "2.5rem",
            }}
          >
            <option value="">Select track</option>
            {displayTracks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="profile_target_exam_date" className={labelBase}>
            Target exam date
          </label>
          <input
            type="date"
            id="profile_target_exam_date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className={inputBase}
          />
        </div>

        <div>
          <label htmlFor="profile_study_minutes" className={labelBase}>
            Study minutes per day
          </label>
          <input
            type="number"
            id="profile_study_minutes"
            value={studyMinutes}
            onChange={(e) => setStudyMinutes(e.target.value)}
            min={0}
            max={480}
            className={inputBase}
          />
        </div>

        <div>
          <label htmlFor="profile_study_mode" className={labelBase}>
            Preferred study mode
          </label>
          <select
            id="profile_study_mode"
            value={studyMode}
            onChange={(e) => setStudyMode(e.target.value)}
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
          disabled={loading || displayTracks.length === 0}
          className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? "Saving…" : "Save Preferences"}
        </button>
      </form>
    </Card>
  );
}
