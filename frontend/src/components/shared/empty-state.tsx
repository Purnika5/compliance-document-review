/**
 * DOCU: Renders a reusable empty-state message and optional action adhering to dark mode.
 * Last Updated Date: September 8, 2026
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
        "flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-border bg-card/40 min-h-[220px]",
        className
      )}
    >
      <div className="h-10 w-10 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground mb-3 shrink-0">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="text-xs font-semibold text-foreground tracking-tight">{title}</h3>
      <p className="text-[11px] text-muted-foreground max-w-sm mt-1 leading-normal">
        {description}
      </p>

      {actionLabel && onAction && (
        <div className="mt-4">
          <Button
            size="sm"
            onClick={onAction}
            className="h-8 px-3 rounded text-xs font-semibold"
          >
            {actionLabel}
          </Button>
        </div>
      )}

      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
