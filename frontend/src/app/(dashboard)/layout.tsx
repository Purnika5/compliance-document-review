"use client";

import React, { useState, useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { authStore, type UserSession } from "@/lib/auth/auth-store";
import { AppSidebar } from "@/components/layouts/app-sidebar";
import { AppHeader } from "@/components/layouts/app-header";
import { ChatbotWidget } from "@/components/ui/chatbot-widget";
import { Loader2 } from "lucide-react";

/**
 * DOCU: Provides the authenticated dashboard shell with navigation and copilot access.
 * Enforces session authentication guard across all protected dashboard routes.
 * Last Updated Date: September 21, 2026
 * @param children - Rendered dashboard route content.
 * @returns The dashboard layout or loading spinner while verifying authentication.
 * @author Keith
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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
  }, [session, router]);

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
        />
      </div>

      {/* Main Workspace Area (offset by 64 / 16rem on desktop) */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64 print:pl-0 print:m-0 print:w-full">
        {/* App Top Header */}
        <div className="print:hidden">
          <AppHeader onToggleSidebarMobile={() => setMobileSidebarOpen((prev) => !prev)} />
        </div>

        {/* Content Pane */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto print:p-0 print:m-0 print:max-w-none">
          {children}
        </main>
      </div>

      {/* Floating Institutional Compliance Copilot */}
      <div className="print:hidden">
        <ChatbotWidget />
      </div>

    </div>
  );
}
