"use client";

import { useState, useCallback, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { SourceCopyrightForm } from "./SourceCopyrightForm";
import { saveSourceEvidence, saveContentSourceLinks } from "@/app/(app)/actions/source-evidence";
import type { SourceBasis, LegalStatus } from "@/lib/admin/source-evidence";
import { AI_ORIGINAL_AUTHOR_NOTES } from "@/lib/admin/source-evidence";
import type { ContentSource } from "@/types/admin";
import { Icons } from "@/components/ui/icons";

const SOURCE_BASIS_OPTIONS: { value: SourceBasis; label: string }[] = [
  { value: "original", label: "Original (platform-authored)" },
  { value: "licensed", label: "Adapted from licensed material" },
  { value: "internal", label: "Internal reference basis" },
  { value: "pending", label: "Pending classification" },
];

const LEGAL_STATUS_OPTIONS: { value: LegalStatus; label: string; color: string }[] = [
  { value: "original", label: "Original", color: "text-emerald-600" },
  { value: "adapted", label: "Adapted (cleared)", color: "text-emerald-600" },
  { value: "pending_legal", label: "Pending legal review", color: "text-amber-600" },
  { value: "blocked", label: "Blocked", color: "text-red-600" },
];

const INPUT_CLASS =
  "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm";

export interface SourceEvidencePanelProps {
  contentType: string;
  contentId: string;
  initialSourceBasis?: SourceBasis;
  initialLegalStatus?: LegalStatus;
  initialLegalNotes?: string | null;
  initialAuthorNotes?: string | null;
  sources: ContentSource[];
  selectedSourceIds: string[];
  onSourceToggle?: (id: string) => void;
  onAddSource?: () => void;
  /** When true, show internal-only legal notes (admin only) */
  showLegalNotes?: boolean;
  /** When true, fields are auto-filled for AI-generated content; manual entry not required */
  isAIAutoFilled?: boolean;
}

export function SourceEvidencePanel({
  contentType,
  contentId,
  initialSourceBasis = "pending",
  initialLegalStatus = "pending_legal",
  initialLegalNotes,
  initialAuthorNotes,
  sources,
  selectedSourceIds,
  onSourceToggle: onSourceToggleProp,
  onAddSource,
  showLegalNotes = true,
  isAIAutoFilled = false,
}: SourceEvidencePanelProps) {
  const [sourceBasis, setSourceBasis] = useState<SourceBasis>(initialSourceBasis);
  const [selectedIds, setSelectedIds] = useState<string[]>(selectedSourceIds);

  useEffect(() => {
    setSelectedIds(selectedSourceIds);
  }, [contentId, selectedSourceIds]);
  const [legalStatus, setLegalStatus] = useState<LegalStatus>(initialLegalStatus);
  const [legalNotes, setLegalNotes] = useState(initialLegalNotes ?? "");
  const [authorNotes, setAuthorNotes] = useState(initialAuthorNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSourceToggle = useCallback(
    async (id: string) => {
      const next = selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id];
      setSelectedIds(next);
      onSourceToggleProp?.(id);
      await saveContentSourceLinks(contentType, contentId, next);
    },
    [contentType, contentId, selectedIds, onSourceToggleProp]
  );

  const handleSave = useCallback(async () => {
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const r = await saveSourceEvidence(contentType, contentId, {
        sourceBasis,
        legalStatus,
        legalNotes: legalNotes.trim() || null,
        authorNotes: authorNotes.trim() || null,
      });
      if (r.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        setError(r.error ?? "Save failed");
      }
    } finally {
      setSaving(false);
    }
  }, [contentType, contentId, sourceBasis, legalStatus, legalNotes, authorNotes]);

  const legalStatusOption = LEGAL_STATUS_OPTIONS.find((o) => o.value === legalStatus);

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          {Icons.shield} Source Evidence & Copyright
        </h3>
        <span
          className={`text-sm font-medium ${
            legalStatus === "blocked"
              ? "text-red-600"
              : legalStatus === "pending_legal"
                ? "text-amber-600"
                : "text-emerald-600"
          }`}
        >
          {legalStatusOption?.label ?? legalStatus}
        </span>
      </div>

      <p className="text-xs text-slate-500 mb-4">
        {isAIAutoFilled
          ? "Auto-filled for AI-generated content. Manual entry not required for routine publish."
          : "Required for publish. Legal metadata is internal-only and never exposed to learners."}
      </p>
      {isAIAutoFilled && (
        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-sm mb-4">
          Legal status cleared for AI-generated original content from approved internal framework.
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm mb-4">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
            Source Basis
          </label>
          <select
            value={sourceBasis}
            onChange={(e) => setSourceBasis(e.target.value as SourceBasis)}
            className={INPUT_CLASS}
          >
            {SOURCE_BASIS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
            Legal Status
          </label>
          <select
            value={legalStatus}
            onChange={(e) => setLegalStatus(e.target.value as LegalStatus)}
            className={INPUT_CLASS}
          >
            {LEGAL_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {(legalStatus === "blocked" || legalStatus === "pending_legal") && (
            <p className="text-xs text-amber-600 mt-1">
              Content cannot be published until legal status is cleared.
            </p>
          )}
        </div>

        <SourceCopyrightForm
          sources={sources}
          selectedIds={selectedIds}
          onToggle={handleSourceToggle}
          onAddSource={onAddSource}
        />

        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
            Author / Attribution Notes
          </label>
          <textarea
            value={authorNotes}
            onChange={(e) => setAuthorNotes(e.target.value)}
            placeholder="For original content: author, date, internal reference"
            className={INPUT_CLASS}
            rows={2}
          />
        </div>

        {showLegalNotes && (
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
              Legal Notes <span className="text-xs text-slate-500">(internal only)</span>
            </label>
            <textarea
              value={legalNotes}
              onChange={(e) => setLegalNotes(e.target.value)}
              placeholder="Internal notes for legal review"
              className={INPUT_CLASS}
              rows={3}
            />
          </div>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : saved ? "Saved" : "Save Source Evidence"}
        </button>
      </div>
    </Card>
  );
}
