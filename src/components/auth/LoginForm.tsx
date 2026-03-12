"use client";

import { useState } from "react";
import Link from "next/link";
import { GoogleButton } from "./GoogleButton";
import { AppleButton } from "./AppleButton";
import { MagicLinkForm } from "./MagicLinkForm";
import { EmailPasswordForm } from "./EmailPasswordForm";

const ERROR_MESSAGES: Record<string, string> = {
  auth_callback_error: "Sign-in failed. Please try again.",
  access_denied: "Access was denied. Please try again.",
  invalid_credentials: "Invalid credentials. Please try again.",
};

export type LoginFormProps = {
  initialError?: string | null;
  /** Redirect after sign-in (default: /dashboard) */
  redirectTo?: string;
};

export function LoginForm({ initialError, redirectTo = "/dashboard" }: LoginFormProps) {
  const [error, setError] = useState<string | null>(initialError ?? null);

  const displayError = error ?? (initialError ? ERROR_MESSAGES[initialError] ?? initialError : null);

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Sign in to Xentis Care
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400 text-sm">
          Access your study materials and practice exams
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-4">
        {displayError && (
          <div
            role="alert"
            className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-sm text-red-800 dark:text-red-200"
          >
            {displayError}
          </div>
        )}

        <EmailPasswordForm onError={setError} onSuccess={() => {}} redirectTo={redirectTo} />

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-200 dark:border-slate-600" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white dark:bg-slate-900 px-2 text-slate-500">or</span>
          </div>
        </div>

        <GoogleButton onError={setError} redirectTo={redirectTo} />
        <AppleButton onError={setError} redirectTo={redirectTo} />

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-200 dark:border-slate-600" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white dark:bg-slate-900 px-2 text-slate-500">or</span>
          </div>
        </div>

        <MagicLinkForm onError={setError} redirectTo={redirectTo} />
      </div>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        By signing in, you agree to our{" "}
        <Link href="/legal/terms" className="text-indigo-600 dark:text-indigo-400 hover:underline">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/legal/privacy" className="text-indigo-600 dark:text-indigo-400 hover:underline">
          Privacy Policy
        </Link>
      </p>
    </div>
  );
}
