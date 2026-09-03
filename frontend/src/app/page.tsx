"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authStore } from "@/lib/auth/auth-store";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const session = authStore.getSession();
    if (!session) {
      router.replace("/login");
    } else if (session.role === "Advisor") {
      router.replace("/submissions");
    } else {
      router.replace("/queue");
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center space-y-2">
        <Loader2 className="animate-spin h-5 w-5 text-primary mx-auto" />
        <p className="text-xs text-slate-500 font-medium">Redirecting to workspace portal...</p>
      </div>
    </div>
  );
}
