/**
 * DOCU: Renders loading placeholders for shared content states.
 * Last Updated Date: September 3, 2026
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
          <div key={i} className="p-4 rounded-md border border-slate-200 bg-white space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "detail") {
    return (
      <div className="space-y-4 p-4 rounded-md border border-slate-200 bg-white">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-3 w-72" />
        <div className="grid grid-cols-3 gap-4 pt-4">
          <Skeleton className="h-96 col-span-1" />
          <Skeleton className="h-96 col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-slate-200 bg-white overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50 border-b border-slate-200">
            <TableHead className="w-28 pl-4"><Skeleton className="h-3 w-16" /></TableHead>
            <TableHead><Skeleton className="h-3 w-32" /></TableHead>
            <TableHead><Skeleton className="h-3 w-24" /></TableHead>
            <TableHead><Skeleton className="h-3 w-20" /></TableHead>
            <TableHead><Skeleton className="h-3 w-20" /></TableHead>
            <TableHead className="text-right pr-4"><Skeleton className="h-3 w-16 ml-auto" /></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, idx) => (
            <TableRow key={idx} className="border-b border-slate-100">
              <TableCell className="pl-4"><Skeleton className="h-3.5 w-20" /></TableCell>
              <TableCell className="space-y-1">
                <Skeleton className="h-3.5 w-48" />
                <Skeleton className="h-2.5 w-28" />
              </TableCell>
              <TableCell><Skeleton className="h-3.5 w-24" /></TableCell>
              <TableCell><Skeleton className="h-3.5 w-20" /></TableCell>
              <TableCell><Skeleton className="h-5 w-20 rounded" /></TableCell>
              <TableCell className="text-right pr-4"><Skeleton className="h-7 w-16 ml-auto rounded" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
