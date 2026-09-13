/**
 * DOCU: Provides reusable status and label badge components adhering to shadcn dark mode.
 * Last Updated Date: September 8, 2026
 * @returns Badge primitives for compact labels and statuses.
 * @author Keith
 */
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { StatusBadge, type ExtendedStatusType } from "@/components/shared/status-badge";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-[4px] border px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold transition-colors select-none",
  {
    variants: {
      variant: {
        default: "border-border bg-secondary text-foreground",
        secondary: "border-border bg-card text-muted-foreground",
        destructive: "border-destructive/40 bg-destructive/15 text-rose-300",
        outline: "border-border bg-transparent text-muted-foreground",
        emerald: "border-emerald-700/50 bg-emerald-950/50 text-emerald-300",
        chartreuse: "border-[#84c22b]/50 bg-[#84c22b]/15 text-[#a3e635]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface IBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  status?: ExtendedStatusType | string;
}

function Badge({ className, variant, status, children, ...props }: IBadgeProps) {
  if (status) {
    return <StatusBadge status={status} className={className} {...props}>{children}</StatusBadge>;
  }

  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
