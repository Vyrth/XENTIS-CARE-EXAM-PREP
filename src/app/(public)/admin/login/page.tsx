import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/admin";
import { AdminLoginForm } from "@/components/auth/AdminLoginForm";

/**
 * Admin login entry point.
 * - If not authenticated: show email/password form
 * - If authenticated and admin: redirect to /admin
 * - If authenticated but not admin: redirect to /dashboard
 */
export default async function AdminLoginPage() {
  const user = await getSessionUser();
  if (user) {
    const userIsAdmin = await isAdmin(user.id);
    if (userIsAdmin) redirect("/admin");
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Admin Sign In
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400 text-sm">
            Xentis Care Exam Prep — CMS & content management
          </p>
        </div>
        <AdminLoginForm />
        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          <a href="/login" className="text-indigo-600 dark:text-indigo-400 hover:underline">
            ← Back to student login
          </a>
        </p>
      </div>
    </div>
  );
}
