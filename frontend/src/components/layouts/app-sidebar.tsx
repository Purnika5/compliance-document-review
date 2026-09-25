import React, { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { authStore, type UserSession } from "@/lib/auth/auth-store";
import { AILogo } from "@/components/ui/brand-logos";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ShieldCheck,
  ChevronRight,
  Settings,
  History,
  PanelLeftClose,
  PanelLeftOpen,
  BookOpen,
} from "lucide-react";
import { journalStore } from "@/lib/journal-store";

export interface AppSidebarProps {
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function AppSidebar({
  isOpenMobile = false,
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse,
}: AppSidebarProps) {
  const pathname = usePathname();
  const session = useSyncExternalStore<UserSession | null>(
    authStore.subscribe,
    authStore.getSession,
    authStore.getServerSnapshot
  );

  const role = session?.role || "Advisor";

  interface NavItem {
    label: string;
    href?: string;
    icon: React.ComponentType<{ className?: string }>;
    active?: boolean;
    action?: () => void;
    highlight?: boolean;
    badge?: string;
    dataTour?: string;
  }

  const advisorNavItems: NavItem[] = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      dataTour: "nav-dashboard",
      active:
        (pathname === "/dashboard" ||
        pathname.startsWith("/submissions") ||
        pathname.startsWith("/documents")) &&
        pathname !== "/audit" &&
        pathname !== "/settings",
    },
    {
      label: "Audit Trail",
      href: "/audit",
      icon: History,
      dataTour: "nav-audit",
      active: pathname === "/audit",
    },
    {
      label: "Account & Preferences",
      href: "/settings",
      icon: Settings,
      dataTour: "nav-settings",
      active: pathname === "/settings",
    },
    {
      label: "Compliance Journal",
      icon: BookOpen,
      dataTour: "nav-journal",
      action: () => journalStore.openJournal("Advisor"),
    },
  ];

  const officerNavItems: NavItem[] = [
    {
      label: "Review Queue",
      href: "/queue",
      icon: ShieldCheck,
      dataTour: "nav-queue",
      active: pathname === "/queue" || pathname === "/dashboard",
    },
    {
      label: "Audit History",
      href: "/audit",
      icon: History,
      dataTour: "nav-audit",
      active: pathname === "/audit",
    },
    {
      label: "Account & Preferences",
      href: "/settings",
      icon: Settings,
      dataTour: "nav-settings",
      active: pathname === "/settings",
    },
    {
      label: "Compliance Journal",
      icon: BookOpen,
      dataTour: "nav-journal",
      action: () => journalStore.openJournal("Officer"),
    },
  ];

  const navItems = role === "Officer" ? officerNavItems : advisorNavItems;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/70 z-40 lg:hidden backdrop-blur-xs"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-[#FFFFFF] border-r border-[#E6E8E7] shadow-xs transition-all duration-300 ease-in-out pointer-events-auto",
          // Mobile: slide in/out
          isOpenMobile ? "translate-x-0" : "-translate-x-full",
          // Desktop: always visible, width depends on collapse state
          isCollapsed ? "lg:translate-x-0 lg:w-16" : "lg:translate-x-0 lg:w-64",
          // Mobile always full width
          "w-64"
        )}
      >
        {/* Brand Header */}
        <div
          className={cn(
            "h-16 border-b border-[#E6E8E7] flex items-center bg-[#FFFFFF] shrink-0 transition-all",
            isCollapsed ? "justify-center px-2" : "justify-between px-3.5 gap-2"
          )}
        >
          {!isCollapsed ? (
            <>
              <Link href="/" className="flex items-center gap-2.5 min-w-0">
                <AILogo className="h-7 w-7 shrink-0" />
                <span className="flex items-baseline uppercase whitespace-nowrap">
                  <span className="font-extrabold text-[15px] tracking-wide font-sans text-[#183028] select-none">
                    Springer
                  </span>
                  <span className="font-semibold ml-1.5 text-[14px] font-sans tracking-wider text-[#183028] select-none">
                    Capital
                  </span>
                </span>
              </Link>
              <button
                onClick={onToggleCollapse}
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
                className="flex items-center justify-center h-7 w-7 rounded-lg border border-[#E6E8E7] bg-[#F8FAF9] text-[#183028]/70 hover:text-[#183028] hover:bg-[#C5E86C]/30 hover:border-[#C5E86C] transition-all cursor-pointer shrink-0"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </>
          ) : (
            <Link
              href="/"
              title="Springer Capital"
              className="flex items-center justify-center h-9 w-9 rounded-xl hover:bg-[#C5E86C]/20 transition-all cursor-pointer"
            >
              <AILogo className="h-7 w-7 shrink-0" />
            </Link>
          )}
        </div>

        {/* Collapsed Mode Dedicated Expand Button */}
        {isCollapsed && (
          <div className="px-2 pt-2 pb-1 border-b border-[#E6E8E7]/60">
            <button
              onClick={onToggleCollapse}
              aria-label="Expand sidebar"
              title="Expand sidebar"
              className="w-full flex items-center justify-center h-8 rounded-xl border border-[#E6E8E7] bg-[#F8FAF9] text-[#183028]/70 hover:text-[#183028] hover:bg-[#C5E86C]/30 hover:border-[#C5E86C] transition-all cursor-pointer"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Navigation Links */}
        <div className="flex-1 py-3 px-2 overflow-y-auto space-y-1.5">
          {navItems.map((item, idx) => {
            const Icon = item.icon;

            if (item.action) {
              return (
                <button
                  key={idx}
                  data-tour={item.dataTour}
                  onClick={() => {
                    if (onCloseMobile) onCloseMobile();
                    item.action?.();
                  }}
                  title={isCollapsed ? item.label : undefined}
                  className={cn(
                    "w-full flex items-center px-2 py-2.5 rounded-xl text-xs font-semibold text-[#183028] hover:bg-[#C5E86C]/20 transition-all cursor-pointer text-left group",
                    isCollapsed ? "lg:justify-center" : "justify-between"
                  )}
                >
                  <div className={cn("flex items-center gap-3", isCollapsed && "lg:gap-0")}>
                    <Icon className="h-4 w-4 shrink-0 text-[#183028]/70 group-hover:text-[#183028] transition-colors" />
                    <span
                      className={cn(
                        "truncate transition-all duration-300 overflow-hidden",
                        isCollapsed ? "lg:w-0 lg:opacity-0" : "w-auto opacity-100"
                      )}
                    >
                      {item.label}
                    </span>
                  </div>
                  {!isCollapsed && (
                    <ChevronRight className="h-4 w-4 text-[#183028]/50 group-hover:text-[#183028] group-hover:translate-x-0.5 transition-all shrink-0 hidden lg:block" />
                  )}
                </button>
              );
            }

            return (
              <Link
                key={idx}
                href={item.href || "#"}
                data-tour={item.dataTour}
                onClick={() => {
                  if (onCloseMobile) onCloseMobile();
                }}
                title={isCollapsed ? item.label : undefined}
                className={cn(
                  "group flex items-center px-2 py-2.5 rounded-xl text-xs transition-all duration-150 cursor-pointer select-none",
                  isCollapsed ? "lg:justify-center" : "justify-between",
                  item.active
                    ? "bg-[#C5E86C] text-[#183028] font-bold shadow-xs"
                    : "text-[#183028] font-semibold hover:bg-[#C5E86C]/20"
                )}
              >
                <div className={cn("flex items-center gap-3", isCollapsed && "lg:gap-0")}>
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      item.active ? "text-[#183028]" : "text-[#183028]/70 group-hover:text-[#183028]"
                    )}
                  />
                  <span
                    className={cn(
                      "truncate transition-all duration-300 overflow-hidden",
                      isCollapsed ? "lg:w-0 lg:opacity-0" : "w-auto opacity-100"
                    )}
                  >
                    {item.label}
                  </span>
                </div>
                {!isCollapsed && (
                  <div className="flex items-center gap-1.5 shrink-0 hidden lg:flex">
                    {item.badge && (
                      <span className="px-1.5 py-0.2 text-[10px] font-bold rounded border border-[#E6E8E7] bg-[#FFFFFF] text-[#183028]">
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 transition-all",
                        item.active
                          ? "text-[#183028]"
                          : "text-[#183028]/40 group-hover:text-[#183028] group-hover:translate-x-0.5"
                      )}
                    />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </aside>
    </>
  );
}
