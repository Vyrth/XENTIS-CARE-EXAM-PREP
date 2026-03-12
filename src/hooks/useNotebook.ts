"use client";

import { useState, useCallback, useEffect } from "react";
import type { Note } from "@/data/mock/types";

export function useNotebook() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/notebook/notes");
      if (!res.ok) throw new Error("Failed to load notes");
      const data = await res.json();
      const mapped: Note[] = (data.notes ?? []).map((n: { id: string; content: string; contentRef?: string; createdAt: string }) => ({
        id: n.id,
        content: n.content,
        contentRef: n.contentRef,
        createdAt: n.createdAt,
      }));
      setNotes(mapped);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load notes");
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const addNote = useCallback(
    async (content: string, contentRef?: string, contentId?: string | undefined): Promise<string> => {
      try {
        const res = await fetch("/api/notebook/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, contentRef, contentId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to save");
        const note: Note = {
          id: data.note.id,
          content: data.note.content,
          contentRef: data.note.contentRef,
          createdAt: data.note.createdAt,
        };
        setNotes((prev) => [note, ...prev]);
        return note.id;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to save";
        setError(msg);
        const fallbackId = `n-${Date.now()}`;
        setNotes((prev) => [{ id: fallbackId, content, contentRef, createdAt: new Date().toISOString() }, ...prev]);
        return fallbackId;
      }
    },
    []
  );

  const deleteNote = useCallback(async (id: string) => {
    if (id.startsWith("n-")) {
      setNotes((prev) => prev.filter((n) => n.id !== id));
      return;
    }
    try {
      const res = await fetch(`/api/notebook/notes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    }
  }, []);

  const updateNote = useCallback(async (id: string, content: string) => {
    if (id.startsWith("n-")) {
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, content } : n)));
      return;
    }
    try {
      const res = await fetch(`/api/notebook/notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, content } : n)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    }
  }, []);

  return { notes, loading, error, addNote, deleteNote, updateNote, refetch: fetchNotes };
}
