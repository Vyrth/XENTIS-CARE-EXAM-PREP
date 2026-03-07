"use client";

import { useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { AppTopNav } from "./AppTopNav";
import { BetaFeedbackButton } from "@/components/feedback/BetaFeedbackButton";

type AppShellProps = {
  children: React.ReactNode;
  title?: string;
};

export function AppShell({ children, title }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen((o) => !o);

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950">
      <AppSidebar mobileOpen={sidebarOpen} setMobileOpen={setSidebarOpen} />
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
