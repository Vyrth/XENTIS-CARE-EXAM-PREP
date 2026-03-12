"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getAuthCallbackUrl } from "@/lib/auth/url";

export type MagicLinkFormProps = {
  onError?: (message: string) => void;
  onSuccess?: () => void;
  /** Redirect path after magic link (default: /dashboard) */
  redirectTo?: string;
};

export function MagicLinkForm({ onError, onSuccess, redirectTo = "/dashboard" }: MagicLinkFormProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    onError?.("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: getAuthCallbackUrl(redirectTo),
        },
      });
      if (error) {
        onError?.(error.message ?? "Failed to send magic link");
        setLoading(false);
        return;
      }
      setSent(true);
      onSuccess?.();
    } catch {
      onError?.("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-center">
        <p className="text-sm text-emerald-800 dark:text-emerald-200 font-medium">
          Check your inbox
        </p>
        <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">
          We sent a sign-in link to <strong>{email}</strong>. Click the link to sign in.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email address"
        required
        disabled={loading}
        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-70"
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-lg border border-slate-300 dark:border-slate-600 font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {loading ? "Sending…" : "Send magic link"}
      </button>
    </form>
  );
}
