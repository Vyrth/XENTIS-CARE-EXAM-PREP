"use client";

import { useTheme } from "@/components/providers/ThemeProvider";
import { Icons } from "./icons";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  return (
    <button
      type="button"
      onClick={cycleTheme}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      className="flex items-center justify-center h-8 w-8 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100/90 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white transition-all duration-200 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
    >
      {resolvedTheme === "dark" ? (
        <span className="w-5 h-5 block [&>svg]:w-5 [&>svg]:h-5">{Icons.sun}</span>
      ) : (
        <span className="w-5 h-5 block [&>svg]:w-5 [&>svg]:h-5">{Icons.moon}</span>
      )}
    </button>
  );
}
