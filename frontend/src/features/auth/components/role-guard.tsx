"use client";

/**
 * DOCU: Restricts rendered content to users with the required role.
 * Last Updated Date: September 7, 2026
 * @returns Guarded content or the appropriate access state.
 * @author Keith
 */
import React, { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { authStore, type UserSession } from "@/lib/auth/auth-store";
import type { RoleType } from "@/entities/enums/auth.enum";
import { Loader2 } from "lucide-react";

export interface RoleGuardProps {
  allowedRole: RoleType;
  children: React.ReactNode;
}

/**
 * DOCU: Renders children only when the current user has the allowed role.
 * Last Updated Date: September 7, 2026
 * @param allowedRole - Role required to render the children.
 * @param children - Protected route content.
 * @returns Protected content or an access state.
 * @author Keith
 */
export function RoleGuard({ allowedRole, children }: RoleGuardProps) {
  const router = useRouter();
  const session = useSyncExternalStore<UserSession | null>(
    authStore.subscribe,
    authStore.getSession,
    authStore.getServerSnapshot
  );

  useEffect(() => {
    if (!session) {
      router.push("/login");
    } else if (session.role !== allowedRole) {
      if (session.role === "Advisor") {
        router.push("/dashboard");
      } else if (session.role === "Officer") {
        router.push("/queue");
      } else {
        router.push("/login");
      }
    }
  }, [session, allowedRole, router]);

  // While verifying authorization or redirecting
  if (!session || session.role !== allowedRole) {
    return null;
  }

  return <>{children}</>;
}
