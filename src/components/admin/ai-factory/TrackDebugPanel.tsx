"use client";

import { resolveSelectedTrack } from "@/lib/ai/factory/resolve-track";
import type { GenerationConfig } from "@/lib/ai/factory/types";

export interface TrackDebugPanelProps {
  config: GenerationConfig;
  tracks: { id: string; slug: string; name: string }[];
  payloadPreview?: Record<string, unknown>;
  validationBlocked?: string;
}

/** Development-only debug panel for track selection and payload */
export function TrackDebugPanel({
  config,
  tracks,
  payloadPreview,
  validationBlocked,
}: TrackDebugPanelProps) {
  if (process.env.NODE_ENV !== "development") return null;

  const resolved = resolveSelectedTrack(tracks, config.trackId, config.trackSlug);

  return (
    <details className="mt-2 p-3 rounded-lg bg-slate-100 dark:bg-slate-800/50 text-xs font-mono">
      <summary className="cursor-pointer text-slate-500 hover:text-slate-700 dark:hover:text-slate-400">
        Track debug (dev only)
      </summary>
      <div className="mt-2 space-y-1 text-slate-600 dark:text-slate-400">
        <div>selectedTrackId: {config.trackId || "(empty)"}</div>
        <div>selectedTrackSlug: {config.trackSlug || "(empty)"}</div>
        <div>
          resolved: {resolved ? `${resolved.name} (${resolved.slug})` : "null"}
        </div>
        {payloadPreview && (
          <div>
            payload: {JSON.stringify(payloadPreview).slice(0, 120)}…
          </div>
        )}
        {validationBlocked && (
          <div className="text-amber-600 dark:text-amber-400">
            validation blocked: {validationBlocked}
          </div>
        )}
      </div>
    </details>
  );
}
