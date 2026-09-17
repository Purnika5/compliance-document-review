/**
 * DOCU: Renders the shared application navigation bar adhering to dark mode.
 * Last Updated Date: September 8, 2026
 * @returns The application navigation view.
 * @author Keith
 */
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
    <header className="bg-card/75 border-b border-border sticky top-0 z-30 backdrop-blur-md">
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
                    ? "bg-[#062a20] text-[#54d0a2] font-bold"
                    : "text-muted-foreground hover:text-[#54d0a2] hover:bg-[#062a20]"
                )}
              >
                My Submissions
              </Link>
              <Link
                href="/queue"
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-semibold transition-colors",
                  pathname === "/queue"
                    ? "bg-[#062a20] text-[#54d0a2] font-bold"
                    : "text-muted-foreground hover:text-[#54d0a2] hover:bg-[#062a20]"
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
                  <button className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-[#062a20] hover:text-[#54d0a2] border border-border/70 transition-colors cursor-pointer outline-none">
                    <div className="h-7 w-7 rounded-md bg-[#24A152] text-white font-bold text-xs flex items-center justify-center shadow-xs">
                      {getInitials(session.name)}
                    </div>
                    <div className="text-left hidden sm:block">
                      <p className="text-xs font-semibold text-foreground leading-tight">{session.name}</p>
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {session.role}
                      </span>
                    </div>
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 bg-card shadow-xl rounded-xl border-border p-1">
                  <DropdownMenuLabel className="text-xs font-medium text-muted-foreground px-2 py-1">
                    <div className="font-semibold text-foreground">{session.name}</div>
                    <div className="text-[10px] text-muted-foreground">{session.email}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem
                    className="group text-xs cursor-pointer gap-2 font-medium text-[#183028] rounded-md px-2 py-1.5 focus:bg-[#C5E86C] focus:text-[#183028] hover:bg-[#C5E86C] hover:text-[#183028] transition-colors"
                    onClick={() => router.push(session.role === "Advisor" ? "/dashboard" : "/queue")}
                  >
                    <User className="h-3.5 w-3.5 text-[#183028]/70 group-hover:text-[#183028] transition-colors" /> Workspace
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="group text-xs cursor-pointer gap-2 font-medium text-[#183028] rounded-md px-2 py-1.5 focus:bg-[#C5E86C] focus:text-[#183028] hover:bg-[#C5E86C] hover:text-[#183028] transition-colors"
                    onClick={() => router.push("/settings")}
                  >
                    <Settings className="h-3.5 w-3.5 text-[#183028]/70 group-hover:text-[#183028] transition-colors" /> Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={handleLogout}
                    className="text-xs cursor-pointer text-rose-600 focus:text-rose-700 focus:bg-rose-50 gap-2 font-medium rounded-md px-2 py-1.5 hover:bg-rose-50 hover:text-rose-700 transition-colors"
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
                className="text-xs font-semibold text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md hover:bg-muted transition-colors"
              >
                Sign In
              </Link>
              <Button
                asChild
                className="font-semibold bg-[#24A152] hover:bg-[#062A20] hover:text-[#54d0a2] hover:border hover:border-emerald-700/60 active:bg-[#1d8342] text-white px-3.5 py-1.5 rounded-md text-xs transition-all shadow-xs cursor-pointer"
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
