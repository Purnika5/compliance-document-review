/**
 * DOCU: Renders a consistent badge for document review statuses adhering to institutional dark mode.
 * Last Updated Date: September 8, 2026
 * @returns The status badge view.
 * @author Keith
 */
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
  | "In Review"
  | "Scanned";

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-tight select-none transition-all animate-fade-in shadow-2xs",
  {
    variants: {
      status: {
        Approved:
          "bg-[#C5E86C]/35 text-[#183028] border-[#C5E86C]",
        Pending:
          "bg-amber-50 text-amber-900 border-amber-200",
        "Under Review":
          "bg-amber-50 text-amber-900 border-amber-200",
        "In Review":
          "bg-amber-50 text-amber-900 border-amber-200",
        Submitted:
          "bg-[#FAFBFB] text-[#183028] border-[#E6E8E7]",
        "Needs Revision":
          "bg-orange-50 text-orange-950 border-orange-200",
        Rejected:
          "bg-rose-50 text-rose-950 border-rose-200",
        Draft:
          "bg-[#FAFBFB] text-[#183028]/70 border-[#E6E8E7]",
        Scanned:
          "bg-[#C5E86C]/35 text-[#183028] border-[#C5E86C]",
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
  Approved:        CheckCircle2,
  Pending:         Clock3,
  "Under Review":  Clock3,
  "In Review":     Clock3,
  Submitted:       FileCheck2,
  "Needs Revision": AlertCircle,
  Rejected:        XCircle,
  Draft:           FileEdit,
  Scanned:         CheckCircle2,
};

/** Statuses that get a pulsing dot indicator */
const PULSING_STATUSES = new Set(["Pending", "Under Review", "In Review", "Needs Revision"]);

/** Dot colors per status in light mode */
const statusDotColor: Record<string, string> = {
  Pending:          "bg-amber-500",
  "Under Review":   "bg-amber-500",
  "In Review":      "bg-amber-500",
  "Needs Revision": "bg-orange-500",
  Approved:         "bg-[#183028]",
  Rejected:         "bg-rose-500",
  Draft:            "bg-[#183028]/40",
  Submitted:        "bg-[#183028]/60",
  Scanned:          "bg-[#183028]",
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
  const normalizedStatus   = (status || "Pending") as keyof typeof statusIcons;
  const IconComponent      = statusIcons[normalizedStatus] || Clock3;
  const isPulsing          = PULSING_STATUSES.has(normalizedStatus);
  const dotColor           = statusDotColor[normalizedStatus] || "bg-zinc-500";

  return (
    <span
      className={cn(
        statusBadgeVariants({
          status: (normalizedStatus in statusIcons ? normalizedStatus : "Pending") as
            | "Approved"
            | "Pending"
            | "Under Review"
            | "In Review"
            | "Submitted"
            | "Needs Revision"
            | "Rejected"
            | "Draft",
        }),
        className
      )}
      {...props}
    >
      {/* Pulsing live dot for active regulatory states */}
      {isPulsing ? (
        <span
          className={cn("h-1.5 w-1.5 rounded-full shrink-0 animate-pulse-dot", dotColor)}
          aria-hidden="true"
        />
      ) : (
        showIcon && <IconComponent className="h-3 w-3 shrink-0" aria-hidden="true" />
      )}
      <span>{children || status}</span>
    </span>
  );
}
