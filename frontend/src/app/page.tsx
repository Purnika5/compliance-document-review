"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authStore } from "@/lib/auth/auth-store";

/**
 * DOCU: Automatically redirects the user to their appropriate landing route without showing a loading screen.
 * Last Updated Date: September 15, 2026
 * @returns Null (immediate redirect).
 * @author Keith
 */
export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const session = authStore.getSession();
    if (!session) {
      router.replace("/login");
    } else if (session.role === "Advisor") {
      router.replace("/dashboard");
    } else {
      router.replace("/queue");
    }
  }, [router]);

  return null;
}
