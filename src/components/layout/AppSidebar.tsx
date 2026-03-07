"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PRIMARY_NAV, ADMIN_NAV } from "@/config/nav";
import { Icons } from "@/components/ui/icons";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

type IconKey = keyof typeof Icons;

type AppSidebarProps = {
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
};

export function AppSidebar({ mobileOpen = false, setMobileOpen }: AppSidebarProps) {
  const closeMobile = () => setMobileOpen?.(false);
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  const navItems = isAdmin ? ADMIN_NAV : PRIMARY_NAV;

  return (
    <React.Fragment>
      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          type="button"
          onClick={closeMobile}
          tabIndex={-1}
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
          aria-label="Close menu"
        />
      )}

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-72 flex flex-col
          bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800
          transform transition-transform duration-200 ease-out
          lg:transform-none
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800">
          <Link
            href="/dashboard"
            className="font-heading font-bold text-lg text-slate-900 dark:text-white"
          >
            Xentis Care
          </Link>
          <button
            type="button"
            onClick={closeMobile}
            className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close menu"
          >
            {Icons.x}
          </button>
        </div>

        <nav
          className="flex-1 overflow-y-auto py-4 px-3 space-y-1"
          aria-label={isAdmin ? "Admin" : "Main"}
        >
          {!isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300"
            >
              {Icons["layout-dashboard"]}
              Admin
            </Link>
          )}
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = Icons[item.icon as IconKey] ?? Icons["layout-dashboard"];

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobile}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
                  focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900
                  ${
                    isActive
                      ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                  }
                `}
              >
                {Icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 dark:border-slate-800 p-3 space-y-1">
          <ThemeToggle />
          <SignOutButton />
        </div>
      </aside>
    </React.Fragment>
  );
}
