/**
 * DOCU: Provides loading skeleton primitives for deferred content.
 * Last Updated Date: September 3, 2026
 * @returns Reusable loading skeleton primitives.
 * @author Keith
 */
import * as React from "react";
import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-slate-200/70", className)}
      {...props}
    />
  );
}

export { Skeleton };
