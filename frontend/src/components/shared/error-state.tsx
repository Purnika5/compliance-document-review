/**
 * DOCU: Renders a reusable error message with an optional retry action adhering to dark mode.
 * Last Updated Date: September 8, 2026
 * @returns The error-state view.
 * @author Keith
 */
import * as React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export function ErrorState({
  title = "Unable to load compliance data",
  message = "A temporary network or server error occurred while retrieving information. You may retry or continue using other areas of the application.",
  onRetry,
  className,
  children,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "p-5 rounded-xl border border-rose-900/50 bg-rose-950/25 text-left flex flex-col sm:flex-row items-start gap-3.5",
        className
      )}
    >
      <div className="h-8 w-8 rounded-lg bg-rose-900/40 text-rose-400 border border-rose-800/60 flex items-center justify-center shrink-0 mt-0.5">
        <AlertCircle className="h-4 w-4" aria-hidden="true" />
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <h4 className="text-xs font-semibold text-rose-200">{title}</h4>
        <p className="text-[11px] text-rose-300/80 leading-relaxed">{message}</p>
        {children && <div className="mt-2">{children}</div>}
      </div>

      {onRetry && (
        <Button
          size="sm"
          variant="outline"
          onClick={onRetry}
          className="h-8 px-3 rounded border-rose-800/60 text-rose-200 hover:bg-rose-900/40 text-xs font-semibold shrink-0 gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Retry</span>
        </Button>
      )}
    </div>
  );
}
