"use client";

import { useState, useCallback } from "react";
import type { ExamTrack } from "@/lib/ai/notebook-summary/types";
import type { NotebookSummaryResponse } from "@/lib/ai/notebook-summary/types";

export type NotebookAction =
  | "clean_up"
  | "summarize"
  | "high_yield_bullets"
  | "make_flashcards"
  | "create_mnemonic"
  | "quiz_me";

export type JadeNotebookState =
  | { status: "idle" }
  | { status: "loading"; action: NotebookAction }
  | {
      status: "success";
      action: NotebookAction;
      data: NotebookSummaryResponse | { flashcards: { front: string; back: string }[] } | { mnemonic: string; conceptSummary?: string };
    }
  | { status: "error"; action: NotebookAction; error: string };

export function useJadeNotebookAction(examTrack: ExamTrack = "rn") {
  const [state, setState] = useState<JadeNotebookState>({ status: "idle" });

  const run = useCallback(
    async (action: NotebookAction, noteContent: string): Promise<boolean> => {
      setState({ status: "loading", action });

      try {
        if (action === "quiz_me") {
          setState({ status: "idle" });
          return true;
        }

        if (
          action === "clean_up" ||
          action === "summarize" ||
          action === "high_yield_bullets"
        ) {
          const summaryMode =
            action === "clean_up"
              ? "clean_summary"
              : action === "summarize"
                ? "board_focus"
                : "high_yield";
          const res = await fetch("/api/ai/notebook-summary", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              noteText: noteContent,
              examTrack,
              summaryMode,
              sourceType: "manual_note",
            }),
          });
          const json = await res.json();
          if (!res.ok) {
            setState({ status: "error", action, error: json.error ?? "Request failed" });
            return false;
          }
          if (json.success && json.data) {
            setState({ status: "success", action, data: json.data });
            return true;
          }
          setState({ status: "error", action, error: "Invalid response" });
          return false;
        }

        if (action === "make_flashcards") {
          const res = await fetch("/api/ai/generate-flashcards", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sourceText: noteContent,
              examTrack,
              sourceType: "manual_note",
            }),
          });
          const json = await res.json();
          if (!res.ok) {
            setState({ status: "error", action, error: json.error ?? "Request failed" });
            return false;
          }
          if (json.success && json.data?.flashcards) {
            const raw = json.data.flashcards;
            const cards = raw.map(
              (c: { front_text?: string; back_text?: string; front?: string; back?: string }) => ({
                front: c.front_text ?? c.front ?? "",
                back: c.back_text ?? c.back ?? "",
              })
            );
            setState({ status: "success", action, data: { flashcards: cards } });
            return true;
          }
          setState({ status: "error", action, error: "Invalid response" });
          return false;
        }

        if (action === "create_mnemonic") {
          const res = await fetch("/api/ai/mnemonic", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              selectedText: noteContent.slice(0, 1500),
              examTrack,
              sourceType: "manual_note",
            }),
          });
          const json = await res.json();
          if (!res.ok) {
            setState({ status: "error", action, error: json.error ?? "Request failed" });
            return false;
          }
          if (json.success && json.data) {
            const d = json.data;
            setState({
              status: "success",
              action,
              data: {
                mnemonic: d.mnemonic,
                conceptSummary: d.conceptSummary,
              },
            });
            return true;
          }
          setState({ status: "error", action, error: "Invalid response" });
          return false;
        }

        setState({ status: "error", action, error: "Unknown action" });
        return false;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Network error";
        setState({ status: "error", action, error: message });
        return false;
      }
    },
    [examTrack]
  );

  const reset = useCallback(() => {
    setState({ status: "idle" });
  }, []);

  return {
    state,
    run,
    reset,
    isIdle: state.status === "idle",
    isLoading: state.status === "loading",
    isSuccess: state.status === "success",
    isError: state.status === "error",
  };
}
