"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type EmailPasswordFormProps = {
  onError?: (message: string) => void;
  onSuccess?: () => void;
  /** Redirect path after successful sign-in (default: /dashboard) */
  redirectTo?: string;
};

export function EmailPasswordForm({
  onError,
  onSuccess,
  redirectTo = "/dashboard",
}: EmailPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    onError?.("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        const msg =
          error.message === "Invalid login credentials"
            ? "Invalid email or password. Please try again."
            : error.message;
        onError?.(msg);
        setLoading(false);
        return;
      }
      onSuccess?.();
      window.location.href = redirectTo;
    } catch {
      onError?.("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email address"
        required
        disabled={loading}
        autoComplete="email"
        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-70"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
        disabled={loading}
        autoComplete="current-password"
        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-70"
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition disabled:opacity-70 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
      >
        {loading ? "Signing in…" : "Sign in with email"}
      </button>
    </form>
  );
}
