import React, { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { authStore, type UserSession } from "@/lib/auth/auth-store";
import { CompanyLogo } from "@/components/ui/brand-logos";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ShieldCheck,
  ChevronRight,
  Settings,
  History,
} from "lucide-react";

export interface AppSidebarProps {
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export function AppSidebar({
  isOpenMobile = false,
  onCloseMobile,
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
  }

  const advisorNavItems: NavItem[] = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
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
      active: pathname === "/audit",
    },
    {
      label: "Account & Preferences",
      href: "/settings",
      icon: Settings,
      active: pathname === "/settings",
    },
  ];

  const officerNavItems: NavItem[] = [
    {
      label: "Review Queue",
      href: "/queue",
      icon: ShieldCheck,
      active: pathname === "/queue" || pathname === "/dashboard",
    },
    {
      label: "Audit History",
      href: "/audit",
      icon: History,
      active: pathname === "/audit",
    },
    {
      label: "Account & Preferences",
      href: "/settings",
      icon: Settings,
      active: pathname === "/settings",
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
          "fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#FFFFFF] border-r border-[#E6E8E7] flex flex-col shadow-xs transition-transform duration-200 ease-in-out lg:translate-x-0 pointer-events-auto",
          isOpenMobile ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 border-b border-[#E6E8E7] flex items-center justify-between gap-2 bg-[#FFFFFF]">
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            <CompanyLogo inverted={false} />
          </Link>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 py-3 px-3 overflow-y-auto space-y-1.5">
          {navItems.map((item, idx) => {
            const Icon = item.icon;

            if (item.action) {
              return (
                <button
                  key={idx}
                  onClick={() => {
                    if (onCloseMobile) onCloseMobile();
                    item.action?.();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-[#183028] hover:bg-[#C5E86C]/20 transition-all cursor-pointer text-left group"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 shrink-0 text-[#183028]/70 group-hover:text-[#183028] transition-colors" />
                    <span>{item.label}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#183028]/50 group-hover:text-[#183028] group-hover:translate-x-0.5 transition-all" />
                </button>
              );
            }

            return (
              <Link
                key={idx}
                href={item.href || "#"}
                onClick={onCloseMobile}
                className={cn(
                  "group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all duration-150 cursor-pointer",
                  item.active
                    ? "bg-[#C5E86C] text-[#183028] font-bold shadow-xs"
                    : "text-[#183028] font-semibold hover:bg-[#C5E86C]/20"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      item.active ? "text-[#183028]" : "text-[#183028]/70 group-hover:text-[#183028]"
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
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
              </Link>
            );
          })}
        </div>
      </aside>
    </>
  );
}
