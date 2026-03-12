"use client";

import { useState } from "react";
import { EmailPasswordForm } from "./EmailPasswordForm";

export function AdminLoginForm() {
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
      {error && (
        <div
          role="alert"
          className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-sm text-red-800 dark:text-red-200"
        >
          {error}
        </div>
      )}
      <EmailPasswordForm
        onError={setError}
        redirectTo="/admin"
      />
    </div>
  );
}
