/**
 * DOCU: Provides reusable status and label badge components.
 * Last Updated Date: September 3, 2026
 * @returns Badge primitives for compact labels and statuses.
 * @author Keith
 */
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { StatusBadge, type ExtendedStatusType } from "@/components/shared/status-badge";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-[4px] border px-2 py-0.5 text-[11px] font-semibold transition-colors select-none",
  {
    variants: {
      variant: {
        default: "border-slate-300 bg-slate-900 text-white",
        secondary: "border-slate-200 bg-slate-100 text-slate-800",
        destructive: "border-red-200 bg-red-50 text-red-800",
        outline: "border-blue-200 bg-blue-50 text-blue-800",
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
