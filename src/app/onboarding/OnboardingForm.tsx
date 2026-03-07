"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { STUDY_MODES } from "@/config/auth";

type Track = { id: string; slug: string; name: string };

export function OnboardingForm({ tracks }: { tracks: Track[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const exam_track_id = formData.get("exam_track") as string;
    const target_exam_date = formData.get("target_exam_date") as string;
    const study_minutes_per_day = parseInt(
      formData.get("study_minutes_per_day") as string,
      10
    );
    const preferred_study_mode = formData.get("preferred_study_mode") as string;

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exam_track_id,
          target_exam_date,
          study_minutes_per_day,
          preferred_study_mode,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6"
    >
      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div>
        <label
          htmlFor="exam_track"
          className="block text-sm font-medium text-slate-700 mb-2"
        >
          Exam track
        </label>
        <select
          id="exam_track"
          name="exam_track"
          required
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          {tracks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="target_exam_date"
          className="block text-sm font-medium text-slate-700 mb-2"
        >
          Target exam date
        </label>
        <input
          type="date"
          id="target_exam_date"
          name="target_exam_date"
          required
          min={new Date().toISOString().split("T")[0]}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <div>
        <label
          htmlFor="study_minutes_per_day"
          className="block text-sm font-medium text-slate-700 mb-2"
        >
          Study minutes per day
        </label>
        <input
          type="number"
          id="study_minutes_per_day"
          name="study_minutes_per_day"
          required
          min={15}
          max={480}
          defaultValue={60}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <div>
        <label
          htmlFor="preferred_study_mode"
          className="block text-sm font-medium text-slate-700 mb-2"
        >
          Preferred study mode
        </label>
        <select
          id="preferred_study_mode"
          name="preferred_study_mode"
          required
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
        disabled={loading}
        className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
      >
        {loading ? "Saving..." : "Continue"}
      </button>
    </form>
  );
}
