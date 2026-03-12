"use client";

import { useState, useCallback } from "react";
import type {
  ExamTrack,
  MnemonicResponse,
  MnemonicSavePayload,
  MnemonicStyle,
} from "@/lib/ai/mnemonic/types";

export type MnemonicState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: MnemonicResponse; savePayload?: MnemonicSavePayload }
  | { status: "error"; error: string };

export function useMnemonic(examTrack: ExamTrack = "rn") {
  const [state, setState] = useState<MnemonicState>({ status: "idle" });

  const generate = useCallback(
    async (
      selectedText: string,
      options?: {
        conceptTitle?: string;
        mnemonicStyle?: MnemonicStyle;
        topicId?: string;
        systemId?: string;
        sourceType?: string;
        sourceId?: string;
        analytics?: Record<string, unknown>;
      }
    ) => {
      setState({ status: "loading" });
      try {
        const res = await fetch("/api/ai/mnemonic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            selectedText,
            examTrack,
            conceptTitle: options?.conceptTitle,
            mnemonicStyle: options?.mnemonicStyle ?? "phrase",
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
    generate,
    reset,
    isIdle: state.status === "idle",
    isLoading: state.status === "loading",
    isSuccess: state.status === "success",
    isError: state.status === "error",
  };
}
