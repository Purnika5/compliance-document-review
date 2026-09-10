"use client";

/**
 * DOCU: Provides the signup mutation and session update workflow.
 * Last Updated Date: September 7, 2026
 * @returns Signup state and the signup action.
 * @author Keith
 */
import { useState } from "react";
import { signupAction } from "@/lib/actions/auth-actions";
import type { SignupInput } from "@/lib/validation/auth";
import type { UserSession } from "@/lib/auth/auth-store";


/**
 * DOCU: Provides signup execution state for the registration form.
 * Last Updated Date: September 7, 2026
 * @returns Signup state, error state, and execution function.
 * @author Keith
 */
export function useSignup() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * DOCU: Executes signup validation and updates the authenticated session.
   * Last Updated Date: September 7, 2026
   * @param data - Signup form values.
   * @returns The authenticated user session, or null on failure.
   * @author Keith
   */
  const executeSignup = async (data: SignupInput): Promise<UserSession | null> => {
    setIsPending(true);
    setError(null);
    try {
      const session = await signupAction(data);
      setIsPending(false);
      return session;
    } catch (err) {
      setIsPending(false);
      const message = err instanceof Error ? err.message : "Signup failed. Please try again.";
      setError(message);
      return null;
    }
  };

  return {
    mutate: executeSignup,
    isPending,
    error,
    clearError: () => setError(null),
  };
}
