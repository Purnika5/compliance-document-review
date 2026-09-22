"use client";

/**
 * DOCU: Error boundary for dashboard routes.
 * Catches unhandled runtime exceptions gracefully with Springer Capital styling.
 * Last Updated Date: September 20, 2026
 * @author Keith
 */
import React, { useEffect } from "react";
import { AlertTriangle, RefreshCw, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to client console for easy debugging
    console.error("Dashboard error caught by boundary:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-[#E6E8E7] p-6 text-center shadow-lg space-y-4 animate-fade-in">
        <div className="h-12 w-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-base font-bold text-[#183028]">View Render Encountered an Issue</h2>
          <p className="text-xs text-[#183028]/70 mt-1">
            {error?.message || "An unexpected error occurred while loading this view."}
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            onClick={() => reset()}
            className="h-8.5 px-4 text-xs font-semibold bg-[#183028] text-white hover:bg-[#23453a] rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Try Again</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              window.location.href = "/dashboard";
            }}
            className="h-8.5 px-4 text-xs font-semibold border border-[#E6E8E7] text-[#183028] hover:bg-[#C5E86C]/20 rounded-xl flex items-center gap-1.5 cursor-pointer"
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span>Back to Dashboard</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
