"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { useNotebook } from "@/hooks/useNotebook";
import { MOCK_NOTES } from "@/data/mock/notes";
import { Icons } from "@/components/ui/icons";

export default function NotebookPage() {
  const router = useRouter();
  const { notes: hookNotes, addNote, deleteNote, updateNote } = useNotebook();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const displayNotes = [...MOCK_NOTES, ...hookNotes];

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

  const handleAskAI = (content: string, action: "summarize" | "quiz") => {
    const params = new URLSearchParams({
      context: content.slice(0, 500),
      action: action === "summarize" ? "summarize" : "quiz",
    });
    router.push(`/ai-tutor?${params.toString()}`);
  };

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        Notebook
      </h1>
      <p className="text-slate-600 dark:text-slate-400">
        Notes saved from study guides, rationales, and highlights. Highlight text elsewhere and choose &quot;Save to Notebook.&quot;
      </p>

      {displayNotes.length === 0 ? (
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
                      <div className="flex gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleAskAI(note.content, "summarize")}
                          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          Summarize (AI)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAskAI(note.content, "quiz")}
                          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          Quiz me (AI)
                        </button>
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
    </div>
  );
}
