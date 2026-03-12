/**
 * Trial offer messaging for signup and onboarding
 * Communicates: 1 month free, full access, progress saved to same profile
 */

export function TrialMessaging({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/80 dark:bg-emerald-950/30 px-4 py-3 text-sm ${className}`}
      role="status"
    >
      <p className="font-semibold text-emerald-900 dark:text-emerald-100">
        1 month free with full access
      </p>
      <ul className="mt-2 space-y-1 text-emerald-800 dark:text-emerald-200">
        <li>• Unlocked questions, Jade Tutor, exams, and study materials</li>
        <li>• Progress and achievements stay on your profile</li>
        <li>• No credit card required to start</li>
      </ul>
    </div>
  );
}
