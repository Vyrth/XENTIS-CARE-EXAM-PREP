/**
 * Loading state while app layout resolves (auth, profile, onboarding check).
 * Prevents flash of wrong content before redirect.
 */
export default function AppLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="h-8 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
      </div>
    </div>
  );
}
