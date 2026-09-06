"use client";

/**
 * DOCU: Renders the authenticated application header.
 * Last Updated Date: September 7, 2026
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
  const router  = useRouter();
  const session = useSyncExternalStore<UserSession | null>(
    authStore.subscribe,
    authStore.getSession,
    authStore.getServerSnapshot
  );

  const role      = session?.role || "Advisor";
  const isOfficer = role === "Officer";

  const handleLogout = () => {
    authStore.clearSession();
    router.push("/login");
  };

  const getInitials = (name?: string) => {
    if (!name) return "SJ";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const avatarBg = isOfficer
    ? "bg-gradient-to-br from-slate-700 to-slate-900"
    : "bg-gradient-to-br from-[hsl(239_72%_52%)] to-[hsl(190_80%_55%)]";

  return (
    <header className="sticky top-0 z-30 flex min-h-14 items-center justify-between border-b border-slate-200/60 bg-background/75 px-3 py-2 backdrop-blur-xl sm:px-5 lg:px-6 shadow-sm">
      {/* Left Area: Mobile Menu Button + Breadcrumbs */}
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-4">
        <button
          onClick={onToggleSidebarMobile}
          className="neu-soft rounded-md p-1.5 text-slate-700 transition-all hover:bg-slate-100 hover:scale-105 lg:hidden"
          aria-label="Open sidebar navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="hidden shrink-0 items-center border-r border-slate-200 pr-4 sm:flex lg:hidden">
          <CompanyLogo className="scale-[0.72] origin-left" />
        </div>

        <div className="min-w-0 flex-1">
          <Breadcrumbs />
        </div>
      </div>

      {/* Right Area: Actions, Notifications & Profile */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {/* Role chip with gradient */}
        <div
          className={cn(
            "hidden items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold shadow-sm md:flex transition-all",
            isOfficer
              ? "bg-slate-900 text-white border-slate-700"
              : "bg-gradient-to-r from-[hsl(239_72%_52%/0.12)] to-[hsl(190_80%_55%/0.12)] text-[hsl(239_72%_44%)] border-[hsl(239_72%_52%/0.3)]"
          )}
        >
          {isOfficer ? (
            <Shield className="h-3 w-3" />
          ) : (
            <Briefcase className="h-3 w-3" />
          )}
          <span>{role} Portal</span>
        </div>

        <NotificationCenter />

        <div className="h-6 w-px bg-slate-200" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-1.5 py-1.5 shadow-sm outline-none transition-all hover:bg-white hover:shadow-md hover:ring-2 hover:ring-primary/20">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white shadow-sm transition-transform hover:scale-105",
                  avatarBg
                )}
              >
                {getInitials(session?.name)}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-slate-900 leading-tight">
                  {session?.name || "User account"}
                </p>
                <span className="text-[10px] text-slate-500 font-medium">
                  {session?.role || "Advisor"}
                </span>
              </div>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 bg-white shadow-xl rounded-xl border border-slate-200 p-1 animate-slide-down">
            <DropdownMenuLabel className="px-2 py-1.5 text-xs font-medium text-slate-500">
              <div className="font-semibold text-slate-900">{session?.name || "User account"}</div>
              <div className="text-[10px] text-slate-500">{session?.email || "Not signed in"}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-100" />
            <DropdownMenuItem
              className="text-xs cursor-pointer gap-2 font-medium text-slate-700 hover:text-slate-900 rounded px-2 py-1.5"
              onClick={() => router.push(role === "Advisor" ? "/submissions" : "/queue")}
            >
              <User className="h-3.5 w-3.5 text-slate-500" /> Workspace Home
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs cursor-pointer gap-2 font-medium text-slate-700 hover:text-slate-900 rounded px-2 py-1.5">
              <Settings className="h-3.5 w-3.5 text-slate-500" /> Account &amp; Preferences
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-100" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-xs cursor-pointer text-rose-600 hover:text-rose-800 gap-2 font-medium rounded px-2 py-1.5 hover:bg-rose-50"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
