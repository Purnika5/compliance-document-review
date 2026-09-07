"use client";

/**
 * DOCU: Provides the login mutation and session update workflow.
 * Last Updated Date: September 3, 2026
 * @returns Login state and the login action.
 * @author Keith
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginAction } from "@/lib/actions/auth-actions";
import type { LoginInput } from "@/lib/validation/auth";

/**
 * DOCU: Provides login execution state for the authentication form.
 * Last Updated Date: September 3, 2026
 * @returns Login state, error state, and execution function.
 * @author Keith
 */
export function useLogin() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  /**
   * DOCU: Executes login validation and updates the authenticated session.
   * Last Updated Date: September 3, 2026
   * @param data - Login form values.
   * @returns The authenticated user session, or null on failure.
   * @author Keith
   */
  const executeLogin = async (data: LoginInput) => {
    setIsPending(true);
    setError(null);
    try {
      const session = await loginAction(data);
      setIsPending(false);

      // Redirect based on role in token / session
      if (session.role === "Advisor") {
        router.push("/submissions");
      } else if (session.role === "Officer") {
        router.push("/queue");
      } else {
        router.push("/login");
      }
      return session;
    } catch (err) {
      setIsPending(false);
      const message = err instanceof Error ? err.message : "Login failed. Invalid email or password.";
      setError(message);
      return null;
    }
  };

  return {
    mutate: executeLogin,
    isPending,
    error,
    clearError: () => setError(null),
  };
}
