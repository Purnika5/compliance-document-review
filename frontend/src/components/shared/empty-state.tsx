/**
 * DOCU: Renders a reusable empty-state message and optional action.
 * Last Updated Date: September 7, 2026
 * @returns The empty-state view.
 * @author Keith
 */
import * as React from "react";
import { Inbox, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  className,
  children,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center rounded-md border border-dashed border-slate-200 bg-white min-h-[220px]",
        className
      )}
    >
      <div className="h-10 w-10 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 mb-3 shrink-0">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="text-xs font-bold text-slate-900 tracking-tight">{title}</h3>
      <p className="text-[11px] text-slate-500 max-w-sm mt-1 leading-normal">
        {description}
      </p>

      {actionLabel && onAction && (
        <div className="mt-4">
          <Button
            size="sm"
            onClick={onAction}
            className="h-8 px-3 rounded text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white"
          >
            {actionLabel}
          </Button>
        </div>
      )}

      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
