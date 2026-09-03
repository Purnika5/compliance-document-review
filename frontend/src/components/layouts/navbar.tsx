"use client";

import React, { useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { authStore, type UserSession } from "@/lib/auth/auth-store";
import { CompanyLogo } from "@/components/ui/brand-logos";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Settings, LogOut, User } from "lucide-react";
import { NotificationCenter } from "@/components/layout/notification-center";
import { cn } from "@/lib/utils";

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const session = useSyncExternalStore<UserSession | null>(
    authStore.subscribe,
    authStore.getSession,
    authStore.getServerSnapshot
  );

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
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <Link href="/" className="flex items-center">
            <CompanyLogo />
          </Link>

          {session && (
            <nav className="hidden md:flex items-center space-x-1">
              <Link
                href="/submissions"
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-semibold transition-colors",
                  pathname === "/submissions"
                    ? "bg-slate-100 text-slate-900 font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                My Submissions
              </Link>
              <Link
                href="/queue"
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-semibold transition-colors",
                  pathname === "/queue"
                    ? "bg-slate-100 text-slate-900 font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                Review Queue
              </Link>
            </nav>
          )}
        </div>

        <div className="flex items-center space-x-3">
          {session ? (
            <div className="flex items-center space-x-2">
              <NotificationCenter />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer outline-none">
                    <div className="h-7 w-7 rounded-md bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                      {getInitials(session.name)}
                    </div>
                    <div className="text-left hidden sm:block">
                      <p className="text-xs font-bold text-slate-900 leading-tight">{session.name}</p>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {session.role}
                      </span>
                    </div>
                    <ChevronDown className="h-3 w-3 text-slate-500" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-white shadow-md rounded-lg border-slate-200 p-1">
                  <DropdownMenuLabel className="text-xs font-medium text-slate-500 px-2 py-1">
                    {session.email}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-slate-100" />
                  <DropdownMenuItem
                    className="text-xs cursor-pointer gap-2 font-medium text-slate-700 hover:text-slate-900 rounded-md px-2 py-1.5"
                    onClick={() => router.push(session.role === "Advisor" ? "/submissions" : "/queue")}
                  >
                    <User className="h-3.5 w-3.5 text-slate-500" /> Workspace
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-xs cursor-pointer gap-2 font-medium text-slate-700 hover:text-slate-900 rounded-md px-2 py-1.5">
                    <Settings className="h-3.5 w-3.5 text-slate-500" /> Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-slate-100" />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-xs cursor-pointer text-rose-600 focus:text-rose-600 gap-2 font-medium rounded-md px-2 py-1.5 hover:bg-rose-50"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link
                href="/login"
                className="text-xs font-semibold text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-md hover:bg-slate-100 transition-colors"
              >
                Sign In
              </Link>
              <Button
                asChild
                className="font-semibold bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-md text-xs"
              >
                <Link href="/signup">Register</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
