"use client";

/**
 * DOCU: Renders role-aware dashboard navigation.
 * Last Updated Date: September 7, 2026
 * @returns The dashboard sidebar view.
 * @author Keith
 */
import React, { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { authStore, type UserSession } from "@/lib/auth/auth-store";
import { CompanyLogo } from "@/components/ui/brand-logos";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Files,
  History,
  ShieldCheck,
  LogOut,
  CheckSquare,
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
  const pathname    = usePathname();
  const searchParams = useSearchParams();
  const router      = useRouter();
  const session     = useSyncExternalStore<UserSession | null>(
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
      href: "/submissions?tab=dashboard",
      icon: LayoutDashboard,
      active: pathname === "/submissions" && searchParams.get("tab") === "dashboard",
    },
    {
      label: "My Documents",
      href: "/submissions?tab=all",
      icon: Files,
      active:
        pathname === "/submissions" &&
        searchParams.get("tab") !== "dashboard" &&
        searchParams.get("tab") !== "revision",
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
      active:
        pathname === "/queue" &&
        typeof window !== "undefined" &&
        window.location.search.includes("assigned"),
    },
    {
      label: "Audit History",
      href: "/queue?tab=audit",
      icon: History,
      active:
        pathname === "/queue" &&
        typeof window !== "undefined" &&
        window.location.search.includes("audit"),
    },
  ];

  const navItems = role === "Officer" ? officerNavItems : advisorNavItems;

  const isOfficer = role === "Officer";
  const avatarBg  = isOfficer
    ? "bg-gradient-to-br from-slate-700 to-slate-900"
    : "bg-gradient-to-br from-[hsl(239_72%_52%)] to-[hsl(190_80%_55%)]";
  const roleDotColor = isOfficer ? "bg-cyan-400" : "bg-pink-400";

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
          "fixed top-0 bottom-0 left-0 z-40 w-64 bg-background border-r border-slate-200 flex flex-col shadow-[8px_0_24px_hsl(215_20%_72%_/_0.4)] transition-transform duration-200 ease-in-out lg:translate-x-0",
          isOpenMobile ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand Header with gradient strip */}
        <div className="relative overflow-hidden">
          <div className="h-[2px] bg-gradient-to-r from-[hsl(239_72%_52%)] via-[hsl(190_80%_55%)] to-[hsl(326_72%_61%)]" />
          <div className="h-14 px-3 border-b border-slate-200 flex items-center justify-between gap-1 bg-background">
            <Link href="/" className="min-w-0 flex-1 overflow-hidden">
              <CompanyLogo className="origin-left scale-[0.82] whitespace-nowrap" />
            </Link>
            <span className="shrink-0 text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-bold">
              v2.4
            </span>
          </div>
        </div>

        {/* Role Indicator */}
        <div className="p-3 border-b border-slate-200 bg-background">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Active Persona
            </span>
            <span
              className={cn(
                "chip border",
                isOfficer
                  ? "bg-slate-900 text-white border-slate-700"
                  : "bg-emerald-50 text-emerald-900 border-emerald-200"
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full animate-pulse-dot", roleDotColor)} />
              {role}
            </span>
          </div>

          <div className="neu-inset flex items-center justify-between rounded-lg px-3 py-2">
            <div className="flex items-center gap-2">
              <span className={cn("h-2 w-2 rounded-full", roleDotColor)} />
              <span className="text-xs font-bold text-slate-800">{role} workspace</span>
            </div>
            <span className="text-[10px] font-medium text-emerald-600">● Active</span>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 py-3 px-2 overflow-y-auto space-y-0.5">
          <p className="px-2 pb-2 pt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
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
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-semibold text-white bg-primary hover:bg-primary/90 transition-all cursor-pointer text-left shadow-[3px_3px_7px_hsl(215_20%_78%_/_0.7)] hover:-translate-y-px"
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
                  "flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-semibold transition-all",
                  item.active
                    ? "bg-primary/8 text-primary font-bold border-l-2 border-primary pl-2 shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      item.active ? "text-primary" : "text-slate-500"
                    )}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold rounded bg-amber-100 text-amber-900 border border-amber-200">
                    {item.badge}
                  </span>
                )}
                {item.active && (
                  <ChevronRight className="h-3 w-3 text-primary opacity-60" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Footer: User session and sign out */}
        <div className="p-3 border-t border-slate-200 bg-background">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={cn(
                  "h-7 w-7 rounded-lg text-white font-bold text-xs flex items-center justify-center shrink-0",
                  avatarBg
                )}
              >
                {session?.name ? session.name.charAt(0) : "U"}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {session?.name || "User account"}
                </p>
                <p className="text-[10px] text-slate-500 truncate">
                  {session?.email || "Not signed in"}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-all cursor-pointer shrink-0 group"
              aria-label="Sign Out"
            >
              <LogOut className="h-4 w-4 transition-transform group-hover:scale-110" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
