"use client";

/**
 * Required track selector for admin create/edit forms.
 * Track-first: every content object must belong to a track.
 */

export interface ExamTrackOption {
  id: string;
  slug: string;
  name: string;
}

export interface AdminTrackSelectProps {
  tracks: ExamTrackOption[];
  value: string;
  onChange: (trackId: string) => void;
  required?: boolean;
  disabled?: boolean;
  /** Show "Shared" option for content types that support it (e.g. topic summaries) */
  allowShared?: boolean;
  id?: string;
  className?: string;
}

export function AdminTrackSelect({
  tracks,
  value,
  onChange,
  required = true,
  disabled = false,
  allowShared = false,
  id = "admin-track-select",
  className = "",
}: AdminTrackSelectProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
        Track {required && <span className="text-amber-600" aria-hidden>*</span>}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        aria-required={required}
        aria-label="Exam track (required)"
        className={`w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white ${className}`}
      >
        <option value="">
          {allowShared ? "Select track or Shared…" : "Select track…"}
        </option>
        {allowShared && (
          <option value="__shared__">Shared (all tracks)</option>
        )}
        {tracks.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name} ({t.slug.toUpperCase()})
          </option>
        ))}
      </select>
      {required && !value && (
        <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
          Track assignment is required. Content cannot be published without a track.
        </p>
      )}
    </div>
  );
}
