"use client";

import { useState } from "react";
import { signupAction } from "@/lib/actions/auth-actions";
import type { SignupInput } from "@/lib/validation/auth";
import type { UserSession } from "@/lib/auth/auth-store";

export function useSignup() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
