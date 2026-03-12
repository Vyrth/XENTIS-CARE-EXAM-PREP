"use client";

import { useState, useCallback } from "react";
import type {
  ExamTrack,
  NotebookSummaryResponse,
  NotebookSummarySavePayload,
  SummaryMode,
} from "@/lib/ai/notebook-summary/types";

export type NotebookSummaryState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "success";
      data: NotebookSummaryResponse;
      savePayload?: NotebookSummarySavePayload;
    }
  | { status: "error"; error: string };

export function useNotebookSummary(examTrack: ExamTrack = "rn") {
  const [state, setState] = useState<NotebookSummaryState>({ status: "idle" });

  const summarize = useCallback(
    async (
      noteText: string,
      options?: {
        summaryMode?: SummaryMode;
        topicId?: string;
        systemId?: string;
        sourceType?: string;
        sourceId?: string;
        analytics?: Record<string, unknown>;
      }
    ) => {
      setState({ status: "loading" });
      try {
        const res = await fetch("/api/ai/notebook-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            noteText,
            examTrack,
            summaryMode: options?.summaryMode ?? "clean_summary",
            topicId: options?.topicId,
            systemId: options?.systemId,
            sourceType: options?.sourceType,
            sourceId: options?.sourceId,
            analytics: options?.analytics,
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
          setState({
            status: "success",
            data: json.data,
            savePayload: json.savePayload,
          });
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
    summarize,
    reset,
    isIdle: state.status === "idle",
    isLoading: state.status === "loading",
    isSuccess: state.status === "success",
    isError: state.status === "error",
  };
}
