"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

type AIPopoverProps = {
  isOpen: boolean;
  selectedText: string;
  position: { x: number; y: number } | null;
  onClose: () => void;
  onExplainSimply?: () => void;
  onBoardTip?: () => void;
  onMnemonic?: () => void;
  onSaveToNotebook?: () => void;
};

export function AIPopover({
  isOpen,
  selectedText,
  position,
  onClose,
  onExplainSimply,
  onBoardTip,
  onMnemonic,
  onSaveToNotebook,
}: AIPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen || !position) return null;

  const displayText = selectedText.length > 80 ? `${selectedText.slice(0, 80)}...` : selectedText;

  return (
    <div
      ref={ref}
      className="fixed z-50 w-72 p-3 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700"
      style={{ left: position.x, top: position.y + 24 }}
    >
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 line-clamp-2">
        &quot;{displayText}&quot;
      </p>
      <div className="flex flex-col gap-0.5">
        <button
          type="button"
          onClick={onExplainSimply}
          className="text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          Explain simply
        </button>
        <button
          type="button"
          onClick={onBoardTip}
          className="text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          Board tip
        </button>
        <button
          type="button"
          onClick={onMnemonic}
          className="text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          Make mnemonic
        </button>
        <button
          type="button"
          disabled
          className="text-left px-3 py-2 text-sm rounded-lg text-slate-400 dark:text-slate-500 cursor-not-allowed"
          title="Coming soon"
        >
          Save to notebook later
        </button>
      </div>
      <Link
        href="/ai-tutor"
        className="block mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
      >
        Open AI Tutor
      </Link>
    </div>
  );
}
