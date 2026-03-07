"use client";

import { useState, useCallback } from "react";
import type { Note } from "@/data/mock/types";

// Mock - replace with Supabase mutation
export function useNotebook() {
  const [notes, setNotes] = useState<Note[]>([]);

  const addNote = useCallback((content: string, contentRef?: string) => {
    const note: Note = {
      id: `n-${Date.now()}`,
      content,
      contentRef,
      createdAt: new Date().toISOString(),
    };
    setNotes((prev) => [note, ...prev]);
    return note.id;
  }, []);

  const deleteNote = useCallback((id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const updateNote = useCallback((id: string, content: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, content } : n))
    );
  }, []);

  return { notes, addNote, deleteNote, updateNote };
}
