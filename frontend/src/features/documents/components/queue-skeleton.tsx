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
 * DOCU: Renders an institutional skeleton loading state for the Officer Document Review Queue (/queue).
 * Adheres to Springer Capital institutional styling.
 * @returns Skeleton placeholder view for the review queue.
 */
export function QueueSkeleton() {
  return (
    <div className="space-y-4 max-w-[1600px] mx-auto pb-16 animate-fade-in">
      {/* 5 Metric Cards Skeleton Grid (Balanced 5-Column Grid) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-xl p-4 border border-[#E6E8E7] bg-white shadow-2xs space-y-2.5">
            <Skeleton className="h-3 w-28 rounded bg-[#E6E8E7]/70" />
            <div className="flex items-baseline justify-between pt-1">
              <Skeleton className="h-8 w-14 rounded-lg bg-[#E6E8E7]/80" />
              <Skeleton className="h-3 w-20 rounded bg-[#E6E8E7]/50" />
            </div>
            <Skeleton className="h-8 w-full rounded-md bg-[#E6E8E7]/40 mt-2" />
          </div>
        ))}
      </div>

      {/* Queue Toolbar Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-xl bg-white border border-[#E6E8E7] shadow-2xs">
        {/* Status Filter Tabs Skeleton */}
        <div className="flex items-center space-x-1.5 overflow-x-auto">
          <Skeleton className="h-7 w-16 rounded-md bg-[#E6E8E7]/80" />
          <Skeleton className="h-7 w-20 rounded-md bg-[#E6E8E7]/50" />
          <Skeleton className="h-7 w-28 rounded-md bg-[#E6E8E7]/50" />
          <Skeleton className="h-7 w-22 rounded-md bg-[#E6E8E7]/50" />
          <Skeleton className="h-7 w-20 rounded-md bg-[#E6E8E7]/50" />
        </div>

        {/* Search & Date Controls Skeleton */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-28 rounded-md bg-[#E6E8E7]/60 shrink-0" />
          <Skeleton className="h-8 w-44 sm:w-64 rounded-md bg-[#E6E8E7]/50" />
          <Skeleton className="h-8 w-24 rounded-md bg-[#E6E8E7]/50 shrink-0" />
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="overflow-x-auto rounded-xl border border-[#E6E8E7] bg-white shadow-2xs">
        <Table className="w-full border-collapse">
          <TableHeader className="bg-[#FAFBFB] border-b border-[#E6E8E7]">
            <TableRow className="border-b border-[#E6E8E7]">
              <TableHead className="py-3 px-4 text-left font-bold text-[10px] uppercase tracking-wider text-[#183028]/60 w-[30%]">
                DOCUMENT
              </TableHead>
              <TableHead className="py-3 px-3 text-left font-bold text-[10px] uppercase tracking-wider text-[#183028]/60 w-[20%]">
                ADVISOR
              </TableHead>
              <TableHead className="py-3 px-3 text-left font-bold text-[10px] uppercase tracking-wider text-[#183028]/60 w-[18%]">
                CATEGORY
              </TableHead>
              <TableHead className="py-3 px-3 text-left font-bold text-[10px] uppercase tracking-wider text-[#183028]/60 w-[14%]">
                SUBMITTED
              </TableHead>
              <TableHead className="py-3 px-3 text-left font-bold text-[10px] uppercase tracking-wider text-[#183028]/60 w-[12%]">
                STATUS
              </TableHead>
              <TableHead className="py-3 px-4 text-right font-bold text-[10px] uppercase tracking-wider text-[#183028]/60 w-[6%]">
                ACTIONS
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-[#E6E8E7]">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <TableRow key={i} className="border-b border-[#E6E8E7] last:border-0">
                {/* Document */}
                <TableCell className="py-3.5 px-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-lg bg-[#E6E8E7]/70 shrink-0" />
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <Skeleton
                        className="h-3.5 rounded bg-[#E6E8E7]/80"
                        style={{ width: `${50 + (i % 4) * 14}%`, maxWidth: "240px" }}
                      />
                      <Skeleton className="h-2.5 w-20 rounded bg-[#E6E8E7]/50" />
                    </div>
                  </div>
                </TableCell>
                {/* Advisor */}
                <TableCell className="py-3.5 px-3">
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-28 rounded bg-[#E6E8E7]/70" />
                    <Skeleton className="h-2.5 w-36 rounded bg-[#E6E8E7]/40" />
                  </div>
                </TableCell>
                {/* Category */}
                <TableCell className="py-3.5 px-3">
                  <Skeleton className="h-5 w-28 rounded-md bg-[#E6E8E7]/60" />
                </TableCell>
                {/* Submitted */}
                <TableCell className="py-3.5 px-3">
                  <Skeleton className="h-3.5 w-20 rounded bg-[#E6E8E7]/60" />
                </TableCell>
                {/* Status */}
                <TableCell className="py-3.5 px-3">
                  <Skeleton className="h-5 w-20 rounded-full bg-[#E6E8E7]/70" />
                </TableCell>
                {/* Actions */}
                <TableCell className="py-3.5 px-4 text-right">
                  <div className="flex justify-end gap-1">
                    <Skeleton className="h-7 w-7 rounded-lg bg-[#E6E8E7]/60" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Skeleton */}
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-3.5 w-36 rounded bg-[#E6E8E7]/60" />
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-8 w-20 rounded-xl bg-[#E6E8E7]/60" />
          <Skeleton className="h-8 w-20 rounded-xl bg-[#E6E8E7]/60" />
        </div>
      </div>
    </div>
  );
}
