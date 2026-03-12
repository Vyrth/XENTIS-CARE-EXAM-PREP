"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { JadeNotebookActionPanel } from "@/components/study/JadeNotebookActionPanel";
import { useNotebook } from "@/hooks/useNotebook";
import { useJadeNotebookAction } from "@/hooks/useJadeNotebookAction";
import { useTrack } from "@/hooks/useTrack";
import { Icons } from "@/components/ui/icons";
import type { NotebookAction } from "@/hooks/useJadeNotebookAction";

export default function NotebookPage() {
  const router = useRouter();
  const track = useTrack();
  const { notes: hookNotes, loading: notesLoading, error: notesError, addNote, deleteNote, updateNote, refetch } = useNotebook();
  const { state: jadeState, run: runJade, reset: resetJade } = useJadeNotebookAction(track ?? "rn");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [activeNoteContent, setActiveNoteContent] = useState<string | null>(null);
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);

  const displayNotes = hookNotes;

  const handleEdit = (id: string, content: string) => {
    setEditingId(id);
    setEditContent(content);
  };

  const handleSaveEdit = () => {
    if (editingId) {
      updateNote(editingId, editContent);
      setEditingId(null);
    }
  };

  const handleJadeAction = useCallback(
    (action: NotebookAction, content: string) => {
      if (action === "quiz_me") {
        const params = new URLSearchParams({
          context: content.slice(0, 500),
          action: "quiz",
        });
        router.push(`/ai-tutor?${params.toString()}`);
        return;
      }
      setActiveNoteContent(content);
      setShowActionMenu(null);
      resetJade();
      runJade(action, content);
    },
    [runJade, resetJade, router]
  );

  const handleSaveAsNote = useCallback(
    async (content: string) => {
      await addNote(content, "notebook_jade");
      resetJade();
      setActiveNoteContent(null);
    },
    [addNote, resetJade]
  );

  const handleSaveAsFlashcards = useCallback(
    async (flashcards: { front: string; back: string }[]) => {
      const res = await fetch("/api/flashcards/save-deck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flashcards,
          sourceContentType: "notebook",
        }),
      });
      const json = await res.json();
      if (json.success && json.deckId) {
        router.push(`/flashcards/${json.deckId}`);
      }
      resetJade();
      setActiveNoteContent(null);
    },
    [resetJade, router]
  );

  const handleQuizMe = useCallback(
    (content: string) => {
      const params = new URLSearchParams({
        context: content.slice(0, 500),
        action: "quiz",
      });
      router.push(`/ai-tutor?${params.toString()}`);
      resetJade();
      setActiveNoteContent(null);
    },
    [router, resetJade]
  );

  const actions: { key: NotebookAction; label: string }[] = [
    { key: "clean_up", label: "Clean up my note" },
    { key: "summarize", label: "Summarize" },
    { key: "high_yield_bullets", label: "Make high-yield bullets" },
    { key: "make_flashcards", label: "Make flashcards" },
    { key: "create_mnemonic", label: "Create mnemonic" },
    { key: "quiz_me", label: "Quiz me" },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        Notebook
      </h1>
      <p className="text-slate-600 dark:text-slate-400">
        Notes saved from study guides, rationales, and highlights. Use Jade to clean up, summarize,
        or turn notes into flashcards.
      </p>

      {notesLoading ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-slate-500 dark:text-slate-400">Loading notes...</p>
          </div>
        </Card>
      ) : notesError ? (
        <Card className="border-amber-200 dark:border-amber-800">
          <div className="text-center py-12">
            <p className="text-amber-700 dark:text-amber-300">{notesError}</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-4 px-4 py-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 font-medium"
            >
              Retry
            </button>
          </div>
        </Card>
      ) : displayNotes.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <span className="inline-block mb-4 text-slate-400">{Icons.notebook}</span>
            <p className="text-slate-500 dark:text-slate-400">No notes yet.</p>
            <Link
              href="/study-guides"
              className="inline-flex mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700"
            >
              Start studying
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {displayNotes.map((note) => {
            const isFromHook = hookNotes.some((n) => n.id === note.id);
            const menuOpen = showActionMenu === note.id;
            return (
              <Card key={note.id}>
                {editingId === note.id ? (
                  <div>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white min-h-[100px]"
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                      {note.content}
                    </p>
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-xs text-slate-500">
                        {new Date(note.createdAt).toLocaleDateString()}
                      </span>
                      <div className="flex gap-2 flex-wrap relative">
                        <button
                          type="button"
                          onClick={() =>
                            setShowActionMenu(menuOpen ? null : note.id)
                          }
                          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                        >
                          Jade Tutor ▾
                        </button>
                        {menuOpen && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setShowActionMenu(null)}
                              aria-hidden="true"
                            />
                            <div className="absolute right-0 top-full mt-1 z-20 w-56 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg">
                              {actions.map((a) => (
                                <button
                                  key={a.key}
                                  type="button"
                                  onClick={() =>
                                    handleJadeAction(a.key, note.content)
                                  }
                                  className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                                >
                                  {a.label}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                        {isFromHook && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleEdit(note.id, note.content)}
                              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteNote(note.id)}
                              className="text-sm text-red-600 dark:text-red-400 hover:underline"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <JadeNotebookActionPanel
        state={jadeState}
        originalText={activeNoteContent ?? undefined}
        onClose={() => {
          resetJade();
          setActiveNoteContent(null);
        }}
        onRetry={() =>
          activeNoteContent &&
          jadeState.status === "error" &&
          "action" in jadeState &&
          runJade(jadeState.action, activeNoteContent)
        }
        onSaveAsNote={handleSaveAsNote}
        onSaveAsFlashcards={handleSaveAsFlashcards}
        onQuizMe={handleQuizMe}
      />
    </div>
  );
}
