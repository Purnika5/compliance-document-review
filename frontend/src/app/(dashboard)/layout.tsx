"use client";

import React, { useState, useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { authStore, type UserSession } from "@/lib/auth/auth-store";
import { AppSidebar } from "@/components/layouts/app-sidebar";
import { AppHeader } from "@/components/layouts/app-header";
import { AppWalkthrough } from "@/components/ui/app-walkthrough";
import { Loader2 } from "lucide-react";

/**
 * DOCU: Provides the authenticated dashboard shell with navigation and copilot access.
 * Enforces session authentication guard across all protected dashboard routes.
 * Last Updated Date: September 24, 2026
 * @param children - Rendered dashboard route content.
 * @returns The dashboard layout or loading spinner while verifying authentication.
 * @author Keith
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const session = useSyncExternalStore<UserSession | null>(
    authStore.subscribe,
    authStore.getSession,
    authStore.getServerSnapshot
  );

  useEffect(() => {
    setIsClient(true);
    if (!authStore.isAuthenticated()) {
      router.replace("/login");
    }
    // Restore collapse preference from localStorage
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") setSidebarCollapsed(true);
  }, [session, router]);

  const handleToggleCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  };

  // Prevent flashing protected content before authentication is verified
  if (!isClient || !session) {
    return (
      <div className="min-h-screen bg-[#FFFFFF] flex items-center justify-center p-8">
        <Loader2 className="h-7 w-7 text-[#183028] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#183028] flex print:block">
      {/* Role-aware Navigation Sidebar */}
      <div className="print:hidden">
        <AppSidebar
          isOpenMobile={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />
      </div>

      {/* Main Workspace Area — offset shifts based on collapse state */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out print:pl-0 print:m-0 print:w-full ${
          sidebarCollapsed ? "lg:pl-16" : "lg:pl-64"
        }`}
      >
        {/* App Top Header */}
        <div className="print:hidden">
          <AppHeader onToggleSidebarMobile={() => setMobileSidebarOpen((prev) => !prev)} />
        </div>

        {/* Content Pane */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto print:p-0 print:m-0 print:max-w-none">
          {children}
        </main>
      </div>

      {/* First-time onboarding walkthrough */}
      <AppWalkthrough />
    </div>
  );
}
