/**
 * Loading state while admin layout resolves (session + admin role check).
 * Prevents flash of dashboard before redirect for non-admins.
 */
export default function AdminLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-indigo-50/50 dark:bg-indigo-950/30">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="h-8 w-40 bg-indigo-200 dark:bg-indigo-800 rounded" />
        <div className="h-4 w-56 bg-indigo-200 dark:bg-indigo-800 rounded" />
      </div>
    </div>
  );
}
