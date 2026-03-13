"use client";

import { useState } from "react";
import { EmailPasswordForm } from "./EmailPasswordForm";
import { GoogleButton } from "./GoogleButton";
import { AppleButton } from "./AppleButton";
import { MagicLinkForm } from "./MagicLinkForm";

export type AdminLoginFormProps = {
  /** Where to redirect after successful admin sign-in (default: /admin) */
  returnTo?: string;
};

export function AdminLoginForm({ returnTo = "/admin" }: AdminLoginFormProps) {
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-4">
      {error && (
        <div
          role="alert"
          className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-sm text-red-800 dark:text-red-200"
        >
          {error}
        </div>
      )}
      <EmailPasswordForm onError={setError} redirectTo={returnTo} />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-slate-200 dark:border-slate-600" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white dark:bg-slate-900 px-2 text-slate-500">or</span>
        </div>
      </div>

      <GoogleButton onError={setError} redirectTo={returnTo} />
      <AppleButton onError={setError} redirectTo={returnTo} />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-slate-200 dark:border-slate-600" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white dark:bg-slate-900 px-2 text-slate-500">or</span>
        </div>
      </div>

      <MagicLinkForm onError={setError} redirectTo={returnTo} />
    </div>
  );
}
