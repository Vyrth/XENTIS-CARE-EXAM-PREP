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
      className={`flex items-center gap-3 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100/90 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white transition-all duration-200 ${
        compact ? "p-2 justify-center" : "flex-1 min-w-0 px-3 py-2.5"
      }`}
    >
      {compact ? (
        <span className="[&>svg]:w-4 [&>svg]:h-4">{Icons["log-out"]}</span>
      ) : (
        <>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-200/60 dark:bg-slate-700/60 [&>svg]:w-4 [&>svg]:h-4">
            {Icons["log-out"]}
          </span>
          <span>Sign out</span>
        </>
      )}
    </button>
  );
}
