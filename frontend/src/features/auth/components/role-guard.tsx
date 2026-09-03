"use client";

import React, { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { authStore, type UserSession } from "@/lib/auth/auth-store";
import type { Role } from "@/lib/validation/auth";
import { Loader2 } from "lucide-react";

export interface RoleGuardProps {
  allowedRole: Role;
  children: React.ReactNode;
}

export function RoleGuard({ allowedRole, children }: RoleGuardProps) {
  const router = useRouter();
  const session = useSyncExternalStore<UserSession | null>(
    authStore.subscribe,
    authStore.getSession,
    authStore.getServerSnapshot
  );

  useEffect(() => {
    if (session && session.role !== allowedRole) {
      router.replace(session.role === "Advisor" ? "/submissions" : "/queue");
    }
  }, [session, allowedRole, router]);

  // While hydrating/loading
  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-2">
          <Loader2 className="animate-spin h-5 w-5 text-primary mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Verifying platform credentials...</p>
        </div>
      </div>
    );
  }

  // Keep each role on its own landing page.
  if (session.role !== allowedRole) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center space-y-2">
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
          <p className="text-xs font-medium text-slate-500">Opening your role workspace...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
