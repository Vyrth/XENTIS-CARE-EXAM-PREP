"use client";

import { useState, useCallback } from "react";

export interface AIPopoverState {
  isOpen: boolean;
  selectedText: string;
  position: { x: number; y: number } | null;
}

export function useAIPopover() {
  const [state, setState] = useState<AIPopoverState>({
    isOpen: false,
    selectedText: "",
    position: null,
  });

  const open = useCallback((text: string, x: number, y: number) => {
    setState({ isOpen: true, selectedText: text, position: { x, y } });
  }, []);

  const close = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return { ...state, open, close };
}
