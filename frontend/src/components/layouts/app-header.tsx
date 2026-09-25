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
  LogOut,
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
    if (!name) return "U";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#E6E8E7] bg-[#FFFFFF]/95 px-4 sm:px-6 lg:px-8 backdrop-blur-md shadow-2xs">
      {/* Left Area: Mobile Menu Button + Breadcrumbs */}
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onToggleSidebarMobile}
          className="rounded-lg border border-[#E6E8E7] bg-[#FFFFFF] p-1.5 text-[#183028] transition-all hover:bg-[#C5E86C]/20 lg:hidden cursor-pointer"
          aria-label="Open sidebar navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0">
          <Breadcrumbs />
        </div>
      </div>


      {/* Right Area: Status / Actions / User Menu */}
      <div className="flex items-center gap-2.5">
        <NotificationCenter />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex cursor-pointer items-center gap-2 rounded-full border border-[#E6E8E7] bg-[#FFFFFF] pl-1.5 pr-2.5 py-1 shadow-2xs outline-none transition-all hover:bg-[#C5E86C]/20">
              <div className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-[#C5E86C] bg-[#183028]">
                {getInitials(session?.name)}
              </div>
              <span className="text-xs font-semibold text-[#183028] hidden sm:inline">
                {role}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-[#183028]/60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 bg-[#FFFFFF] shadow-xl rounded-xl border border-[#E6E8E7] p-1 animate-slide-down">
            <DropdownMenuLabel className="px-3 py-2 text-xs font-medium text-[#183028]/60">
              <div className="font-bold text-[#183028]">{session?.name || "User"}</div>
              <div className="text-[10px] text-[#183028]/60 font-mono">{session?.email || ""}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[#E6E8E7]" />


            <DropdownMenuItem
              variant="destructive"
              onClick={handleLogout}
              className="text-xs cursor-pointer text-rose-600 focus:bg-rose-50 focus:text-rose-700 hover:bg-rose-50 hover:text-rose-700 gap-2 font-medium rounded-lg px-3 py-2 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
