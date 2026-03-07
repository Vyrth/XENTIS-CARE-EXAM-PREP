/**
 * Design tokens for Xentis Care Exam Prep
 * Premium ed-tech: colorful, clean, accessible
 */

export const TRACK_COLORS = {
  lvn: {
    light: {
      bg: "bg-teal-50 dark:bg-teal-950/30",
      border: "border-teal-200 dark:border-teal-800",
      text: "text-teal-700 dark:text-teal-300",
      accent: "text-teal-600 dark:text-teal-400",
      fill: "bg-teal-500",
      ring: "ring-teal-500/50",
      hover: "hover:bg-teal-100 dark:hover:bg-teal-900/30",
    },
    hex: { light: "#0d9488", dark: "#2dd4bf" },
  },
  rn: {
    light: {
      bg: "bg-blue-50 dark:bg-blue-950/30",
      border: "border-blue-200 dark:border-blue-800",
      text: "text-blue-700 dark:text-blue-300",
      accent: "text-blue-600 dark:text-blue-400",
      fill: "bg-blue-600",
      ring: "ring-blue-500/50",
      hover: "hover:bg-blue-100 dark:hover:bg-blue-900/30",
    },
    hex: { light: "#2563eb", dark: "#60a5fa" },
  },
  fnp: {
    light: {
      bg: "bg-violet-50 dark:bg-violet-950/30",
      border: "border-violet-200 dark:border-violet-800",
      text: "text-violet-700 dark:text-violet-300",
      accent: "text-violet-600 dark:text-violet-400",
      fill: "bg-violet-600",
      ring: "ring-violet-500/50",
      hover: "hover:bg-violet-100 dark:hover:bg-violet-900/30",
    },
    hex: { light: "#7c3aed", dark: "#a78bfa" },
  },
  pmhnp: {
    light: {
      bg: "bg-fuchsia-50 dark:bg-fuchsia-950/30",
      border: "border-fuchsia-200 dark:border-fuchsia-800",
      text: "text-fuchsia-700 dark:text-fuchsia-300",
      accent: "text-fuchsia-600 dark:text-fuchsia-400",
      fill: "bg-fuchsia-600",
      ring: "ring-fuchsia-500/50",
      hover: "hover:bg-fuchsia-100 dark:hover:bg-fuchsia-900/30",
    },
    hex: { light: "#c026d3", dark: "#e879f9" },
  },
} as const;

export type TrackSlug = keyof typeof TRACK_COLORS;

export const SPACING = {
  card: "p-6",
  section: "space-y-6",
  stack: "space-y-4",
  inline: "space-x-3",
} as const;

export const RADIUS = {
  sm: "rounded-lg",
  md: "rounded-xl",
  lg: "rounded-2xl",
  full: "rounded-full",
} as const;
