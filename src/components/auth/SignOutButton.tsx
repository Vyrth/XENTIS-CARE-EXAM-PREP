"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/ui/icons";

export function SignOutButton({ compact }: { compact?: boolean }) {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      aria-label="Sign out"
      className={`flex items-center gap-3 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors ${
        compact ? "p-2 justify-center" : "w-full px-3 py-2.5"
      }`}
    >
      {Icons["log-out"]}
      {!compact && <span>Sign out</span>}
    </button>
  );
}
