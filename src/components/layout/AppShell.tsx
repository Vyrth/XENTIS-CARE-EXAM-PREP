"use client";

import { useState, useLayoutEffect } from "react";
import { AppSidebar } from "./AppSidebar";
import { AppTopNav } from "./AppTopNav";
import { BetaFeedbackButton } from "@/components/feedback/BetaFeedbackButton";

const SIDEBAR_COLLAPSED_KEY = "xentis-sidebar-collapsed";

type AppShellProps = {
  children: React.ReactNode;
  title?: string;
};

export function AppShell({ children, title }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // useLayoutEffect: restore collapsed state before paint to minimize flash (hydration-safe: initial render matches server)
  useLayoutEffect(() => {
    try {
      setSidebarCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true");
    } catch {
      /* ignore */
    }
  }, []);

  const toggleSidebar = () => setSidebarOpen((o) => !o);

  const toggleCollapsed = () => {
    setSidebarCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950">
      <AppSidebar
        mobileOpen={sidebarOpen}
        setMobileOpen={setSidebarOpen}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={toggleCollapsed}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <AppTopNav onMenuClick={toggleSidebar} title={title} />
        <main id="main" className="flex-1 overflow-auto" tabIndex={-1}>
          {children}
        </main>
      </div>
      <BetaFeedbackButton />
    </div>
  );
}
