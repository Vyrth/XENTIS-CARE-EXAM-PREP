"use client";

import { useState } from "react";
import { generateAdminDraft } from "@/app/(app)/actions/admin-drafts";

export interface GenerateDistractorButtonProps {
  optionText: string;
  correctOptionText: string;
  stem: string;
  trackId: string;
  trackSlug: "lvn" | "rn" | "fnp" | "pmhnp";
  systemId?: string;
  systemName?: string;
  topicId?: string;
  topicName?: string;
  onGenerated: (rationale: string) => void;
}

export function GenerateDistractorButton({
  optionText,
  correctOptionText,
  stem,
  trackId,
  trackSlug,
  systemId,
  systemName,
  topicId,
  topicName,
  onGenerated,
}: GenerateDistractorButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (!optionText?.trim() || !correctOptionText?.trim() || !stem?.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const r = await generateAdminDraft({
        type: "distractor_rationale",
        params: {
          track: trackSlug,
          trackId,
          systemId,
          systemName,
          topicId,
          topicName,
        },
        optionText,
        correctOptionText,
        stem,
      });
      if (r.success && r.output && typeof r.output === "object" && "data" in r.output) {
        const d = (r.output as { data: { distractorRationale: string } }).data;
        onGenerated(d.distractorRationale);
      } else {
        setError(r.error ?? "Failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const canGenerate = optionText?.trim() && correctOptionText?.trim() && stem?.trim();

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading || !canGenerate}
        className="text-xs text-indigo-600 hover:underline disabled:opacity-50"
      >
        {loading ? "…" : "AI"}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </span>
  );
}
