"use client";

import { useState } from "react";
import { generateAdminDraft } from "@/app/(app)/actions/admin-drafts";

export interface GenerateMnemonicButtonProps {
  conceptOrText: string;
  trackId: string;
  trackSlug: "lvn" | "rn" | "fnp" | "pmhnp";
  systemId?: string;
  systemName?: string;
  topicId?: string;
  topicName?: string;
  onGenerated: (mnemonic: string) => void;
}

export function GenerateMnemonicButton({
  conceptOrText,
  trackId,
  trackSlug,
  systemId,
  systemName,
  topicId,
  topicName,
  onGenerated,
}: GenerateMnemonicButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (!conceptOrText?.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const r = await generateAdminDraft({
        type: "mnemonic",
        params: {
          track: trackSlug,
          trackId,
          systemId,
          systemName,
          topicId,
          topicName,
        },
        conceptOrText: conceptOrText.trim(),
      });
      if (r.success && r.output && typeof r.output === "object" && "data" in r.output) {
        const d = (r.output as { data: { mnemonic: string } }).data;
        onGenerated(d.mnemonic);
      } else {
        setError(r.error ?? "Failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading || !conceptOrText?.trim()}
        className="text-xs text-amber-600 hover:underline disabled:opacity-50"
      >
        {loading ? "…" : "AI mnemonic"}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </span>
  );
}
