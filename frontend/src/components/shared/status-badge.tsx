import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { DocumentStatusType } from "@/lib/validation/document";
import {
  CheckCircle2,
  Clock3,
  AlertCircle,
  XCircle,
  FileEdit,
  FileCheck2,
} from "lucide-react";

export type ExtendedStatusType =
  | DocumentStatusType
  | "Draft"
  | "Submitted"
  | "Under Review"
  | "In Review";

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-[4px] border px-2 py-0.5 text-[11px] font-semibold tracking-tight select-none transition-colors",
  {
    variants: {
      status: {
        Approved:
          "bg-cyan-50 text-cyan-800 border-cyan-200",
        Pending:
          "bg-[hsl(45_90%_96%)] text-[hsl(35_90%_28%)] border-[hsl(40_60%_84%)]",
        "Under Review":
          "bg-[hsl(45_90%_96%)] text-[hsl(35_90%_28%)] border-[hsl(40_60%_84%)]",
        "In Review":
          "bg-[hsl(45_90%_96%)] text-[hsl(35_90%_28%)] border-[hsl(40_60%_84%)]",
        Submitted:
          "bg-slate-100 text-slate-800 border-slate-300",
        "Needs Revision":
          "bg-pink-50 text-pink-800 border-pink-200",
        Rejected:
          "bg-[hsl(0_50%_97%)] text-[hsl(0_65%_38%)] border-[hsl(0_40%_86%)]",
        Draft:
          "bg-slate-100 text-slate-700 border-slate-200",
      },
    },
    defaultVariants: {
      status: "Pending",
    },
  }
);

const statusIcons: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  Approved: CheckCircle2,
  Pending: Clock3,
  "Under Review": Clock3,
  "In Review": Clock3,
  Submitted: FileCheck2,
  "Needs Revision": AlertCircle,
  Rejected: XCircle,
  Draft: FileEdit,
};

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: ExtendedStatusType | string;
  showIcon?: boolean;
}

export function StatusBadge({
  status,
  className,
  showIcon = true,
  children,
  ...props
}: StatusBadgeProps) {
  const normalizedStatus = (status || "Pending") as keyof typeof statusIcons;
  const IconComponent = statusIcons[normalizedStatus] || Clock3;

  return (
    <span
      className={cn(
        statusBadgeVariants({
          status: (normalizedStatus in statusIcons ? normalizedStatus : "Pending") as "Approved" | "Pending" | "Under Review" | "In Review" | "Submitted" | "Needs Revision" | "Rejected" | "Draft",
        }),
        className
      )}
      {...props}
    >
      {showIcon && <IconComponent className="h-3 w-3 shrink-0" aria-hidden="true" />}
      <span>{children || status}</span>
    </span>
  );
}
