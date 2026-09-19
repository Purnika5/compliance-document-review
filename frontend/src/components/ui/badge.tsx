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
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-colors select-none",
  {
    variants: {
      variant: {
        default: "border-[#E6E8E7] bg-[#183028] text-white",
        secondary: "border-[#E6E8E7] bg-[#FAFBFB] text-[#183028]",
        destructive: "border-rose-200 bg-rose-50 text-rose-950",
        outline: "border-[#E6E8E7] bg-transparent text-[#183028]",
        emerald: "border-[#C5E86C] bg-[#C5E86C]/30 text-[#183028]",
        chartreuse: "border-[#C5E86C] bg-[#C5E86C]/30 text-[#183028]",
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
