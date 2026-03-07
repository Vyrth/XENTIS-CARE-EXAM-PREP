/**
 * Auth configuration and route constants
 */
export const AUTH_ROUTES = {
  LOGIN: "/login",
  SIGNUP: "/signup",
  CALLBACK: "/auth/callback",
  ONBOARDING: "/onboarding",
} as const;

export const PROTECTED_ROUTES = {
  DASHBOARD: "/dashboard",
  STUDY: "/study",
  PRACTICE: "/practice",
  PRE_PRACTICE: "/pre-practice",
  NOTEBOOK: "/notebook",
  FLASHCARDS: "/flashcards",
  VIDEOS: "/videos",
  AI_TUTOR: "/ai-tutor",
} as const;

export const ADMIN_ROUTE_PREFIX = "/admin";

export const EXAM_TRACKS = [
  { slug: "lvn", name: "LVN/LPN" },
  { slug: "rn", name: "RN" },
  { slug: "fnp", name: "FNP" },
  { slug: "pmhnp", name: "PMHNP" },
] as const;

export const STUDY_MODES = [
  { value: "focused", label: "Focused (deep study sessions)" },
  { value: "mixed", label: "Mixed (variety of activities)" },
  { value: "review", label: "Review-heavy (practice questions)" },
] as const;
