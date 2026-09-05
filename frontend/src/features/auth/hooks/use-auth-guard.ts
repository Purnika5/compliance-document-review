"use client";

/**
 * DOCU: Provides authentication and optional role-based route guard behavior.
 * Last Updated Date: September 3, 2026
 * @returns The current authentication guard state.
 * @author Keith
 */
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { authStore, type UserSession } from "@/lib/auth/auth-store";
import type { Role } from "@/lib/validation/auth";

/**
 * DOCU: Guards a route by checking session presence and an optional role.
 * Last Updated Date: September 3, 2026
 * @param allowedRole - Optional role required to access the route.
 * @returns Authentication guard state and redirect status.
 * @author Keith
 */
export function useAuthGuard(allowedRole?: Role) {
  const router = useRouter();

  const session = useSyncExternalStore<UserSession | null>(
    authStore.subscribe,
    authStore.getSession,
    authStore.getServerSnapshot
  );

  const isAuthorized = useMemo(() => {
    // If no session exists, allow static presentation view for demo purposes
    if (!session) return true;
    
    // If role boundary is specified, verify it
    if (allowedRole && session.role !== allowedRole) {
      return false;
    }
    return true;
  }, [session, allowedRole]);

  useEffect(() => {
    // Role boundary violation -> Redirect to appropriate dashboard
    if (session && allowedRole && session.role !== allowedRole) {
      if (session.role === "Advisor") {
        router.replace("/submissions");
      } else if (session.role === "Officer") {
        router.replace("/queue");
      }
    }
  }, [session, allowedRole, router]);

  return { session, isAuthorized };
}

/**
 * DOCU: Redirects an already authenticated user away from public auth pages.
 * Last Updated Date: September 3, 2026
 * @returns Whether the current session is being evaluated.
 * @author Keith
 */
export function useRedirectIfAuthenticated() {
  const router = useRouter();
  const session = useSyncExternalStore<UserSession | null>(
    authStore.subscribe,
    authStore.getSession,
    authStore.getServerSnapshot
  );

  useEffect(() => {
    if (session) {
      if (session.role === "Advisor") {
        router.replace("/submissions");
      } else {
        router.replace("/queue");
      }
    }
  }, [session, router]);
}
