"use client";

import { useRouter } from "next/navigation";
import { authStore } from "@/lib/auth/auth-store";
import { AppWorkspaceLoader } from "@/components/shared/app-workspace-loader";

/**
 * DOCU: Displays the institutional 100% loading sequence and popup transition before opening the application.
 * Last Updated Date: September 13, 2026
 * @returns The workspace loader with auto-navigation on 100% completion.
 * @author Keith
 */
export default function HomePage() {
  const router = useRouter();

  const handleComplete = () => {
    const session = authStore.getSession();
    if (!session) {
      router.replace("/login");
    } else if (session.role === "Advisor") {
      router.replace("/submissions");
    } else {
      router.replace("/queue");
    }
  };

  return <AppWorkspaceLoader title="Connecting to Workspace" onComplete={handleComplete} />;
}
