import { requireAdmin } from "@/lib/auth/require-admin";

/**
 * Admin layout. Requires auth + admin role via canonical guard.
 * force-dynamic prevents stale admin-role reads.
 */
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="min-h-screen">
      <div className="bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-200 dark:border-indigo-800 px-4 py-2">
        <p className="text-sm text-indigo-800 dark:text-indigo-200 text-center">
          <strong>Track-first CMS:</strong> Every content object must be assigned to a track (LVN, RN, FNP, PMHNP). Publish is blocked until track is set.
        </p>
      </div>
      {children}
    </div>
  );
}
