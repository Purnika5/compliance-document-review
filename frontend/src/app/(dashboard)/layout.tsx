"use client";

import React, { useState } from "react";
import { AppSidebar } from "@/components/layouts/app-sidebar";
import { AppHeader } from "@/components/layouts/app-header";
import { ChatbotWidget } from "@/components/ui/chatbot-widget";

/**
 * DOCU: Provides the authenticated dashboard shell with navigation and copilot access.
 * Last Updated Date: September 3, 2026
 * @param children - Rendered dashboard route content.
 * @returns The dashboard layout.
 * @author Keith
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background flex">
      {/* Role-aware Navigation Sidebar */}
      <AppSidebar
        isOpenMobile={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Workspace Area (offset by 64 / 16rem on desktop) */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* App Top Header */}
        <AppHeader onToggleSidebarMobile={() => setMobileSidebarOpen((prev) => !prev)} />

        {/* Content Pane */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Floating Institutional Compliance Copilot */}
      <ChatbotWidget />

    </div>
  );
}
