"use client";

/**
 * DOCU: Renders the authenticated application header.
 * Last Updated Date: September 3, 2026
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

  return (
    <header className="sticky top-0 z-30 flex min-h-14 items-center justify-between border-b border-slate-200/80 bg-white/95 px-3 py-2 backdrop-blur sm:px-5 lg:px-6">
      {/* Left Area: Mobile Menu Button + Breadcrumbs */}
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-4">
        <button
          onClick={onToggleSidebarMobile}
          className="neu-soft rounded-md p-1.5 text-slate-700 transition-colors hover:bg-slate-100 lg:hidden"
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
        <div className="hidden items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50/70 px-2.5 py-1.5 text-[10px] font-bold text-emerald-900 shadow-sm md:flex">
          {role === "Officer" ? (
            <Shield className="h-3 w-3 text-slate-900" />
          ) : (
            <Briefcase className="h-3 w-3 text-cyan-700" />
          )}
          <span>{role} Portal</span>
        </div>

        <NotificationCenter />

        <div className="h-6 w-px bg-slate-200" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-1.5 py-1.5 shadow-sm outline-none transition-colors hover:bg-white">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#3f7838] text-xs font-bold text-white shadow-sm">
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
          <DropdownMenuContent align="end" className="w-52 bg-white shadow-lg rounded-md border border-slate-200 p-1">
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
              <Settings className="h-3.5 w-3.5 text-slate-500" /> Account & Preferences
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-100" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-xs cursor-pointer text-red-700 hover:text-red-900 gap-2 font-medium rounded px-2 py-1.5 hover:bg-red-50"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
