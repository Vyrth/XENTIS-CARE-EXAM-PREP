"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";

export function ProfilePreferences() {
  const [dailyReminder, setDailyReminder] = useState(true);
  const [emailDigest, setEmailDigest] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  return (
    <Card>
      <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-6">
        Preferences
      </h2>
      <div className="space-y-4">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-slate-700 dark:text-slate-300">Daily study reminder</span>
          <input
            type="checkbox"
            checked={dailyReminder}
            onChange={(e) => setDailyReminder(e.target.checked)}
            className="rounded border-slate-300 dark:border-slate-600"
          />
        </label>
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-slate-700 dark:text-slate-300">Weekly progress email</span>
          <input
            type="checkbox"
            checked={emailDigest}
            onChange={(e) => setEmailDigest(e.target.checked)}
            className="rounded border-slate-300 dark:border-slate-600"
          />
        </label>
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-slate-700 dark:text-slate-300">Dark mode (system)</span>
          <input
            type="checkbox"
            checked={darkMode}
            onChange={(e) => setDarkMode(e.target.checked)}
            className="rounded border-slate-300 dark:border-slate-600"
          />
        </label>
      </div>
    </Card>
  );
}
