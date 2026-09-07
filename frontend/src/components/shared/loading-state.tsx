/**
 * DOCU: Renders loading placeholders for shared content states adhering to dark mode.
 * Last Updated Date: September 8, 2026
 * @returns The loading-state view.
 * @author Keith
 */
import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

export interface LoadingStateProps {
  rows?: number;
  columns?: number;
  className?: string;
  variant?: "table" | "cards" | "detail";
}

export function LoadingState({
  rows = 5,
  variant = "table",
}: LoadingStateProps) {
  if (variant === "cards") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 rounded-xl border border-border bg-card/50 space-y-2">
            <Skeleton className="h-3 w-20 bg-muted" />
            <Skeleton className="h-7 w-16 bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "detail") {
    return (
      <div className="space-y-4 p-4 rounded-xl border border-border bg-card/50">
        <Skeleton className="h-5 w-48 bg-muted" />
        <Skeleton className="h-3 w-72 bg-muted" />
        <div className="grid grid-cols-3 gap-4 pt-4">
          <Skeleton className="h-96 col-span-1 bg-muted" />
          <Skeleton className="h-96 col-span-2 bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card/30 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border bg-muted/40">
            <TableHead className="w-28 pl-4"><Skeleton className="h-3 w-16 bg-muted" /></TableHead>
            <TableHead><Skeleton className="h-3 w-32 bg-muted" /></TableHead>
            <TableHead><Skeleton className="h-3 w-24 bg-muted" /></TableHead>
            <TableHead><Skeleton className="h-3 w-20 bg-muted" /></TableHead>
            <TableHead><Skeleton className="h-3 w-20 bg-muted" /></TableHead>
            <TableHead className="text-right pr-4"><Skeleton className="h-3 w-16 ml-auto bg-muted" /></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, idx) => (
            <TableRow key={idx} className="border-b border-border/50">
              <TableCell className="pl-4"><Skeleton className="h-3.5 w-20 bg-muted" /></TableCell>
              <TableCell className="space-y-1">
                <Skeleton className="h-3.5 w-48 bg-muted" />
                <Skeleton className="h-2.5 w-28 bg-muted/60" />
              </TableCell>
              <TableCell><Skeleton className="h-3.5 w-24 bg-muted" /></TableCell>
              <TableCell><Skeleton className="h-3.5 w-20 bg-muted" /></TableCell>
              <TableCell><Skeleton className="h-5 w-20 rounded bg-muted" /></TableCell>
              <TableCell className="text-right pr-4"><Skeleton className="h-7 w-16 ml-auto rounded bg-muted" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
