"use client";

import { Icons } from "@/components/ui/icons";

type AppTopNavProps = {
  onMenuClick: () => void;
  title?: string;
};

export function AppTopNav({ onMenuClick, title }: AppTopNavProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm px-4 lg:px-8">
      <button
        type="button"
        onClick={onMenuClick}
        className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
        aria-label="Open menu"
      >
        {Icons.menu}
      </button>
      {title && (
        <h1 className="font-heading font-semibold text-slate-900 dark:text-white truncate">
          {title}
        </h1>
      )}
    </header>
  );
}
