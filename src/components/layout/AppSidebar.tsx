"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PRIMARY_NAV, ADMIN_NAV } from "@/config/nav";
import { isAdminRoute } from "@/config/admin-routes";
import { Icons } from "@/components/ui/icons";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

type IconKey = keyof typeof Icons;

type AppSidebarProps = {
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
};

export function AppSidebar({
  mobileOpen = false,
  setMobileOpen,
  collapsed = false,
  onToggleCollapsed,
}: AppSidebarProps) {
  const closeMobile = () => setMobileOpen?.(false);
  const pathname = usePathname();
  const onAdminRoute = isAdminRoute(pathname);
  const navItems = onAdminRoute ? ADMIN_NAV : PRIMARY_NAV;

  const isCollapsed = collapsed;
  const sidebarWidth = isCollapsed ? "w-16" : "w-72";

  return (
    <React.Fragment>
      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          type="button"
          onClick={closeMobile}
          tabIndex={-1}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          aria-label="Close menu"
        />
      )}

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          flex flex-col
          bg-white/98 dark:bg-slate-900/98 backdrop-blur-md
          border-r border-slate-200/90 dark:border-slate-800/90
          shadow-[4px_0_24px_-4px_rgba(99,102,241,0.06)] dark:shadow-[4px_0_24px_-4px_rgba(0,0,0,0.3)]
          transform transition-all duration-200 ease-out
          lg:transform-none
          ${sidebarWidth}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Subtle gradient tint */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/[0.02] via-transparent to-violet-500/[0.02] dark:from-indigo-500/[0.03] dark:to-violet-500/[0.03] pointer-events-none" aria-hidden />

        {/* Header / brand */}
        <div className="relative flex h-16 items-center justify-between px-4 border-b border-slate-200/80 dark:border-slate-800/80 shrink-0">
          {!isCollapsed && (
            <Link
              href="/dashboard"
              className="group flex items-center gap-2 font-heading font-bold text-lg text-slate-900 dark:text-white truncate transition-colors hover:text-indigo-600 dark:hover:text-indigo-400"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-sm font-bold shadow-sm shadow-indigo-500/20 group-hover:shadow-indigo-500/30 transition-shadow">
                X
              </span>
              <span>Xentis Care</span>
            </Link>
          )}
          {isCollapsed && (
            <Link
              href="/dashboard"
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/15 to-violet-500/10 dark:from-indigo-500/20 dark:to-violet-500/15 text-indigo-600 dark:text-indigo-400 hover:from-indigo-500/25 hover:to-violet-500/20 dark:hover:from-indigo-500/30 dark:hover:to-violet-500/25 border border-indigo-500/10 dark:border-indigo-400/10 transition-all"
              aria-label="Xentis Care Home"
            >
              <span className="text-xl font-bold">X</span>
            </Link>
          )}
          <div className="flex items-center gap-0.5">
            {onToggleCollapsed && (
              <button
                type="button"
                onClick={onToggleCollapsed}
                className="hidden lg:flex p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors"
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {isCollapsed ? Icons.chevronRight : Icons.chevronLeft}
              </button>
            )}
            <button
              type="button"
              onClick={closeMobile}
              className="lg:hidden p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Close menu"
            >
              {Icons.x}
            </button>
          </div>
        </div>

        <nav
          className="relative flex-1 overflow-y-auto py-4 px-2.5 space-y-0.5"
          aria-label={onAdminRoute ? "Admin" : "Main"}
        >
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
                  group flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200
                  focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900
                  ${
                    isCollapsed ? "justify-center p-2.5" : "px-3 py-2.5"
                  }
                  ${
                    isActive
                      ? "bg-gradient-to-r from-indigo-500/15 via-violet-500/10 to-transparent dark:from-indigo-500/20 dark:via-violet-500/15 dark:to-transparent text-indigo-700 dark:text-indigo-300 shadow-sm border-l-2 border-indigo-500 dark:border-indigo-400 ml-0.5 [&>span:first-child]:bg-indigo-500/15 dark:[&>span:first-child]:bg-indigo-400/20"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/90 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white border-l-2 border-transparent ml-0.5 [&>span:first-child]:bg-slate-200/60 dark:[&>span:first-child]:bg-slate-700/60 group-hover:[&>span:first-child]:bg-indigo-500/10 dark:group-hover:[&>span:first-child]:bg-indigo-400/10"
                  }
                `}
                title={item.label}
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors [&>svg]:w-4 [&>svg]:h-4 ${isCollapsed ? "h-8 w-8" : ""}`}>
                  {Icon}
                </span>
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer with subtle separator */}
        <div className={`relative border-t border-slate-200/80 dark:border-slate-800/80 p-3 bg-slate-50/50 dark:bg-slate-950/50 ${isCollapsed ? "flex flex-col items-center gap-0.5" : "flex items-center gap-2"}`}>
          <ThemeToggle />
          <SignOutButton compact={isCollapsed} />
        </div>
      </aside>
    </React.Fragment>
  );
}
