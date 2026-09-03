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
    <header className="sticky top-0 z-30 h-14 bg-blue-50/90 backdrop-blur border-b border-blue-200/80 px-4 sm:px-6 flex items-center justify-between shadow-[0_5px_16px_hsl(228_42%_74%_/_0.3)]">
      {/* Left Area: Mobile Menu Button + Breadcrumbs */}
      <div className="flex items-center space-x-3 min-w-0">
        <button
          onClick={onToggleSidebarMobile}
          className="neu-soft p-1.5 rounded-md text-blue-800 lg:hidden cursor-pointer"
          aria-label="Open sidebar navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0">
          <Breadcrumbs />
        </div>
      </div>

      {/* Right Area: Actions, Notifications & Profile */}
      <div className="flex items-center space-x-2.5 shrink-0">
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/75 border border-blue-200 text-[10px] font-semibold text-blue-900 shadow-sm">
          {role === "Officer" ? (
            <Shield className="h-3 w-3 text-slate-900" />
          ) : (
            <Briefcase className="h-3 w-3 text-cyan-700" />
          )}
          <span>{role} Portal</span>
        </div>

        <NotificationCenter />

        <div className="h-5 w-px bg-blue-200" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg border border-blue-200/80 bg-white/60 px-1.5 py-1 shadow-sm hover:bg-white transition-colors cursor-pointer outline-none">
              <div className="h-7 w-7 rounded-md bg-primary text-white font-bold text-xs flex items-center justify-center shadow-sm">
                {getInitials(session?.name)}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-slate-900 leading-tight">
                  {session?.name || "Sarah Jenkins"}
                </p>
                <span className="text-[10px] text-slate-500 font-medium">
                  {session?.role || "Advisor"}
                </span>
              </div>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 bg-white shadow-lg rounded-md border border-slate-200 p-1">
            <DropdownMenuLabel className="text-xs font-medium text-slate-500 px-2 py-1.5">
              <div className="font-semibold text-slate-900">{session?.name || "Sarah Jenkins"}</div>
              <div className="text-[10px] text-slate-500">{session?.email || "advisor@springercapital.com"}</div>
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
