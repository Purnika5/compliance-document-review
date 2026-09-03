"use client";

/**
 * DOCU: Renders role-aware dashboard navigation.
 * Last Updated Date: September 3, 2026
 * @returns The dashboard sidebar view.
 * @author Keith
 */
import React, { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authStore, type UserSession } from "@/lib/auth/auth-store";
import { CompanyLogo } from "@/components/ui/brand-logos";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Files,
  FileClock,
  History,
  ShieldCheck,
  LogOut,
  CheckSquare,
  AlertTriangle,
  ChevronRight,
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
  const router = useRouter();
  const session = useSyncExternalStore<UserSession | null>(
    authStore.subscribe,
    authStore.getSession,
    authStore.getServerSnapshot
  );

  const role = session?.role || "Advisor";

  const handleLogout = () => {
    authStore.clearSession();
    router.push("/login");
  };

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
      href: "/submissions",
      icon: LayoutDashboard,
      active: pathname === "/submissions",
    },
    {
      label: "My Documents",
      href: "/submissions?tab=all",
      icon: Files,
      active: pathname === "/submissions" && !pathname.includes("tab=revision"),
    },
    {
      label: "Revision Requests",
      href: "/submissions?tab=revision",
      icon: AlertTriangle,
      badge: "1",
      active: pathname === "/submissions" && typeof window !== "undefined" && window.location.search.includes("revision"),
    },
  ];

  const officerNavItems: NavItem[] = [
    {
      label: "Review Queue",
      href: "/queue",
      icon: ShieldCheck,
      active: pathname === "/queue" && !pathname.includes("tab="),
    },
    {
      label: "Assigned Reviews",
      href: "/queue?tab=assigned",
      icon: CheckSquare,
      active: pathname === "/queue" && typeof window !== "undefined" && window.location.search.includes("assigned"),
    },
    {
      label: "Revision Requests",
      href: "/queue?tab=revision",
      icon: FileClock,
      badge: "1",
      active: pathname === "/queue" && typeof window !== "undefined" && window.location.search.includes("revision"),
    },
    {
      label: "Audit History",
      href: "/queue?tab=audit",
      icon: History,
      active: pathname === "/queue" && typeof window !== "undefined" && window.location.search.includes("audit"),
    },
  ];

  const navItems = role === "Officer" ? officerNavItems : advisorNavItems;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-xs"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-40 w-64 bg-background border-r border-slate-200 flex flex-col shadow-[8px_0_18px_hsl(215_20%_78%_/_0.35)] transition-transform duration-200 ease-in-out lg:translate-x-0",
          isOpenMobile ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand Header */}
        <div className="h-14 px-4 border-b border-slate-200 flex items-center justify-between bg-background">
          <Link href="/" className="flex items-center">
            <CompanyLogo />
          </Link>
          <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-bold">
            v2.4
          </span>
        </div>

        {/* Role Indicator & Fast Persona Switcher */}
        <div className="p-3 border-b border-slate-200 bg-background">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Active Persona
            </span>
            <span
              className={cn(
                "text-[10px] font-bold px-1.5 py-0.2 rounded border uppercase",
                role === "Officer"
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-emerald-50 text-emerald-900 border-emerald-200"
              )}
            >
              {role}
            </span>
          </div>

          <div className="neu-inset flex items-center justify-between rounded-lg px-3 py-2">
            <div className="flex items-center gap-2">
              <span className={cn("h-2 w-2 rounded-full", role === "Officer" ? "bg-cyan-500" : "bg-pink-500")} />
              <span className="text-xs font-bold text-slate-800">{role} workspace</span>
            </div>
            <span className="text-[10px] font-medium text-slate-500">Active</span>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 py-3 px-2 overflow-y-auto space-y-1">
          <p className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {role === "Officer" ? "Compliance Evaluation" : "Advisor Workspace"}
          </p>

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
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-semibold text-white bg-primary hover:bg-primary/90 transition-colors cursor-pointer text-left shadow-[3px_3px_7px_hsl(215_20%_78%_/_0.7)]"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  <ChevronRight className="h-3 w-3 opacity-70" />
                </button>
              );
            }

            return (
              <Link
                key={idx}
                href={item.href || "#"}
                onClick={onCloseMobile}
                className={cn(
                  "flex items-center justify-between px-2.5 py-2 rounded text-xs font-semibold transition-colors",
                  item.active
                    ? "bg-slate-100 text-slate-900 font-bold border-l-2 border-primary pl-2"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4 shrink-0 text-slate-500" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold rounded bg-amber-100 text-amber-900 border border-amber-200">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Footer: User session and sign out */}
        <div className="p-3 border-t border-slate-200 bg-background">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-7 w-7 rounded bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                {session?.name ? session.name.charAt(0) : "U"}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {session?.name || "Sarah Jenkins"}
                </p>
                <p className="text-[10px] text-slate-500 truncate">
                  {session?.email || "advisor@springercapital.com"}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 rounded hover:bg-slate-200/70 text-slate-500 hover:text-red-700 transition-colors cursor-pointer shrink-0"
              aria-label="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
