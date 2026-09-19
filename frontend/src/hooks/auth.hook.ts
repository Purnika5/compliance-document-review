"use client";

/**
 * DOCU: React hooks for authentication, session monitoring, login/signup mutations, and logout.
 * Last Updated Date: September 7, 2026
 * @author Keith
 */
import { useState, useSyncExternalStore, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth.service";
import { authStore } from "@/lib/auth/auth-store";
import { LoginInput, SignupInput } from "@/schema/auth.schema";

/**
 * DOCU: Subscribes to the authStore session and exposes reactive authentication state, role, and user info.
 * Last Updated Date: September 7, 2026
 * @returns Object containing active session, isAuthenticated boolean, role, and normalized user data.
 * @author Keith
 */
export function useAuthSession() {
  const session = useSyncExternalStore(
    authStore.subscribe,
    authStore.getSession,
    authStore.getServerSnapshot
  );

  return {
    session,
    isAuthenticated: Boolean(session?.token),
    role: session?.role || null,
    user: session
      ? {
          name: session.name,
          email: session.email,
          role: session.role,
        }
      : null,
  };
}

/**
 * DOCU: Hook managing user login mutation, loading state, error feedback, and post-login route navigation.
 * Last Updated Date: September 7, 2026
 * @returns Object containing the login handler, loading flag, and error message.
 * @author Keith
 */
export function useLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const login = useCallback(
    async (credentials: LoginInput, redirectPath?: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const session = await authService.login(credentials);
        if (redirectPath) {
          router.push(redirectPath);
        } else if (session.role === "Officer") {
          router.push("/queue");
        } else {
          router.push("/dashboard");
        }
        return session;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Login failed. Please check credentials.";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  return { login, isLoading, error };
}

/**
 * DOCU: Hook managing user registration mutation, loading state, error feedback, and role-based redirect.
 * Last Updated Date: September 7, 2026
 * @returns Object containing the signup handler, loading flag, and error message.
 * @author Keith
 */
export function useSignup() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const signup = useCallback(
    async (payload: SignupInput) => {
      setIsLoading(true);
      setError(null);
      try {
        const session = await authService.signup(payload);
        if (session.role === "Officer") {
          router.push("/queue");
        } else {
          router.push("/dashboard");
        }
        return session;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Registration failed.";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  return { signup, isLoading, error };
}

/**
 * DOCU: Hook managing user logout execution, session clearance, and redirecting to the login page.
 * Last Updated Date: September 7, 2026
 * @returns Object containing the logout trigger function.
 * @author Keith
 */
export function useLogout() {
  const router = useRouter();
  const logout = useCallback(() => {
    authService.logout();
    router.push("/login");
  }, [router]);

  return { logout };
}
