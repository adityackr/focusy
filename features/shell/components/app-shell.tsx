"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { AppSidebar } from "@/features/shell/components/app-sidebar";
import { LogoMark } from "@/features/shell/components/logo";
import { cn } from "@/shared/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { collapsed, toggleCollapsed, mobileOpen, openMobile, closeMobile } = useAppShell();

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden shrink-0 md:block">
        <AppSidebar collapsed={collapsed} onToggle={toggleCollapsed} />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeMobile} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw]">
            <AppSidebar collapsed={false} onToggle={closeMobile} onNavigate={closeMobile} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b px-4 py-3 md:hidden">
          <Button variant="ghost" size="icon" onClick={openMobile} aria-label="Open menu">
            <Menu className="size-5" />
          </Button>
          <LogoMark size={28} />
          <span className="text-sm font-extrabold tracking-tight">
            Focus<span className="text-primary">y</span>
          </span>
        </div>
        <main className={cn("min-h-0 flex-1 overflow-y-auto")}>{children}</main>
      </div>
    </div>
  );
}

/** Sidebar/drawer state for `AppShell` — kept out of the JSX. */
function useAppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return {
    collapsed,
    toggleCollapsed: () => setCollapsed((v) => !v),
    mobileOpen,
    openMobile: () => setMobileOpen(true),
    closeMobile: () => setMobileOpen(false),
  };
}
