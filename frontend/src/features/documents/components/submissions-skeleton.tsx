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
 * DOCU: Renders an institutional skeleton loading state for the Submissions Register view (/submissions).
 * @returns Skeleton placeholder view for document submissions.
 */
export function SubmissionsSkeleton() {
  return (
    <div className="space-y-4 max-w-[1600px] mx-auto pb-16 animate-fade-in">
      {/* Submissions Section Container */}
      <div className="space-y-3 bg-[#FFFFFF] p-5 rounded-2xl border border-[#E6E8E7] shadow-2xs">
        {/* Header Title & Action Buttons Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-36 rounded-xl bg-[#E6E8E7]/60 shrink-0" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-36 rounded bg-[#E6E8E7]/80" />
              <Skeleton className="h-3 w-72 max-w-full rounded bg-[#E6E8E7]/50" />
            </div>
          </div>
          <Skeleton className="h-8 w-36 rounded-xl bg-[#E6E8E7]/70 shrink-0" />
        </div>

        {/* Search & Filter Toolbar Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-[#E6E8E7]">
          {/* Status Tabs Skeleton */}
          <div className="flex items-center space-x-1.5 overflow-x-auto">
            <Skeleton className="h-7 w-12 rounded-lg bg-[#E6E8E7]/80" />
            <Skeleton className="h-7 w-16 rounded-lg bg-[#E6E8E7]/50" />
            <Skeleton className="h-7 w-24 rounded-lg bg-[#E6E8E7]/50" />
            <Skeleton className="h-7 w-18 rounded-lg bg-[#E6E8E7]/50" />
            <Skeleton className="h-7 w-16 rounded-lg bg-[#E6E8E7]/50" />
          </div>

          {/* Date Filter & Search Skeleton */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-24 rounded-xl bg-[#E6E8E7]/60" />
            <Skeleton className="h-8 w-48 sm:w-64 rounded-xl bg-[#E6E8E7]/50" />
          </div>
        </div>

        {/* Table Skeleton */}
        <div className="overflow-x-auto rounded-xl border border-[#E6E8E7] bg-[#FFFFFF] shadow-2xs">
          <Table className="w-full bg-[#FFFFFF] border-collapse">
            <TableHeader className="bg-[#FFFFFF] border-b border-[#E6E8E7]">
              <TableRow className="border-b border-[#E6E8E7] bg-[#FFFFFF] hover:bg-[#FFFFFF]">
                <TableHead className="py-3 px-4 text-left font-bold text-[10px] uppercase tracking-wider text-[#183028]/60 w-[38%] min-w-[220px]">
                  DOCUMENT NAME
                </TableHead>
                <TableHead className="py-3 px-3 text-left font-bold text-[10px] uppercase tracking-wider text-[#183028]/60 w-[14%] whitespace-nowrap">
                  DOC ID
                </TableHead>
                <TableHead className="py-3 px-3 text-left font-bold text-[10px] uppercase tracking-wider text-[#183028]/60 w-[16%] whitespace-nowrap">
                  DATE UPLOADED
                </TableHead>
                <TableHead className="py-3 px-3 text-left font-bold text-[10px] uppercase tracking-wider text-[#183028]/60 w-[12%] whitespace-nowrap">
                  FILE SIZE
                </TableHead>
                <TableHead className="py-3 px-3 text-left font-bold text-[10px] uppercase tracking-wider text-[#183028]/60 w-[12%] whitespace-nowrap">
                  STATUS
                </TableHead>
                <TableHead className="py-3 px-4 text-right font-bold text-[10px] uppercase tracking-wider text-[#183028]/60 w-[8%] whitespace-nowrap">
                  ACTION
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-[#FFFFFF] divide-y divide-[#E6E8E7]">
              {[1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i} className="border-b border-[#E6E8E7] last:border-0">
                  {/* Document Name */}
                  <TableCell className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-lg bg-[#E6E8E7]/70 shrink-0" />
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <Skeleton
                          className="h-3.5 rounded bg-[#E6E8E7]/80"
                          style={{ width: `${55 + (i % 4) * 12}%`, maxWidth: "220px" }}
                        />
                        <Skeleton className="h-2.5 w-28 rounded bg-[#E6E8E7]/50" />
                      </div>
                    </div>
                  </TableCell>
                  {/* Doc ID */}
                  <TableCell className="py-3.5 px-3">
                    <Skeleton className="h-3.5 w-16 rounded bg-[#E6E8E7]/70" />
                  </TableCell>
                  {/* Date Uploaded */}
                  <TableCell className="py-3.5 px-3">
                    <Skeleton className="h-3.5 w-20 rounded bg-[#E6E8E7]/60" />
                  </TableCell>
                  {/* File Size */}
                  <TableCell className="py-3.5 px-3">
                    <Skeleton className="h-3.5 w-14 rounded bg-[#E6E8E7]/60" />
                  </TableCell>
                  {/* Status */}
                  <TableCell className="py-3.5 px-3">
                    <Skeleton className="h-5 w-20 rounded-full bg-[#E6E8E7]/70" />
                  </TableCell>
                  {/* Action */}
                  <TableCell className="py-3.5 px-4 text-right">
                    <div className="flex justify-end">
                      <Skeleton className="h-7 w-7 rounded-lg bg-[#E6E8E7]/60" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Skeleton */}
        <div className="flex items-center justify-between pt-2 border-t border-[#E6E8E7]">
          <Skeleton className="h-3.5 w-32 rounded bg-[#E6E8E7]/60" />
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-7 w-16 rounded-lg bg-[#E6E8E7]/60" />
            <Skeleton className="h-7 w-16 rounded-lg bg-[#E6E8E7]/60" />
          </div>
        </div>
      </div>
    </div>
  );
}
