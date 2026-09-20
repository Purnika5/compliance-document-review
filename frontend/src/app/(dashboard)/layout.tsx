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
