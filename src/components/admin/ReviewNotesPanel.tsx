"use client";

import { useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { addContentReviewNote } from "@/app/(app)/actions/content-review";
import type { ReviewNoteRow } from "@/lib/admin/review-workflow";
import { LANE_LABELS } from "@/lib/admin/review-workflow";

const ROLE_LABELS: Record<string, string> = {
  editor: "Editor",
  sme: "SME",
  legal: "Legal",
  qa: "QA",
  system: "System",
};

export interface ReviewNotesPanelProps {
  entityType: string;
  entityId: string;
  initialNotes: ReviewNoteRow[];
  currentUserRole?: string;
  onNoteAdded?: () => void;
}

export function ReviewNotesPanel({
  entityType,
  entityId,
  initialNotes,
  currentUserRole = "content_editor",
  onNoteAdded,
}: ReviewNotesPanelProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = useCallback(async () => {
    if (!newNote.trim()) return;
    setError(null);
    setSaving(true);
    try {
      const r = await addContentReviewNote(
        entityType,
        entityId,
        null,
        currentUserRole,
        newNote.trim()
      );
      if (r.success) {
        setNotes((prev) => [
          {
            id: "temp",
            entityType,
            entityId,
            authorId: null,
            roleSlug: currentUserRole,
            content: newNote.trim(),
            action: null,
            fromStatus: null,
            toStatus: null,
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
        setNewNote("");
        onNoteAdded?.();
      } else {
        setError(r.error ?? "Failed to add note");
      }
    } finally {
      setSaving(false);
    }
  }, [entityType, entityId, newNote, currentUserRole, onNoteAdded]);

  return (
    <Card>
      <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Review Notes & History</h3>

      <div className="space-y-4">
        <div>
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a review note…"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
            rows={3}
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-slate-500">
              Role: {ROLE_LABELS[currentUserRole] ?? currentUserRole}
            </span>
            <button
              type="button"
              onClick={handleAdd}
              disabled={saving || !newNote.trim()}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "Adding…" : "Add Note"}
            </button>
          </div>
          {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto">
          {notes.length === 0 ? (
            <p className="text-slate-500 text-sm">No review notes yet.</p>
          ) : (
            notes.map((n) => (
              <div
                key={n.id}
                className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-sm"
              >
                <div className="flex justify-between items-start gap-2">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {ROLE_LABELS[n.roleSlug] ?? n.roleSlug}
                  </span>
                  <span className="text-xs text-slate-500">
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 text-slate-600 dark:text-slate-400">{n.content}</p>
                {n.action && (
                  <p className="mt-1 text-xs text-slate-500">
                    {n.fromStatus} → {n.toStatus}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </Card>
  );
}
