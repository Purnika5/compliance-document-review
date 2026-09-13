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
  | "In Review";

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-[5px] border px-2 py-0.5 text-[11px] font-semibold tracking-tight select-none transition-all animate-fade-in",
  {
    variants: {
      status: {
        Approved:
          "bg-emerald-950/60 text-emerald-300 border-emerald-800/60 shadow-[0_0_8px_rgba(34,197,94,0.12)]",
        Pending:
          "bg-amber-950/60 text-amber-300 border-amber-800/60 shadow-[0_0_8px_rgba(245,158,11,0.12)]",
        "Under Review":
          "bg-amber-950/60 text-amber-300 border-amber-800/60",
        "In Review":
          "bg-amber-950/60 text-amber-300 border-amber-800/60",
        Submitted:
          "bg-zinc-800/60 text-zinc-300 border-zinc-700/60",
        "Needs Revision":
          "bg-orange-950/60 text-orange-300 border-orange-800/60 shadow-[0_0_8px_rgba(249,115,22,0.12)]",
        Rejected:
          "bg-rose-950/60 text-rose-300 border-rose-800/60 shadow-[0_0_8px_rgba(244,63,94,0.12)]",
        Draft:
          "bg-zinc-850/60 text-zinc-400 border-zinc-700/60",
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
};

/** Statuses that get a pulsing dot indicator */
const PULSING_STATUSES = new Set(["Pending", "Under Review", "In Review", "Needs Revision"]);

/** Dot colors per status in dark mode */
const statusDotColor: Record<string, string> = {
  Pending:          "bg-amber-400 shadow-[0_0_6px_#f59e0b]",
  "Under Review":   "bg-amber-400 shadow-[0_0_6px_#f59e0b]",
  "In Review":      "bg-amber-400 shadow-[0_0_6px_#f59e0b]",
  "Needs Revision": "bg-orange-400 shadow-[0_0_6px_#f97316]",
  Approved:         "bg-emerald-400 shadow-[0_0_6px_#22c55e]",
  Rejected:         "bg-rose-400 shadow-[0_0_6px_#f43f5e]",
  Draft:            "bg-zinc-500",
  Submitted:        "bg-zinc-400",
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
