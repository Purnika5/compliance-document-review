/**
 * DOCU: Renders role-aware dashboard navigation adhering to dark mode.
 * Last Updated Date: September 8, 2026
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
  Settings,
} from "lucide-react";

export interface AppSidebarProps {
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

function AppSidebarContent({
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
      active: pathname === "/queue",
    },
    {
      label: "Assigned Reviews",
      href: "/assigned",
      icon: CheckSquare,
      active: pathname === "/assigned",
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

  const isOfficer = role === "Officer";
  const roleDotColor = isOfficer ? "bg-cyan-400 shadow-[0_0_6px_#22d3ee]" : "bg-emerald-400 shadow-[0_0_6px_#34d399]";

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
          "fixed top-0 bottom-0 left-0 z-40 w-64 bg-card/90 border-r border-border flex flex-col shadow-2xl shadow-black/50 transition-transform duration-200 ease-in-out lg:translate-x-0 backdrop-blur-md",
          isOpenMobile ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand Header with Springer Capital gradient strip */}
        <div className="relative overflow-hidden">
          <div className="h-[2px] bg-gradient-to-r from-emerald-600 via-[#84c22b] to-emerald-500" />
          <div className="h-14 px-4 border-b border-border flex items-center justify-between gap-1 bg-card/50">
            <Link href="/" className="min-w-0 flex-1 overflow-hidden">
              <CompanyLogo className="origin-left scale-[0.85] whitespace-nowrap" />
            </Link>
            <span className="shrink-0 text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border font-semibold">
              v2.4
            </span>
          </div>
        </div>

        {/* Role Indicator */}
        <div className="p-3 border-b border-border bg-card/30">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Active Persona
            </span>
            <span
              className={cn(
                "chip border",
                isOfficer
                  ? "bg-secondary text-cyan-300 border-cyan-800/40"
                  : "bg-emerald-950/60 text-emerald-300 border-emerald-800/50"
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", roleDotColor)} />
              {role}
            </span>
          </div>

          <div className="flex items-center justify-between rounded-lg px-3 py-2 bg-secondary/50 border border-border/60">
            <div className="flex items-center gap-2">
              <span className={cn("h-2 w-2 rounded-full", roleDotColor)} />
              <span className="text-xs font-semibold text-foreground">{role} workspace</span>
            </div>
            <span className="text-[10px] font-medium text-emerald-400">● Active</span>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 py-3 px-2 overflow-y-auto space-y-0.5">
          <p className="px-2 pb-2 pt-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
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
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-all cursor-pointer text-left shadow-xs hover:-translate-y-px"
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
                  "flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-medium transition-all",
                  item.active
                    ? "bg-primary/15 text-emerald-400 font-semibold border-l-2 border-emerald-400 pl-2 shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      item.active ? "text-emerald-400" : "text-muted-foreground"
                    )}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold rounded bg-amber-950/60 text-amber-300 border border-amber-800/60">
                    {item.badge}
                  </span>
                )}
                {item.active && (
                  <ChevronRight className="h-3 w-3 text-emerald-400 opacity-80" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Footer: User session and sign out */}
        <div className="p-3 border-t border-border bg-card/60">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-7 w-7 rounded-lg text-primary-foreground font-bold text-xs flex items-center justify-center shrink-0 bg-primary shadow-xs">
                {session?.name ? session.name.charAt(0) : "U"}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">
                  {session?.name || "User account"}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {session?.email || "Not signed in"}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 rounded-md hover:bg-rose-950/40 text-muted-foreground hover:text-rose-400 transition-all cursor-pointer shrink-0 group"
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

export function AppSidebar(props: AppSidebarProps) {
  return (
    <React.Suspense fallback={<aside className="hidden lg:flex w-64 flex-col border-r border-border bg-card fixed inset-y-0 left-0 z-30" />}>
      <AppSidebarContent {...props} />
    </React.Suspense>
  );
}
