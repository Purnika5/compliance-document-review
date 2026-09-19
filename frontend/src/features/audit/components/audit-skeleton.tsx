import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * DOCU: Renders an institutional skeleton loading state for the Regulatory Audit Ledger (/audit).
 * Adheres to Springer Capital institutional styling.
 * @returns Skeleton placeholder view for the audit ledger.
 */
export function AuditSkeleton() {
  return (
    <div className="space-y-4 max-w-[1600px] mx-auto pb-16 animate-fade-in">
      {/* Top Header Action Buttons Skeleton */}
      <div className="flex items-center justify-end gap-2">
        <Skeleton className="h-8 w-28 rounded-xl bg-[#E6E8E7]/60" />
        <Skeleton className="h-8 w-28 rounded-xl bg-[#E6E8E7]/60" />
      </div>

      {/* 4 Metric Cards Skeleton Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-5 rounded-2xl border border-[#E6E8E7] bg-white shadow-2xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-32 rounded bg-[#E6E8E7]/70" />
              <Skeleton className="h-7 w-7 rounded-lg bg-[#E6E8E7]/60" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-8 w-20 rounded-lg bg-[#E6E8E7]/80" />
              <Skeleton className="h-3 w-40 rounded bg-[#E6E8E7]/50" />
            </div>
          </div>
        ))}
      </div>

      {/* Audit Ledger Table Container Skeleton */}
      <div className="border border-[#E6E8E7] bg-white rounded-2xl shadow-2xs overflow-hidden">
        {/* Search & Filter Bar */}
        <div className="p-4 sm:p-5 border-b border-[#E6E8E7] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-44 rounded bg-[#E6E8E7]/80" />
            <Skeleton className="h-3 w-72 rounded bg-[#E6E8E7]/50" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-48 sm:w-64 rounded-xl bg-[#E6E8E7]/60" />
            <Skeleton className="h-8 w-36 rounded-xl bg-[#E6E8E7]/60" />
          </div>
        </div>

        {/* Ledger Table Skeleton */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#FAFBFB] border-b border-[#E6E8E7]">
                <TableHead className="w-40 text-[10px] font-bold uppercase tracking-wider text-[#183028]/70 pl-4">
                  TIMESTAMP &amp; EVENT ID
                </TableHead>
                <TableHead className="w-44 text-[10px] font-bold uppercase tracking-wider text-[#183028]/70">
                  USER &amp; ROLE
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-[#183028]/70">
                  REGULATORY RECORD
                </TableHead>
                <TableHead className="w-28 text-right pr-4 text-[10px] font-bold uppercase tracking-wider text-[#183028]/70">
                  STATE
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <TableRow key={i} className="border-b border-[#E6E8E7] last:border-0">
                  {/* Timestamp & Event ID */}
                  <TableCell className="pl-4 py-3 font-mono">
                    <Skeleton className="h-3.5 w-24 rounded bg-[#E6E8E7]/80" />
                    <Skeleton className="h-2.5 w-32 rounded bg-[#E6E8E7]/50 mt-1" />
                  </TableCell>

                  {/* User & Role */}
                  <TableCell className="py-3">
                    <Skeleton className="h-3.5 w-28 rounded bg-[#E6E8E7]/80" />
                    <Skeleton className="h-4 w-16 rounded-lg bg-[#E6E8E7]/60 mt-1" />
                  </TableCell>

                  {/* Regulatory Record */}
                  <TableCell className="py-3">
                    <Skeleton
                      className="h-3.5 rounded bg-[#E6E8E7]/80"
                      style={{ width: `${55 + (i % 4) * 12}%`, maxWidth: "420px" }}
                    />
                    <div className="flex items-center gap-2 mt-1.5">
                      <Skeleton className="h-2.5 w-20 rounded bg-[#E6E8E7]/60" />
                      <Skeleton className="h-2.5 w-32 rounded bg-[#E6E8E7]/50" />
                      <Skeleton className="h-2.5 w-20 rounded bg-[#E6E8E7]/50" />
                    </div>
                  </TableCell>

                  {/* State */}
                  <TableCell className="text-right pr-4 py-3">
                    <div className="flex justify-end">
                      <Skeleton className="h-5 w-20 rounded-full bg-[#E6E8E7]/70" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
