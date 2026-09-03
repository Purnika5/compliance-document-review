"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginAction } from "@/lib/actions/auth-actions";
import type { LoginInput } from "@/lib/validation/auth";

export function useLogin() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

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
