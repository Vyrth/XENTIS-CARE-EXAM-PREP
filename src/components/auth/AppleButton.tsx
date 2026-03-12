"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getAuthCallbackUrl } from "@/lib/auth/url";

export type AppleButtonProps = {
  onError?: (message: string) => void;
  /** Redirect path after OAuth (default: /dashboard) */
  redirectTo?: string;
};

export function AppleButton({ onError, redirectTo = "/dashboard" }: AppleButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    onError?.("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: {
          redirectTo: getAuthCallbackUrl(redirectTo),
        },
      });
      if (error) {
        onError?.(error.message ?? "Apple sign-in failed");
        return;
      }
    } catch (e) {
      onError?.("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-300 rounded-lg font-medium text-slate-700 bg-white hover:bg-slate-50 transition disabled:opacity-70 disabled:cursor-not-allowed"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
      </svg>
      {loading ? "Redirecting…" : "Continue with Apple"}
    </button>
  );
}
