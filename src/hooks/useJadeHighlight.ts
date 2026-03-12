"use client";

import { useState, useCallback } from "react";
import type { ExamTrack } from "@/lib/ai/explain-highlight/types";

export type JadeHighlightAction =
  | "explain_simple"
  | "board_focus"
  | "deep_dive"
  | "mnemonic"
  | "compare"
  | "flashcards"
  | "summarize";

export interface JadeHighlightContext {
  sourceType: string;
  sourceId?: string;
  topicId?: string;
  systemId?: string;
  systemName?: string;
  topicName?: string;
  concepts?: string[];
}

export type JadeHighlightState =
  | { status: "idle" }
  | { status: "loading"; action: JadeHighlightAction }
  | { status: "success"; action: JadeHighlightAction; data: JadeHighlightData }
  | { status: "error"; action: JadeHighlightAction; error: string };

export type JadeHighlightData =
  | { type: "explain"; content: string; simpleExplanation?: string; boardTip?: string; memoryTrick?: string; suggestedNextStep?: string }
  | { type: "mnemonic"; content: string; mnemonic?: string; conceptSummary?: string; whyItWorks?: string }
  | { type: "compare"; content: string }
  | { type: "flashcards"; content: string; flashcards?: { front: string; back: string }[] }
  | { type: "summarize"; content: string };

const DEV = process.env.NODE_ENV === "development";

function devLog(sourceType: string, track: string, action: JadeHighlightAction, selectedText: string) {
  if (DEV) {
    console.log("[JadeHighlight]", { sourceType, track, action, textLength: selectedText.length });
  }
}

export function useJadeHighlight(
  examTrack: ExamTrack = "rn",
  context?: JadeHighlightContext
) {
  const [state, setState] = useState<JadeHighlightState>({ status: "idle" });

  const run = useCallback(
    async (action: JadeHighlightAction, selectedText: string): Promise<boolean> => {
      const sourceType = context?.sourceType ?? "unknown";
      devLog(sourceType, examTrack, action, selectedText);

      setState({ status: "loading", action });

      try {
        if (action === "explain_simple" || action === "board_focus" || action === "deep_dive") {
          const mode = action === "explain_simple" ? "explain_simple" : action === "board_focus" ? "board_focus" : "deep_dive";
          const res = await fetch("/api/ai/explain-highlight", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              selectedText,
              examTrack,
              mode,
              topicId: context?.topicId,
              systemId: context?.systemId,
              sourceType,
              sourceId: context?.sourceId,
            }),
          });
          const json = await res.json();
          if (!res.ok) {
            setState({ status: "error", action, error: json.error ?? "Request failed" });
            return false;
          }
          if (json.success && json.data) {
            const d = json.data;
            const content = [d.simpleExplanation, d.boardTip, d.memoryTrick, d.suggestedNextStep]
              .filter(Boolean)
              .join("\n\n");
            setState({
              status: "success",
              action,
              data: {
                type: "explain",
                content,
                simpleExplanation: d.simpleExplanation,
                boardTip: d.boardTip,
                memoryTrick: d.memoryTrick,
                suggestedNextStep: d.suggestedNextStep,
              },
            });
            return true;
          }
          setState({ status: "error", action, error: "Invalid response" });
          return false;
        }

        if (action === "mnemonic") {
          const res = await fetch("/api/ai/mnemonic", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              selectedText,
              examTrack,
              topicId: context?.topicId,
              systemId: context?.systemId,
              sourceType,
              sourceId: context?.sourceId,
            }),
          });
          const json = await res.json();
          if (!res.ok) {
            setState({ status: "error", action, error: json.error ?? "Request failed" });
            return false;
          }
          if (json.success && json.data) {
            const d = json.data;
            const content = [d.conceptSummary, d.mnemonic, d.whyItWorks, d.boardTip]
              .filter(Boolean)
              .join("\n\n");
            setState({
              status: "success",
              action,
              data: {
                type: "mnemonic",
                content,
                mnemonic: d.mnemonic,
                conceptSummary: d.conceptSummary,
                whyItWorks: d.whyItWorks,
              },
            });
            return true;
          }
          setState({ status: "error", action, error: "Invalid response" });
          return false;
        }

        if (action === "compare") {
          const concepts = context?.concepts?.filter((c): c is string => !!c) ?? [];
          if (concepts.length < 2) {
            setState({
              status: "error",
              action,
              error: "Need at least 2 concepts to compare. Add system and topic context.",
            });
            return false;
          }
          const { compareConcepts } = await import("@/app/actions/ai");
          const result = await compareConcepts({ concepts });
          if (result.success && result.data?.content) {
            setState({
              status: "success",
              action,
              data: { type: "compare", content: result.data.content },
            });
            return true;
          }
          setState({
            status: "error",
            action,
            error: (result as { error?: string }).error ?? "Request failed",
          });
          return false;
        }

        if (action === "flashcards") {
          const res = await fetch("/api/ai/generate-flashcards", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sourceText: selectedText,
              examTrack,
              topicId: context?.topicId,
              systemId: context?.systemId,
              sourceType,
              sourceId: context?.sourceId,
            }),
          });
          const json = await res.json();
          if (!res.ok) {
            setState({ status: "error", action, error: json.error ?? "Request failed" });
            return false;
          }
          if (json.success && json.data) {
            const raw = json.data.flashcards ?? [];
            const cards = raw.map((c: { front_text?: string; back_text?: string; front?: string; back?: string }) => ({
              front: c.front_text ?? c.front ?? "",
              back: c.back_text ?? c.back ?? "",
            }));
            const content = cards
              .map((c: { front: string; back: string }) => `${c.front}\n→ ${c.back}`)
              .join("\n\n");
            setState({
              status: "success",
              action,
              data: {
                type: "flashcards",
                content,
                flashcards: cards,
              },
            });
            return true;
          }
          setState({ status: "error", action, error: "Invalid response" });
          return false;
        }

        if (action === "summarize") {
          const res = await fetch("/api/ai/notebook-summary", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              noteText: selectedText,
              examTrack,
              topicId: context?.topicId,
              systemId: context?.systemId,
              sourceType,
              sourceId: context?.sourceId,
            }),
          });
          const json = await res.json();
          if (!res.ok) {
            setState({ status: "error", action, error: json.error ?? "Request failed" });
            return false;
          }
          if (json.success && json.data) {
            const { toPlainTextNote } = await import("@/lib/ai/notebook-summary/summary-formatter");
            const content = toPlainTextNote(json.data);
            setState({
              status: "success",
              action,
              data: { type: "summarize", content },
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
    [examTrack, context]
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
