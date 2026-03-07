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
      className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500"
    >
      {resolvedTheme === "dark" ? (
        <span className="w-5 h-5 block">{Icons.sun}</span>
      ) : (
        <span className="w-5 h-5 block">{Icons.moon}</span>
      )}
    </button>
  );
}
