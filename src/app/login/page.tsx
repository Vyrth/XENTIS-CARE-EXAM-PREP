import { LoginForm } from "@/components/auth/LoginForm";
import { getSafeRedirectPath } from "@/lib/auth/url";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirectTo?: string }>;
}) {
  const params = await searchParams;
  const error = params?.error ?? null;
  const redirectTo = getSafeRedirectPath(params?.redirectTo ?? null) ?? "/dashboard";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <LoginForm initialError={error} redirectTo={redirectTo} />
    </div>
  );
}
