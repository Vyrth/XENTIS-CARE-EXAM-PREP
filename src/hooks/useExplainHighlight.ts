"use client";

import { useState, useCallback } from "react";
import type { ExamTrack, ExplainMode } from "@/lib/ai/explain-highlight/types";

export interface ExplainHighlightResponse {
  simpleExplanation: string;
  boardTip: string;
  memoryTrick: string;
  suggestedNextStep: string;
}

export type ExplainHighlightState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: ExplainHighlightResponse }
  | { status: "error"; error: string };

export function useExplainHighlight(examTrack: ExamTrack = "rn") {
  const [state, setState] = useState<ExplainHighlightState>({ status: "idle" });

  const explain = useCallback(
    async (
      selectedText: string,
      mode: ExplainMode = "explain_simple",
      context?: { topicId?: string; systemId?: string; sourceType?: string; sourceId?: string }
    ) => {
      setState({ status: "loading" });
      try {
        const res = await fetch("/api/ai/explain-highlight", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            selectedText,
            examTrack,
            mode,
            topicId: context?.topicId,
            systemId: context?.systemId,
            sourceType: context?.sourceType,
            sourceId: context?.sourceId,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          setState({
            status: "error",
            error: json.error ?? "Request failed",
          });
          return;
        }
        if (json.success && json.data) {
          setState({ status: "success", data: json.data });
        } else {
          setState({ status: "error", error: "Invalid response" });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Network error";
        setState({ status: "error", error: message });
      }
    },
    [examTrack]
  );

  const reset = useCallback(() => {
    setState({ status: "idle" });
  }, []);

  return {
    state,
    explain,
    reset,
    isIdle: state.status === "idle",
    isLoading: state.status === "loading",
    isSuccess: state.status === "success",
    isError: state.status === "error",
  };
}
