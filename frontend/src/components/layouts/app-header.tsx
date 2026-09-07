/**
 * DOCU: Renders the authenticated application header adhering to dark mode.
 * Last Updated Date: September 8, 2026
 * @returns The application header view.
 * @author Keith
 */
import React, { useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { authStore, type UserSession } from "@/lib/auth/auth-store";
import { Breadcrumbs } from "./breadcrumbs";
import { CompanyLogo } from "@/components/ui/brand-logos";
import { NotificationCenter } from "@/components/layout/notification-center";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Menu,
  ChevronDown,
  User,
  Settings,
  LogOut,
  Shield,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface AppHeaderProps {
  onToggleSidebarMobile?: () => void;
}

export function AppHeader({
  onToggleSidebarMobile,
}: AppHeaderProps) {
  const router = useRouter();
  const session = useSyncExternalStore<UserSession | null>(
    authStore.subscribe,
    authStore.getSession,
    authStore.getServerSnapshot
  );

  const role = session?.role || "Advisor";
  const isOfficer = role === "Officer";

  const handleLogout = () => {
    authStore.clearSession();
    router.push("/login");
  };

  const getInitials = (name?: string) => {
    if (!name) return "SC";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-30 flex min-h-14 items-center justify-between border-b border-border bg-card/60 px-3 py-2 backdrop-blur-xl sm:px-5 lg:px-6 shadow-xs">
      {/* Left Area: Mobile Menu Button + Breadcrumbs */}
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-4">
        <button
          onClick={onToggleSidebarMobile}
          className="rounded-lg border border-border bg-card p-1.5 text-muted-foreground transition-all hover:bg-muted hover:text-foreground lg:hidden"
          aria-label="Open sidebar navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="hidden shrink-0 items-center border-r border-border pr-4 sm:flex lg:hidden">
          <CompanyLogo className="scale-[0.72] origin-left" />
        </div>

        <div className="min-w-0 flex-1">
          <Breadcrumbs />
        </div>
      </div>

      {/* Right Area: Status / Actions / User Menu */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Role chip with Springer styling */}
        <div
          className={cn(
            "hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold shadow-xs md:flex transition-all",
            isOfficer
              ? "bg-muted/70 text-cyan-300 border-cyan-800/40"
              : "bg-emerald-950/50 text-emerald-300 border-emerald-800/50"
          )}
        >
          {isOfficer ? (
            <Shield className="h-3 w-3 text-cyan-400" />
          ) : (
            <Briefcase className="h-3 w-3 text-emerald-400" />
          )}
          <span>{role} Portal</span>
        </div>

        <NotificationCenter />

        <div className="h-5 w-px bg-border" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-card/80 px-2 py-1.5 shadow-xs outline-none transition-all hover:bg-muted hover:border-border/80">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-primary-foreground bg-primary shadow-xs">
                {getInitials(session?.name)}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-semibold text-foreground leading-tight">
                  {session?.name || "User account"}
                </p>
                <span className="text-[10px] text-muted-foreground font-medium">
                  {session?.role || "Advisor"}
                </span>
              </div>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 bg-card shadow-2xl rounded-xl border border-border p-1 animate-slide-down">
            <DropdownMenuLabel className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              <div className="font-semibold text-foreground">{session?.name || "User account"}</div>
              <div className="text-[10px] text-muted-foreground">{session?.email || "Not signed in"}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem
              className="group text-xs cursor-pointer gap-2 font-medium text-foreground/90 rounded-md px-2 py-1.5 hover:bg-[#062a20] hover:text-[#54d0a2] transition-colors"
              onClick={() => router.push("/settings")}
            >
              <Settings className="h-3.5 w-3.5 text-muted-foreground group-hover:text-[#54d0a2] transition-colors" /> Account &amp; Preferences
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-xs cursor-pointer text-rose-400 focus:text-rose-400 gap-2 font-medium rounded-md px-2 py-1.5 hover:bg-rose-950/40"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
