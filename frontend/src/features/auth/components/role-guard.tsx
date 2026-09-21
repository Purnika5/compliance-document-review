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
  allowedRole?: RoleType;
  allowedRoles?: RoleType[];
  children: React.ReactNode;
}

/**
 * DOCU: Renders children only when the current user has the allowed role.
 * Last Updated Date: September 21, 2026
 * @param allowedRole - Single role required to render the children.
 * @param allowedRoles - Multiple authorized roles permitted to render the children.
 * @param children - Protected route content.
 * @returns Protected content or an access state.
 * @author Keith
 */
export function RoleGuard({ allowedRole, allowedRoles, children }: RoleGuardProps) {
  const router = useRouter();
  const [isClient, setIsClient] = React.useState(false);

  const session = useSyncExternalStore<UserSession | null>(
    authStore.subscribe,
    authStore.getSession,
    authStore.getServerSnapshot
  );

  const isRoleAllowed = (role: RoleType | undefined): boolean => {
    if (!role) return false;
    if (allowedRoles && allowedRoles.length > 0) {
      return allowedRoles.includes(role);
    }
    return role === allowedRole;
  };

  React.useEffect(() => {
    setIsClient(true);
    if (!session) {
      router.push("/login");
    } else if (!isRoleAllowed(session.role)) {
      if (session.role === "Advisor") {
        router.push("/dashboard");
      } else if (session.role === "Officer") {
        router.push("/queue");
      } else {
        router.push("/login");
      }
    }
  }, [session, allowedRole, allowedRoles, router]);

  // While verifying authorization, performing hydration, or redirecting
  if (!isClient || !session || !isRoleAllowed(session.role)) {
    return (
      <div className="min-h-[400px] w-full flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 text-[#183028] animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
